"use client"

import { useRef, useEffect } from "react"
import {
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
  subDays,
} from "date-fns"
import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"
import type { CalendarEvent } from "./types"

interface MonthViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onDayClick: (day: Date) => void
  selectedDay: Date | null
  onEventClick: (event: CalendarEvent) => void
}

function dotColor(event: CalendarEvent): string {
  if (event.kind === "birthday") return "bg-purple-500"
  if (event.kind === "anniversary") return "bg-amber-500"
  return ""
}

function isDispatchSent(event: CalendarEvent): boolean {
  return event.kind === "dispatch" && event.dispatchStatus === "sent"
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function MonthView({
  currentDate,
  events,
  onDayClick,
  selectedDay,
  onEventClick,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })
  const gridRef = useRef<HTMLDivElement>(null)

  // Handle keyboard navigation for calendar grid
  const handleKeyDown = (e: React.KeyboardEvent, day: Date, index: number) => {
    let targetIndex = index
    let handled = false

    switch (e.key) {
      case "ArrowLeft":
        targetIndex = index - 1
        handled = true
        break
      case "ArrowRight":
        targetIndex = index + 1
        handled = true
        break
      case "ArrowUp":
        targetIndex = index - 7
        handled = true
        break
      case "ArrowDown":
        targetIndex = index + 7
        handled = true
        break
      case "Home":
        targetIndex = Math.floor(index / 7) * 7
        handled = true
        break
      case "End":
        targetIndex = Math.floor(index / 7) * 7 + 6
        handled = true
        break
    }

    if (handled) {
      e.preventDefault()
      // Find the target button and focus it
      const buttons = gridRef.current?.querySelectorAll('button[data-day-button]')
      if (buttons && targetIndex >= 0 && targetIndex < buttons.length) {
        (buttons[targetIndex] as HTMLButtonElement).focus()
      }
    }
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-border">
      {/* Weekday header row */}
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div ref={gridRef} className="grid grid-cols-7 gap-px bg-border" role="grid" aria-label="Calendar month view">
        {days.map((day, index) => {
          const inMonth = isSameMonth(day, currentDate)
          const today = isToday(day)
          const dayEvents = events.filter((e) => isSameDay(e.date, day))
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
          const maxDots = 3
          const visibleEvents = dayEvents.slice(0, maxDots)
          const overflow = dayEvents.length - maxDots

          const dateLabel = format(day, "EEEE, MMMM d, yyyy")
          const eventsLabel = dayEvents.length > 0 ? `, ${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''}` : ''

          return (
            <button
              key={day.toISOString()}
              type="button"
              data-day-button
              onClick={() => onDayClick(day)}
              onKeyDown={(e) => handleKeyDown(e, day, index)}
              aria-label={`${dateLabel}${eventsLabel}`}
              aria-current={today ? "date" : undefined}
              aria-selected={isSelected}
              className={cn(
                "group relative flex min-h-[88px] flex-col items-start bg-card p-2 text-left transition-colors hover:bg-muted/40 active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:z-10 sm:min-h-[100px] sm:p-3",
                !inMonth && "bg-muted/20",
                isSelected && "ring-2 ring-inset ring-primary/40"
              )}
            >
              {/* Day number */}
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-sm font-medium sm:size-8 sm:text-base",
                  !inMonth && "text-muted-foreground/40",
                  inMonth && "text-foreground",
                  today &&
                    "bg-primary text-primary-foreground font-semibold"
                )}
              >
                {format(day, "d")}
              </span>

              {/* Event dots / chips */}
              <div className="mt-1 flex w-full flex-col gap-0.5">
                {visibleEvents.map((event) => (
                  <div
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${event.title}, ${event.kind}${event.time ? ', ' + event.time : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(event)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        e.stopPropagation()
                        onEventClick(event)
                      }
                    }}
                    className={cn(
                      "hidden truncate rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight sm:block",
                      event.kind === "birthday" &&
                        "bg-purple-500 text-white dark:bg-purple-600",
                      event.kind === "anniversary" &&
                        "bg-amber-500 text-white dark:bg-amber-600",
                      event.kind === "dispatch" &&
                        "border border-dashed",
                      event.isOnBreak && event.status !== "cancelled" &&
                        "border border-dashed",
                      event.status === "cancelled" && "opacity-60 line-through"
                    )}
                    style={
                      event.isOnBreak && event.status !== "cancelled"
                        ? { borderColor: event.color, color: event.color, backgroundColor: event.color + "15", opacity: 0.75 }
                        : event.kind === "dispatch"
                        ? { borderColor: event.color, color: event.color, backgroundColor: event.color + "12" }
                        : event.status === "cancelled"
                        ? { backgroundColor: "#9CA3AF30", color: "#6B7280" }
                        : event.kind === "event"
                        ? { backgroundColor: event.color, color: "#fff" }
                        : undefined
                    }
                  >
                    {event.kind === "dispatch" && isDispatchSent(event) ? "✓ " : ""}
                    {event.title}
                  </div>
                ))}

                {/* Mobile: just show dots */}
                <div className="flex items-center gap-1 sm:hidden">
                  {visibleEvents.map((event) => (
                    <span
                      key={event.id}
                      className={cn(
                        "size-2 rounded-full",
                        dotColor(event),
                        event.kind === "dispatch" && "ring-1 ring-current"
                      )}
                      style={
                        event.kind === "event" || event.kind === "dispatch"
                          ? { backgroundColor: event.kind === "dispatch" ? "transparent" : event.color, color: event.color }
                          : undefined
                      }
                    />
                  ))}
                </div>

                {overflow > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{overflow} more
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Day detail panel shown when a day is clicked in month view */
export function DayDetailPanel({
  day,
  events,
  onEventClick,
  onClose,
  onCreateEvent,
}: {
  day: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onClose: () => void
  onCreateEvent?: (day: Date) => void
}) {
  const dayEvents = events.filter((e) => isSameDay(e.date, day))

  return (
    <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-border">
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2.5">
        <h3 className="text-sm font-semibold">
          {format(day, "EEEE, MMMM d")}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close day detail panel"
          className="text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2 py-1"
        >
          Close
        </button>
      </div>
      <div className="bg-card p-3">
        {dayEvents.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No events on this day.
          </p>
        ) : (
          <div className="space-y-1.5">
            {dayEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onEventClick(event)}
                aria-label={`${event.title}, ${event.kind}${event.time ? ', ' + event.time : ''}`}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-3 min-h-[48px] text-left text-sm transition-colors hover:bg-muted/60 active:scale-[0.98]",
                  event.kind === "birthday" &&
                    "bg-purple-50 dark:bg-purple-950/20",
                  event.kind === "anniversary" &&
                    "bg-amber-50 dark:bg-amber-950/20",
                  event.kind === "dispatch" &&
                    "border border-dashed",
                  event.isOnBreak && event.status !== "cancelled" &&
                    "border border-dashed opacity-75"
                )}
                style={
                  event.isOnBreak && event.status !== "cancelled"
                    ? { borderColor: event.color, backgroundColor: `${event.color}08` }
                    : event.kind === "dispatch"
                    ? { borderColor: event.color, backgroundColor: `${event.color}08` }
                    : event.kind === "event"
                    ? { backgroundColor: `${event.color}08` }
                    : undefined
                }
              >
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    event.kind === "birthday" && "bg-purple-500",
                    event.kind === "anniversary" && "bg-amber-500"
                  )}
                  style={
                    event.kind === "event" || event.kind === "dispatch"
                      ? { backgroundColor: event.color }
                      : undefined
                  }
                />
                <span className="flex-1 truncate font-medium">
                  {event.title}
                </span>
                {event.isOnBreak && event.status !== "cancelled" && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
                    Break
                  </span>
                )}
                {event.kind === "dispatch" && event.dispatchStatus && (
                  <span className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                    event.dispatchStatus === "sent" ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                  )}>
                    {event.dispatchStatus === "sent" ? "Sent" : event.dispatchStatus}
                  </span>
                )}
                {event.kind !== "dispatch" && !event.isOnBreak && event.time && (
                  <span className="text-xs text-muted-foreground">
                    {event.time}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {onCreateEvent && (
          <button
            type="button"
            onClick={() => onCreateEvent(day)}
            aria-label={`Create new event on ${format(day, "MMMM d, yyyy")}`}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-3 min-h-[48px] text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Plus className="size-4" />
            New Event
          </button>
        )}
      </div>
    </div>
  )
}
