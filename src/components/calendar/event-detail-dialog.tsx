"use client"

import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  CalendarDays,
  Clock,
  MapPin,
  StickyNote,
  Video,
  Cake,
  Heart,
  Users,
} from "lucide-react"
import type { CalendarEvent } from "./types"

interface EventDetailDialogProps {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusColors: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
}

export function EventDetailDialog({
  event,
  open,
  onOpenChange,
}: EventDetailDialogProps) {
  if (!event) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {event.kind === "birthday" && (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40">
                <Cake className="size-4 text-purple-600 dark:text-purple-400" />
              </div>
            )}
            {event.kind === "anniversary" && (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Heart className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
            )}
            {event.kind === "event" && (
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${event.color}20` }}
              >
                <CalendarDays
                  className="size-4"
                  style={{ color: event.color }}
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle>{event.title}</DialogTitle>
            </div>
          </div>
          {event.kind === "event" && event.eventTypeName && (
            <div className="mt-1">
              <Badge variant="secondary">{event.eventTypeName}</Badge>
              {event.status && (
                <span
                  className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[event.status] ?? ""}`}
                >
                  {event.status === "confirmed" ? "Scheduled" : event.status === "draft" ? "Tentative" : event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-3">
          {/* Date */}
          <div className="flex items-start gap-3 text-sm">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{format(event.date, "EEEE, MMMM d, yyyy")}</span>
          </div>

          {/* Time */}
          {event.time && (
            <div className="flex items-start gap-3 text-sm">
              <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>{event.time}</span>
            </div>
          )}

          {/* Host family */}
          {event.hostFamily && (
            <div className="flex items-start gap-3 text-sm">
              <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <span className="font-medium">
                  Host: {event.hostFamily.name}
                </span>
                {event.hostFamily.address && (
                  <p className="mt-0.5 text-muted-foreground">
                    {event.hostFamily.address}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Location override */}
          {event.location && (
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>{event.location}</span>
            </div>
          )}

          {/* Zoom link */}
          {event.zoomLink && (
            <div className="flex items-start gap-3 text-sm">
              <Video className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <a
                href={event.zoomLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Join via Zoom
              </a>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              {event.description}
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="flex items-start gap-3 text-sm">
              <StickyNote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">{event.notes}</span>
            </div>
          )}

          {/* Birthday-specific info */}
          {event.kind === "birthday" && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950/30">
              <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
                Birthday Celebration
              </p>
              <p className="mt-0.5 text-sm text-purple-700 dark:text-purple-300">
                {event.title} - {format(event.date, "MMMM d")}
              </p>
            </div>
          )}

          {/* Anniversary-specific info */}
          {event.kind === "anniversary" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                Wedding Anniversary
              </p>
              <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300">
                {event.title} - {format(event.date, "MMMM d")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
