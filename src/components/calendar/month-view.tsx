"use client"

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
} from "date-fns"
import { cn } from "@/lib/utils"
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
      <div className="grid grid-cols-7 gap-px bg-border">
        {days.map((day) => {
          const inMonth = isSameMonth(day, currentDate)
          const today = isToday(day)
          const dayEvents = events.filter((e) => isSameDay(e.date, day))
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
          const maxDots = 3
          const visibleEvents = dayEvents.slice(0, maxDots)
          const overflow = dayEvents.length - maxDots

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDayClick(day)}
              className={cn(
                "group relative flex min-h-[72px] flex-col items-start bg-card p-1.5 text-left transition-colors hover:bg-muted/40 sm:min-h-[88px] sm:p-2",
                !inMonth && "bg-muted/20",
                isSelected && "ring-2 ring-inset ring-primary/40"
              )}
            >
              {/* Day number */}
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium sm:size-7 sm:text-sm",
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
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(event)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
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
                        "border border-dashed"
                    )}
                    style={
                      event.kind === "dispatch"
                        ? { borderColor: event.color, color: event.color, backgroundColor: event.color + "12" }
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
                <div className="flex items-center gap-0.5 sm:hidden">
                  {visibleEvents.map((event) => (
                    <span
                      key={event.id}
                      className={cn(
                        "size-1.5 rounded-full",
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
}: {
  day: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onClose: () => void
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
          className="text-xs text-muted-foreground hover:text-foreground"
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
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60",
                  event.kind === "birthday" &&
                    "bg-purple-50 dark:bg-purple-950/20",
                  event.kind === "anniversary" &&
                    "bg-amber-50 dark:bg-amber-950/20",
                  event.kind === "dispatch" &&
                    "border border-dashed"
                )}
                style={
                  event.kind === "dispatch"
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
                {event.kind === "dispatch" && event.dispatchStatus && (
                  <span className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                    event.dispatchStatus === "sent" ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                  )}>
                    {event.dispatchStatus === "sent" ? "Sent" : event.dispatchStatus}
                  </span>
                )}
                {event.kind !== "dispatch" && event.time && (
                  <span className="text-xs text-muted-foreground">
                    {event.time}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
