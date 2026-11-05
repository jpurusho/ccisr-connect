"use client"

import { memo } from "react"
import { sanitizeHtml } from "@/lib/sanitize-html"

export const LivePreviewPane = memo(function LivePreviewPane({ html }: { html: string | null }) {
  if (!html) {
    return (
      <div
        className="flex h-full min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
        aria-label="Email preview placeholder"
      >
        Preview will appear here
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border bg-white p-4 dark:bg-slate-900"
      role="region"
      aria-label="Email preview"
    >
      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
    </div>
  )
})
