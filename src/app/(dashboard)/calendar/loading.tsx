import { Skeleton } from "@/components/ui/skeleton"

export default function CalendarLoading() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Toolbar: nav + view toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16" />
          <div className="flex items-center gap-1">
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
          </div>
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Skeleton className="size-2.5 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Calendar skeleton */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-border sm:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex min-h-[180px] flex-col bg-card p-2">
            <div className="mb-3 flex items-center gap-1.5">
              <Skeleton className="h-3 w-6" />
              <Skeleton className="size-7 rounded-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-full rounded-md" />
              <Skeleton className="h-7 w-3/4 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
