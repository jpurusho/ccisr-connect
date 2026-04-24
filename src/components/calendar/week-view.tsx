"use client"

import { format, isSameDay, isToday } from "date-fns"
import { cn } from "@/lib/utils"
import { Cake, Heart, CalendarDays } from "lucide-react"
import type { CalendarEvent } from "./types"

interface WeekViewProps {
  days: Date[]
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
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

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/pill flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-all hover:opacity-80",
        isBirthday &&
          "bg-purple-50 text-purple-800 ring-1 ring-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-800",
        isAnniversary &&
          "bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800"
      )}
      style={
        !isBirthday && !isAnniversary
          ? {
              backgroundColor: `${event.color}12`,
              color: event.color,
              boxShadow: `inset 0 0 0 1px ${event.color}30`,
            }
          : undefined
      }
    >
      {isBirthday && (
        <Cake className="size-3 shrink-0 text-purple-500 dark:text-purple-400" />
      )}
      {isAnniversary && (
        <Heart className="size-3 shrink-0 text-amber-500 dark:text-amber-400" />
      )}
      {event.kind === "event" && (
        <CalendarDays className="size-3 shrink-0" style={{ color: event.color }} />
      )}
      <span className="truncate font-medium">{event.title}</span>
      {event.time && (
        <span className="ml-auto shrink-0 text-[10px] opacity-70">
          {event.time}
        </span>
      )}
    </button>
  )
}

export function WeekView({ days, events, onEventClick }: WeekViewProps) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-border sm:grid-cols-7">
      {days.map((day) => {
        const dayEvents = events.filter((e) => isSameDay(e.date, day))
        const today = isToday(day)

        return (
          <div
            key={day.toISOString()}
            className={cn(
              "flex min-h-[140px] flex-col bg-card p-2 sm:min-h-[180px]",
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
            </div>

            {/* Events */}
            <div className="flex flex-1 flex-col gap-1">
              {dayEvents.length === 0 && (
                <p className="mt-2 text-center text-xs text-muted-foreground/50">
                  No events
                </p>
              )}
              {dayEvents.map((event) => (
                <EventPill
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
