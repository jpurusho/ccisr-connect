"use client"

import { type ReactNode, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Pencil,
  Eye,
  Clock,
  Send,
  Check,
  AlertCircle,
  ChevronUp,
  RefreshCw,
  Download,
  Image,
  type LucideIcon,
} from "lucide-react"
import { format } from "date-fns"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CommunicationStatus = "draft" | "scheduled" | "sent" | "failed"

export interface MailingListOption {
  id: string
  name: string
}

export interface SmtpConfigOption {
  id: string
  name: string
  from_email: string
}

export interface WeeklyCommunicationCardProps {
  title: string
  accentColor: string
  icon: LucideIcon
  status: CommunicationStatus
  summaryLines: string[]
  subject?: string
  onSubjectChange?: (value: string) => void
  scheduledAt?: Date | null
  previewHtml?: string | null
  onSchedule: () => void
  onSendNow: () => void
  children?: ReactNode
  mailingLists?: MailingListOption[]
  smtpConfigs?: SmtpConfigOption[]
  selectedMailingList?: string
  onMailingListChange?: (id: string) => void
  selectedSmtpConfig?: string
  onSmtpConfigChange?: (id: string) => void
  sendCount?: number
  additionalRecipients?: string
  onAdditionalRecipientsChange?: (value: string) => void
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function statusConfig(status: CommunicationStatus) {
  switch (status) {
    case "draft":
      return { label: "Draft", variant: "secondary" as const, icon: Pencil }
    case "scheduled":
      return { label: "Scheduled", variant: "default" as const, icon: Clock }
    case "sent":
      return { label: "Sent", variant: "default" as const, icon: Check }
    case "failed":
      return { label: "Failed", variant: "destructive" as const, icon: AlertCircle }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WeeklyCommunicationCard({
  title,
  accentColor,
  icon: Icon,
  status,
  summaryLines,
  subject,
  onSubjectChange,
  scheduledAt,
  previewHtml,
  onSchedule,
  onSendNow,
  children,
  mailingLists,
  smtpConfigs,
  selectedMailingList,
  onMailingListChange,
  selectedSmtpConfig,
  onSmtpConfigChange,
  sendCount = 0,
  additionalRecipients,
  onAdditionalRecipientsChange,
}: WeeklyCommunicationCardProps) {
  const [editing, setEditing] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  const sc = statusConfig(status)
  const StatusIcon = sc.icon

  function downloadAsPdf() {
    if (!previewHtml) return
    const iframe = document.createElement("iframe")
    iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:600px;height:800px;"
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument
    if (!doc) { document.body.removeChild(iframe); return }
    doc.open()
    doc.write(`<!DOCTYPE html><html><head><title>${title}</title>
      <style>body{font-family:'Inter',-apple-system,sans-serif;margin:20px;display:flex;justify-content:center;}@media print{body{margin:0;}}</style>
    </head><body>${previewHtml}</body></html>`)
    doc.close()
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }, 300)
  }

  async function downloadAsImage() {
    if (!previewHtml) return
    const container = document.createElement("div")
    container.style.cssText = "position:absolute;left:-9999px;top:0;width:480px;background:#fff;padding:16px;"
    container.innerHTML = previewHtml
    document.body.appendChild(container)
    try {
      const { default: html2canvas } = await import("html2canvas")
      const canvas = await html2canvas(container, { scale: 2, useCORS: true })
      const link = document.createElement("a")
      link.download = `${title.replace(/\s+/g, "-").toLowerCase()}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    } catch {
      const blob = new Blob([`<html><body>${previewHtml}</body></html>`], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.download = `${title.replace(/\s+/g, "-").toLowerCase()}.html`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      document.body.removeChild(container)
    }
  }

  const selectedMlName = mailingLists?.find((ml) => ml.id === selectedMailingList)?.name
  const selectedSmtpLabel = smtpConfigs?.find((s) => s.id === selectedSmtpConfig)?.name

  return (
    <>
      <Card className="relative overflow-hidden">
        {/* Left accent bar */}
        <div
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: accentColor }}
        />

        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 px-4 pt-4 pl-5">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: accentColor + "15",
              color: accentColor,
            }}
          >
            <Icon className="size-4" />
          </div>
          <h3 className="flex-1 text-sm font-semibold leading-tight">
            {title}
          </h3>
          <div className="flex items-center gap-1.5">
            <Badge variant={sc.variant} className="shrink-0">
              <StatusIcon className="size-3" />
              {sc.label}
            </Badge>
            {sendCount > 1 && (
              <Badge variant="outline" className="shrink-0 text-xs">
                x{sendCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Subject line */}
        {subject !== undefined && (
          <div className="px-4 pl-5 pt-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">Subject</p>
            {editing && onSubjectChange ? (
              <input
                type="text"
                className="w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
              />
            ) : (
              <p className="text-sm font-medium truncate">{subject}</p>
            )}
          </div>
        )}

        {/* Content summary */}
        <CardContent className="pl-5 pt-2 pb-0">
          <div className="space-y-0.5">
            {summaryLines.map((line, i) => (
              <p key={i} className="text-sm leading-snug text-muted-foreground">
                {line}
              </p>
            ))}
          </div>

          {scheduledAt && status === "scheduled" && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="size-3" />
              Scheduled for {format(scheduledAt, "EEE, MMM d 'at' h:mm a")}
            </p>
          )}
        </CardContent>

        {/* Action bar: buttons + dropdowns inline */}
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3 pl-5 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing((prev) => !prev)}
          >
            {editing ? (
              <ChevronUp className="size-3.5" data-icon="inline-start" />
            ) : (
              <Pencil className="size-3.5" data-icon="inline-start" />
            )}
            {editing ? "Close" : "Edit"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewing(true)}
            disabled={!previewHtml}
          >
            <Eye className="size-3.5" data-icon="inline-start" />
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadAsPdf}
            disabled={!previewHtml}
            title="Download as PDF"
          >
            <Download className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadAsImage}
            disabled={!previewHtml}
            title="Download as Image (for WhatsApp)"
          >
            <Image className="size-3.5" />
          </Button>

          {/* Inline dropdowns */}
          {mailingLists && mailingLists.length > 0 && onMailingListChange && (
            <Select
              value={selectedMailingList || ""}
              onValueChange={(val) => onMailingListChange(val ?? "")}
            >
              <SelectTrigger className="h-7 w-auto min-w-28 max-w-40 gap-1 text-xs px-2">
                <SelectValue placeholder="List...">
                  {selectedMlName || "List..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {mailingLists.map((ml) => (
                  <SelectItem key={ml.id} value={ml.id}>
                    {ml.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {smtpConfigs && smtpConfigs.length > 0 && onSmtpConfigChange && (
            <Select
              value={selectedSmtpConfig || ""}
              onValueChange={(val) => onSmtpConfigChange(val ?? "")}
            >
              <SelectTrigger className="h-7 w-auto min-w-28 max-w-40 gap-1 text-xs px-2">
                <SelectValue placeholder="Send from...">
                  {selectedSmtpLabel || "Send from..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {smtpConfigs.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Additional recipients */}
          {onAdditionalRecipientsChange && (
            <input
              type="text"
              value={additionalRecipients || ""}
              onChange={(e) => onAdditionalRecipientsChange(e.target.value)}
              placeholder="Add emails: a@b.com, c@d.com"
              className="h-7 min-w-40 flex-1 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {/* Action buttons */}
          {status === "draft" && (
            <>
              <Button
                size="sm"
                onClick={onSendNow}
                style={{ backgroundColor: accentColor }}
                className="text-white hover:opacity-90"
              >
                <Send className="size-3.5" data-icon="inline-start" />
                Send Now
              </Button>
              <Button variant="outline" size="sm" onClick={onSchedule}>
                <Clock className="size-3.5" data-icon="inline-start" />
                Queue
              </Button>
            </>
          )}
          {(status === "sent" || status === "scheduled") && (
            <Button size="sm" variant="outline" onClick={onSendNow}>
              <RefreshCw className="size-3.5" data-icon="inline-start" />
              Send Reminder
            </Button>
          )}
          {status === "failed" && (
            <Button size="sm" onClick={onSendNow} variant="destructive">
              <Send className="size-3.5" data-icon="inline-start" />
              Retry
            </Button>
          )}
        </div>

        {/* Expandable edit form */}
        {editing && children && (
          <div className="border-t px-4 py-4 pl-5">
            {children}
          </div>
        )}
      </Card>

      {/* Preview dialog */}
      <Dialog open={previewing} onOpenChange={setPreviewing}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview: {title}</DialogTitle>
          </DialogHeader>
          <div
            className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-900"
            dangerouslySetInnerHTML={{ __html: previewHtml ?? "" }}
          />
          <DialogFooter showCloseButton>
            {status === "draft" && (
              <Button
                size="sm"
                onClick={() => {
                  setPreviewing(false)
                  onSendNow()
                }}
                style={{ backgroundColor: accentColor }}
                className="text-white hover:opacity-90"
              >
                <Send className="size-3.5" data-icon="inline-start" />
                Send Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
