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
  ChevronDown,
  RefreshCw,
  Download,
  Image,
  Mail,
  Share2,
  Save,
  Trash2,
  Loader2,
  Undo2,
  Link2,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  downloadAsPdf,
  downloadAsImage,
  shareCard,
  buildShareText,
} from "@/lib/card-export"
import { sanitizeHtml } from "@/lib/sanitize-html"

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

export interface ResourceLink {
  label: string
  url: string
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
  resourceLinks?: ResourceLink[]
  onSchedule: () => void
  onSendNow: () => void
  onTestSend?: () => void
  onSave?: () => void
  onDelete?: () => void
  onCancel?: () => void
  onRefresh?: () => void
  saving?: boolean
  hasInstance?: boolean
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
  autoFilledFrom?: string | null
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function statusConfig(status: CommunicationStatus) {
  switch (status) {
    case "draft":
      return { label: "Draft", variant: "secondary" as const, icon: Pencil }
    case "scheduled":
      return { label: "Queued", variant: "default" as const, icon: Clock }
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
  onTestSend,
  onSave,
  onDelete,
  onCancel,
  onRefresh,
  saving = false,
  hasInstance = false,
  children,
  mailingLists,
  smtpConfigs,
  selectedMailingList,
  onMailingListChange,
  selectedSmtpConfig,
  onSmtpConfigChange,
  sendCount = 0,
  resourceLinks,
  additionalRecipients,
  onAdditionalRecipientsChange,
  autoFilledFrom,
}: WeeklyCommunicationCardProps) {
  const [editing, setEditing] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const sc = statusConfig(status)
  const StatusIcon = sc.icon

  const canDispatch =
    !!selectedSmtpConfig && (!!selectedMailingList || !!(additionalRecipients?.trim()))
  const dispatchTitle = !selectedSmtpConfig
    ? "Select a Send From account first"
    : !selectedMailingList && !additionalRecipients?.trim()
    ? "Select a mailing list or add recipient emails first"
    : undefined

  const selectedMlName = mailingLists?.find((ml) => ml.id === selectedMailingList)?.name
  const selectedSmtpLabel = smtpConfigs?.find((s) => s.id === selectedSmtpConfig)?.name

  function getShareText() {
    return buildShareText(title, subject, resourceLinks)
  }

  function handleDownloadImage() {
    if (!previewHtml) return
    downloadAsImage(previewHtml, title).catch(() => {
      toast.error("Failed to generate image. Try the PDF download instead.")
    })
  }

  function handleShare() {
    if (!previewHtml) return
    shareCard(previewHtml, title, getShareText()).catch(() => {
      toast.error("Share failed")
    })
  }

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
            {autoFilledFrom && (
              <Badge variant="outline" className="shrink-0 text-[10px] gap-0.5 text-primary border-primary/30">
                <Link2 className="size-2.5" />
                {autoFilledFrom}
              </Badge>
            )}
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

        {/* ── Row 1: Send Configuration ── */}
        <div className="flex flex-wrap items-center gap-2 px-4 pl-5 pt-3">
          {mailingLists && mailingLists.length > 0 && onMailingListChange && (
            <Select
              value={selectedMailingList || ""}
              onValueChange={(val) => onMailingListChange(val ?? "")}
            >
              <SelectTrigger className="h-8 w-auto min-w-32 max-w-48 gap-1 text-xs px-2.5">
                <SelectValue placeholder="Mailing list...">
                  {selectedMlName || "Mailing list..."}
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
              <SelectTrigger className="h-8 w-auto min-w-32 max-w-48 gap-1 text-xs px-2.5">
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
          {onAdditionalRecipientsChange && editing && (
            <input
              type="text"
              value={additionalRecipients || ""}
              onChange={(e) => onAdditionalRecipientsChange(e.target.value)}
              placeholder="Extra emails: a@b.com, c@d.com"
              className="h-8 min-w-40 flex-1 rounded-md border border-input bg-transparent px-2.5 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>

        {/* ── Row 2: Primary Actions ── */}
        <div className="flex flex-wrap items-center gap-2 px-4 pb-2 pl-5 pt-2">
          <Button
            variant={editing ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (editing && onCancel) onCancel()
              setEditing((prev) => !prev)
            }}
            style={editing ? { backgroundColor: accentColor } : undefined}
            className={editing ? "text-white hover:opacity-90" : ""}
          >
            {editing ? (
              <ChevronUp className="size-3.5" data-icon="inline-start" />
            ) : (
              <Pencil className="size-3.5" data-icon="inline-start" />
            )}
            {editing ? "Close Editor" : "Edit"}
          </Button>
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewing(true)}
              disabled={!previewHtml}
            >
              <Eye className="size-3.5" data-icon="inline-start" />
              Preview
            </Button>
          )}

          <div className="flex-1" />

          {status === "draft" && (
            <>
              <Button
                size="sm"
                onClick={onSendNow}
                style={canDispatch ? { backgroundColor: accentColor } : undefined}
                className="text-white hover:opacity-90"
                disabled={!canDispatch}
                title={dispatchTitle}
              >
                <Send className="size-3.5" data-icon="inline-start" />
                Send
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSchedule}
                disabled={!canDispatch}
                title={dispatchTitle}
              >
                <Clock className="size-3.5" data-icon="inline-start" />
                Schedule
              </Button>
              {onTestSend && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onTestSend}
                  disabled={!selectedSmtpConfig}
                  title={!selectedSmtpConfig ? "Select a Send From account first" : "Send test email to yourself"}
                  className="text-xs text-muted-foreground"
                >
                  <Mail className="size-3.5" data-icon="inline-start" />
                  Send Test
                </Button>
              )}
            </>
          )}
          {(status === "sent" || status === "scheduled") && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSendNow}
              disabled={!canDispatch}
              title={dispatchTitle}
            >
              <RefreshCw className="size-3.5" data-icon="inline-start" />
              Send Reminder
            </Button>
          )}
          {status === "failed" && (
            <Button
              size="sm"
              onClick={onSendNow}
              variant="destructive"
              disabled={!canDispatch}
              title={dispatchTitle}
            >
              <Send className="size-3.5" data-icon="inline-start" />
              Retry
            </Button>
          )}
        </div>

        {/* ── Row 3: Collapsible Share & Export ── */}
        <div className="px-4 pl-5 pb-3">
          <button
            type="button"
            onClick={() => setShareOpen(!shareOpen)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {shareOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            Share & Export
          </button>
          {shareOpen && (
            <div className="flex flex-wrap gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => previewHtml && downloadAsPdf(previewHtml, title)}
                disabled={!previewHtml}
              >
                <Download className="size-3.5" data-icon="inline-start" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadImage}
                disabled={!previewHtml}
              >
                <Image className="size-3.5" data-icon="inline-start" />
                Image
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                disabled={!previewHtml}
              >
                <Share2 className="size-3.5" data-icon="inline-start" />
                Share
              </Button>
            </div>
          )}
        </div>

        {/* Expandable edit form */}
        {editing && children && (
          <>
            {/* Draft action bar */}
            <div className="border-t border-b bg-muted/30 px-4 py-2.5 pl-5 flex flex-wrap items-center gap-2">
              {onSave && (
                <Button
                  size="sm"
                  onClick={() => { onSave(); setEditing(false) }}
                  disabled={saving}
                  style={{ backgroundColor: accentColor }}
                  className="text-white hover:opacity-90"
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />
                  ) : (
                    <Save className="size-3.5" data-icon="inline-start" />
                  )}
                  Save Draft
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewing(true)}
                disabled={!previewHtml}
              >
                <Eye className="size-3.5" data-icon="inline-start" />
                Preview
              </Button>
              {onCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { onCancel(); setEditing(false) }}
                >
                  <Undo2 className="size-3.5" data-icon="inline-start" />
                  Cancel
                </Button>
              )}
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  title="Refresh fields from template defaults"
                >
                  <RefreshCw className="size-3.5" data-icon="inline-start" />
                  From Template
                </Button>
              )}
              <div className="flex-1" />
              {onDelete && hasInstance && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" data-icon="inline-start" />
                  Delete Draft
                </Button>
              )}
            </div>
            <div className="px-4 py-4 pl-5">
              {children}
            </div>
          </>
        )}
      </Card>

      {/* Preview dialog */}
      <Dialog open={previewing} onOpenChange={setPreviewing}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg lg:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview: {title}</DialogTitle>
          </DialogHeader>
          <div
            className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-900"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml ?? "") }}
          />
          <DialogFooter showCloseButton>
            {status === "draft" && (
              <Button
                size="sm"
                onClick={() => {
                  setPreviewing(false)
                  onSendNow()
                }}
                style={canDispatch ? { backgroundColor: accentColor } : undefined}
                className="text-white hover:opacity-90"
                disabled={!canDispatch}
                title={dispatchTitle}
              >
                <Send className="size-3.5" data-icon="inline-start" />
                Send
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
