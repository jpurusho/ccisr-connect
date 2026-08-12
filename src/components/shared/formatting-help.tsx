"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Copy } from "lucide-react"
import { toast } from "sonner"

export function FormattingHelp() {
  const [expanded, setExpanded] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard!")
  }

  const examples = [
    { label: "Bold", code: "<b>text</b>", alt: "<strong>text</strong>" },
    { label: "Italic", code: "<i>text</i>", alt: "<em>text</em>" },
    { label: "Underline", code: "<u>text</u>" },
    { label: "Line break", code: "line 1<br/>line 2" },
    { label: "Colored text", code: '<span style="color: #7C3AED;">text</span>' },
    { label: "Highlighted text", code: '<span style="background-color: #FFFBD6; padding: 2px 6px; border-radius: 3px;">text</span>' },
    { label: "Combination", code: '<strong style="color: #DB2777;">URGENT</strong>' },
  ]

  return (
    <div className="rounded-lg border-2 border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/50 mt-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
      >
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        HTML Formatting Help
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-blue-200 dark:border-blue-800 pt-3">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Use these HTML tags to format your text:
          </p>
          {examples.map((ex, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ex.label}:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(ex.code)}
                  className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100 hover:underline"
                  title="Copy to clipboard"
                >
                  <Copy className="size-3.5" />
                  Copy
                </button>
              </div>
              <code className="block text-xs bg-white dark:bg-gray-950 p-2.5 rounded border border-gray-300 dark:border-gray-700 font-mono break-all text-gray-900 dark:text-gray-100">
                {ex.code}
              </code>
              {ex.alt && (
                <code className="block text-xs bg-gray-50 dark:bg-gray-900 p-2.5 rounded border border-gray-200 dark:border-gray-800 font-mono break-all text-gray-600 dark:text-gray-400">
                  {ex.alt}
                </code>
              )}
            </div>
          ))}
          <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-800 bg-blue-100/50 dark:bg-blue-900/30 p-3 rounded">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              💡 <strong>Tip:</strong> You can combine tags like{" "}
              <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-xs border border-gray-300 dark:border-gray-700">
                &lt;b&gt;&lt;i&gt;bold italic&lt;/i&gt;&lt;/b&gt;
              </code>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
