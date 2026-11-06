"use client"

import { format, isSameDay, isToday } from "date-fns"
import { cn } from "@/lib/utils"
import { Cake, Heart, CalendarDays, Send, Check, Clock, Plus, Pencil, Ban, Copy } from "lucide-react"
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu"
import type { CalendarEvent } from "./types"

interface WeekViewProps {
  days: Date[]
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onDayClick?: (day: Date) => void
  onEditEvent?: (event: CalendarEvent) => void
  onCancelInstance?: (event: CalendarEvent) => void
}

function EventPill({
  event,
  onClick,
}: {
  event: CalendarEvent
  onClick: () => void
}) {
  const isBirthday = event.kind === "birthday"
  const isAnniversary = event.kind === "anniversary"
  const isDispatch = event.kind === "dispatch"
  const isSent = isDispatch && event.dispatchStatus === "sent"

  const isCancelled = event.kind === "event" && event.status === "cancelled"
  const isOnBreak = event.kind === "event" && event.isOnBreak && !isCancelled

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${event.title}, ${event.kind}${event.time ? ', ' + event.time : ''}${isCancelled ? ', cancelled' : ''}${isOnBreak ? ', on break' : ''}`}
      className={cn(
        "group/pill flex w-full items-center gap-1.5 rounded-full px-3 py-2 min-h-[44px] text-left text-xs transition-all hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]",
        isBirthday && "bg-purple-500 text-white",
        isAnniversary && "bg-amber-500 text-white",
        isDispatch && "border border-dashed",
        isOnBreak && "border border-dashed",
        isCancelled && "opacity-60"
      )}
      style={
        isOnBreak
          ? { borderColor: event.color, color: event.color, backgroundColor: event.color + "15", opacity: 0.75 }
          : isDispatch
          ? { borderColor: event.color, color: event.color, backgroundColor: event.color + "12" }
          : isCancelled
          ? { backgroundColor: "#9CA3AF30", color: "#6B7280" }
          : !isBirthday && !isAnniversary
          ? { backgroundColor: event.color, color: "#fff" }
          : undefined
      }
    >
      {isBirthday && <Cake className="size-3 shrink-0" />}
      {isAnniversary && <Heart className="size-3 shrink-0" />}
      {event.kind === "event" && !isOnBreak && <CalendarDays className="size-3 shrink-0" />}
      {isOnBreak && <Clock className="size-3 shrink-0" />}
      {isDispatch && (isSent
        ? <Check className="size-3 shrink-0" />
        : <Send className="size-3 shrink-0" />
      )}
      <span className={cn("truncate font-medium", isCancelled && "line-through")}>{event.title}</span>
      {isOnBreak && (
        <span className="ml-auto shrink-0 text-[10px] font-medium opacity-80">Break</span>
      )}
      {isDispatch && isSent && (
        <span className="ml-auto shrink-0 text-[10px] opacity-70">Sent</span>
      )}
      {isDispatch && !isSent && event.dispatchStatus && (
        <span className="ml-auto shrink-0 text-[10px] opacity-70">{event.dispatchStatus}</span>
      )}
      {!isDispatch && !isOnBreak && event.time && (
        <span className="ml-auto shrink-0 text-[10px] opacity-70">
          {event.time}
        </span>
      )}
    </button>
  )
}

export function WeekView({ days, events, onEventClick, onDayClick, onEditEvent, onCancelInstance }: WeekViewProps) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-border sm:grid-cols-7" role="grid" aria-label="Calendar week view">
      {days.map((day) => {
        const dayEvents = events.filter((e) => isSameDay(e.date, day))
        const today = isToday(day)

        return (
          <div
            key={day.toISOString()}
            className={cn(
              "group/day flex min-h-[180px] flex-col bg-card p-2 sm:min-h-[200px]",
              today && "bg-primary/[0.03]"
            )}
          >
            {/* Day header */}
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                  today
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                )}
              >
                {format(day, "d")}
              </span>
              {onDayClick && (
                <button
                  type="button"
                  onClick={() => onDayClick(day)}
                  className="ml-auto flex size-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted-foreground/40 opacity-0 transition-opacity hover:bg-primary/10 hover:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group-hover/day:opacity-100 sm:opacity-100 active:scale-95"
                  title="Create event"
                  aria-label={`Create event on ${format(day, "EEEE, MMMM d")}`}
                >
                  <Plus className="size-4" />
                </button>
              )}
            </div>

            {/* Events */}
            <div className="flex flex-1 flex-col gap-2">
              {dayEvents.length === 0 && (
                <p className="mt-2 text-center text-xs text-muted-foreground/50">
                  No events
                </p>
              )}
              {dayEvents.map((event) => (
                <ContextMenu key={event.id}>
                  <ContextMenuTrigger>
                    <EventPill
                      event={event}
                      onClick={() => onEventClick(event)}
                    />
                  </ContextMenuTrigger>
                  {event.kind === "event" && (
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => onEventClick(event)}>
                        <CalendarDays className="size-3.5" /> View Details
                      </ContextMenuItem>
                      {onEditEvent && event.eventId && (
                        <ContextMenuItem onClick={() => onEditEvent(event)}>
                          <Pencil className="size-3.5" /> Edit Series
                        </ContextMenuItem>
                      )}
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => navigator.clipboard.writeText(event.title)}>
                        <Copy className="size-3.5" /> Copy Title
                      </ContextMenuItem>
                      {onCancelInstance && event.status !== "cancelled" && (
                        <ContextMenuItem variant="destructive" onClick={() => onCancelInstance(event)}>
                          <Ban className="size-3.5" /> Cancel This Week
                        </ContextMenuItem>
                      )}
                    </ContextMenuContent>
                  )}
                </ContextMenu>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
