import { Skeleton } from "@/components/ui/skeleton"

export default function TemplatesLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>

      {/* Grid of template cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center"
          >
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-1.5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
