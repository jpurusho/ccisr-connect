import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const { smtpConfigId } = await req.json()
  if (!smtpConfigId) {
    return NextResponse.json({ error: "smtpConfigId required" }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: smtp, error } = await supabase
    .from("smtp_configs")
    .select("*")
    .eq("id", smtpConfigId)
    .single()

  if (error || !smtp) {
    return NextResponse.json({ error: "SMTP config not found" }, { status: 404 })
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.username,
        pass: smtp.encrypted_password,
      },
    })

    await transporter.sendMail({
      from: smtp.from_name
        ? `"${smtp.from_name}" <${smtp.from_email}>`
        : smtp.from_email,
      to: smtp.from_email,
      subject: "CCISR Connect – SMTP Test",
      html: "<p>This is a test email from CCISR Connect. Your SMTP configuration is working correctly.</p>",
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown SMTP error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
