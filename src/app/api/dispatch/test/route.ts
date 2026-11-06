import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"
import { verifyAdmin } from "@/lib/auth-checks"
import type { SmtpConfig, DispatchTestRequest } from "@/types/api"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  // Verify admin authorization
  const auth = await verifyAdmin(req)
  if (!auth.authorized) {
    return auth.error
  }

  const { subject, html, smtpConfigId, toEmail } = await req.json()
  if (!subject || !html || !smtpConfigId || !toEmail) {
    return NextResponse.json({ error: "subject, html, smtpConfigId, toEmail required" }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: smtp, error: smtpErr } = await supabase
    .from("smtp_configs")
    .select("*")
    .eq("id", smtpConfigId)
    .single()

  if (smtpErr || !smtp) {
    return NextResponse.json({ error: "SMTP config not found" }, { status: 404 })
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.username, pass: smtp.encrypted_password },
    })

    await transporter.sendMail({
      from: smtp.from_name ? `"${smtp.from_name}" <${smtp.from_email}>` : smtp.from_email,
      to: toEmail,
      subject: `[TEST] ${subject}`,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
