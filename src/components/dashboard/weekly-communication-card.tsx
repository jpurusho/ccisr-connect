"use client"

import { type ReactNode, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  type LucideIcon,
} from "lucide-react"
import { format } from "date-fns"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CommunicationStatus = "draft" | "scheduled" | "sent" | "failed"

export interface WeeklyCommunicationCardProps {
  title: string
  accentColor: string
  icon: LucideIcon
  status: CommunicationStatus
  summaryLines: string[]
  scheduledAt?: Date | null
  previewHtml?: string | null
  onSchedule: () => void
  onSendNow: () => void
  children?: ReactNode // inline edit form
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function statusConfig(status: CommunicationStatus) {
  switch (status) {
    case "draft":
      return {
        label: "Draft",
        variant: "secondary" as const,
        icon: Pencil,
      }
    case "scheduled":
      return {
        label: "Scheduled",
        variant: "default" as const,
        icon: Clock,
      }
    case "sent":
      return {
        label: "Sent",
        variant: "default" as const,
        icon: Check,
      }
    case "failed":
      return {
        label: "Failed",
        variant: "destructive" as const,
        icon: AlertCircle,
      }
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
  scheduledAt,
  previewHtml,
  onSchedule,
  onSendNow,
  children,
}: WeeklyCommunicationCardProps) {
  const [editing, setEditing] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  const sc = statusConfig(status)
  const StatusIcon = sc.icon

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
          <Badge variant={sc.variant} className="shrink-0">
            <StatusIcon className="size-3" />
            {sc.label}
          </Badge>
        </div>

        {/* Content summary */}
        <CardContent className="pl-5 pt-2 pb-0">
          <div className="space-y-0.5">
            {summaryLines.map((line, i) => (
              <p
                key={i}
                className="text-sm leading-snug text-muted-foreground"
              >
                {line}
              </p>
            ))}
          </div>

          {/* Scheduled time */}
          {scheduledAt && status === "scheduled" && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="size-3" />
              Scheduled for {format(scheduledAt, "EEE, MMM d 'at' h:mm a")}
            </p>
          )}
        </CardContent>

        {/* Action buttons */}
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
          {status === "draft" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onSchedule}
              >
                <Clock className="size-3.5" data-icon="inline-start" />
                Schedule
              </Button>
              <Button
                size="sm"
                onClick={onSendNow}
                style={{ backgroundColor: accentColor }}
                className="text-white hover:opacity-90"
              >
                <Send className="size-3.5" data-icon="inline-start" />
                Send Now
              </Button>
            </>
          )}
          {status === "failed" && (
            <Button
              size="sm"
              onClick={onSendNow}
              variant="destructive"
            >
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
