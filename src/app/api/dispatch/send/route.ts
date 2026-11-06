import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import nodemailer, { type SendMailOptions } from "nodemailer"
import { rateLimitByIp } from "@/lib/rate-limit"
import { ApiError, successResponse } from "@/lib/api-response"
import { dispatchSendSchema, validateRequest } from "@/lib/validation-schemas"
import { requireCsrfToken } from "@/lib/csrf"
import { verifyAdmin } from "@/lib/auth-checks"
import type { EmailRecipients, SmtpConfig, RecipientType } from "@/types/api"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  // CSRF protection
  const csrfError = await requireCsrfToken(req)
  if (csrfError) {
    return csrfError
  }

  // Verify admin authorization
  const auth = await verifyAdmin(req)
  if (!auth.authorized) {
    return auth.error
  }

  // Rate limiting: 5 requests per 5 minutes per IP
  const rateLimit = rateLimitByIp(req, {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000,
    namespace: "dispatch-send",
  })

  if (!rateLimit.allowed) {
    return ApiError.tooManyRequests()
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return ApiError.badRequest("Invalid JSON")
  }

  // Validate request body
  const validation = validateRequest(dispatchSendSchema, body)
  if (!validation.success) {
    return ApiError.badRequest(validation.error)
  }

  const { dispatchId } = validation.data

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Fetch the dispatch record
  const { data: dispatch, error: fetchErr } = await supabase
    .from("dispatch_queue")
    .select("*")
    .eq("id", dispatchId)
    .single()

  if (fetchErr || !dispatch) {
    return ApiError.notFound(fetchErr?.message || "Dispatch not found")
  }

  if (dispatch.status === "sent") {
    return ApiError.badRequest("Already sent")
  }

  if (dispatch.status === "cancelled") {
    return ApiError.badRequest("Dispatch is cancelled")
  }

  // Fetch SMTP config
  if (!dispatch.smtp_config_id) {
    await supabase
      .from("dispatch_queue")
      .update({ status: "failed", error_message: "No SMTP account configured" } as never)
      .eq("id", dispatchId)
    return ApiError.badRequest("No SMTP account configured")
  }

  const { data: smtp, error: smtpErr } = await supabase
    .from("smtp_configs")
    .select("*")
    .eq("id", dispatch.smtp_config_id)
    .single()

  if (smtpErr || !smtp) {
    await supabase
      .from("dispatch_queue")
      .update({ status: "failed", error_message: "SMTP config not found" } as never)
      .eq("id", dispatchId)
    return ApiError.notFound("SMTP config not found")
  }

  // Fetch recipients from mailing list
  const recipients: EmailRecipients = {
    to: [],
    cc: [],
    bcc: [],
  }

  if (dispatch.mailing_list_id) {
    const { data: members } = await supabase
      .from("mailing_list_members")
      .select("external_email, recipient_type, members(email)")
      .eq("mailing_list_id", dispatch.mailing_list_id)

    if (members) {
      for (const m of members as unknown as Array<{
        external_email: string | null
        recipient_type: "to" | "cc" | "bcc"
        members: { email: string | null } | null
      }>) {
        const email = m.external_email || m.members?.email
        if (email) {
          recipients[m.recipient_type].push(email)
        }
      }
    }

    // Also check google_group_email on the mailing list
    const { data: mlData } = await supabase
      .from("mailing_lists")
      .select("google_group_email")
      .eq("id", dispatch.mailing_list_id)
      .single()

    if (mlData?.google_group_email) {
      const groupEmails = mlData.google_group_email
        .split(",")
        .map((e: string) => e.trim())
        .filter(Boolean)
      recipients.to.push(...groupEmails)
    }
  }

  // Add extra comma-separated recipients stored on the dispatch record
  if (dispatch.additional_recipients && typeof dispatch.additional_recipients === "string") {
    const extras = dispatch.additional_recipients.split(",").map((e: string) => e.trim()).filter(Boolean)
    recipients.to.push(...extras)
  }

  const allRecipients = [...recipients.to, ...recipients.cc, ...recipients.bcc]
  if (allRecipients.length === 0) {
    await supabase
      .from("dispatch_queue")
      .update({ status: "failed", error_message: "No recipients found" } as never)
      .eq("id", dispatchId)
    return ApiError.badRequest("No recipients found")
  }

  // Mark as sending
  await supabase
    .from("dispatch_queue")
    .update({ status: "sending" } as never)
    .eq("id", dispatchId)

  // Create SMTP transport
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

    const mailOptions: SendMailOptions = {
      from: smtp.from_name
        ? `"${smtp.from_name}" <${smtp.from_email}>`
        : smtp.from_email,
      subject: dispatch.subject,
      html: dispatch.body_html,
    }

    if (recipients.to.length > 0) mailOptions.to = recipients.to.join(", ")
    if (recipients.cc.length > 0) mailOptions.cc = recipients.cc.join(", ")
    if (recipients.bcc.length > 0) mailOptions.bcc = recipients.bcc.join(", ")

    await transporter.sendMail(mailOptions)

    // Mark as sent
    await supabase
      .from("dispatch_queue")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        error_message: null,
      } as never)
      .eq("id", dispatchId)

    // Save to dispatch_history
    await supabase.from("dispatch_history").insert({
      dispatch_id: dispatchId,
      full_snapshot: {
        subject: dispatch.subject,
        body_html: dispatch.body_html,
        recipients: allRecipients,
        smtp_account: smtp.name,
        from: smtp.from_email,
        template_type: dispatch.template_type ?? null,
        week_start: dispatch.week_start ?? null,
        mailing_list_id: dispatch.mailing_list_id ?? null,
        additional_recipients: dispatch.additional_recipients ?? null,
      },
      sent_at: new Date().toISOString(),
    } as never)

    // Audit log
    await supabase.from("audit_log").insert({
      action: "email_sent",
      entity_type: "dispatch_queue",
      entity_id: dispatchId,
      changes: {
        subject: dispatch.subject,
        recipientCount: allRecipients.length,
        smtpAccount: smtp.name,
      },
    } as never)

    return successResponse({
      success: true,
      recipientCount: allRecipients.length,
    })
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown SMTP error"

    await supabase
      .from("dispatch_queue")
      .update({
        status: "failed",
        error_message: errorMessage,
      } as never)
      .eq("id", dispatchId)

    return ApiError.internalError(errorMessage)
  }
}
