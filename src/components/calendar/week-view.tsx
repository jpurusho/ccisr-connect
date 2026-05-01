"use client"

import { format, isSameDay, isToday } from "date-fns"
import { cn } from "@/lib/utils"
import { Cake, Heart, CalendarDays, Send, Check, Clock, Plus } from "lucide-react"
import type { CalendarEvent } from "./types"

interface WeekViewProps {
  days: Date[]
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onDayClick?: (day: Date) => void
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

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/pill flex w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-left text-xs transition-all hover:opacity-80",
        isBirthday && "bg-purple-500 text-white",
        isAnniversary && "bg-amber-500 text-white",
        isDispatch && "border border-dashed"
      )}
      style={
        isDispatch
          ? { borderColor: event.color, color: event.color, backgroundColor: event.color + "12" }
          : !isBirthday && !isAnniversary
          ? { backgroundColor: event.color, color: "#fff" }
          : undefined
      }
    >
      {isBirthday && <Cake className="size-3 shrink-0" />}
      {isAnniversary && <Heart className="size-3 shrink-0" />}
      {event.kind === "event" && <CalendarDays className="size-3 shrink-0" />}
      {isDispatch && (isSent
        ? <Check className="size-3 shrink-0" />
        : <Send className="size-3 shrink-0" />
      )}
      <span className="truncate font-medium">{event.title}</span>
      {isDispatch && isSent && (
        <span className="ml-auto shrink-0 text-[10px] opacity-70">Sent</span>
      )}
      {isDispatch && !isSent && event.dispatchStatus && (
        <span className="ml-auto shrink-0 text-[10px] opacity-70">{event.dispatchStatus}</span>
      )}
      {!isDispatch && event.time && (
        <span className="ml-auto shrink-0 text-[10px] opacity-70">
          {event.time}
        </span>
      )}
    </button>
  )
}

export function WeekView({ days, events, onEventClick, onDayClick }: WeekViewProps) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-border sm:grid-cols-7">
      {days.map((day) => {
        const dayEvents = events.filter((e) => isSameDay(e.date, day))
        const today = isToday(day)

        return (
          <div
            key={day.toISOString()}
            className={cn(
              "group/day flex min-h-[140px] flex-col bg-card p-2 sm:min-h-[180px]",
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
                  className="ml-auto flex size-5 items-center justify-center rounded-full text-muted-foreground/40 opacity-0 transition-opacity hover:bg-primary/10 hover:text-primary group-hover/day:opacity-100"
                  title="Create event"
                >
                  <Plus className="size-3" />
                </button>
              )}
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
