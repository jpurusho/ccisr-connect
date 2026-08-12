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
    <div className="rounded-lg border border-blue-200 bg-blue-50/30 dark:border-blue-700/40 dark:bg-blue-950/20 mt-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
      >
        {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        HTML Formatting Help
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
            Use these HTML tags to format your text:
          </p>
          {examples.map((ex, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-900 dark:text-blue-200">{ex.label}:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(ex.code)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  title="Copy to clipboard"
                >
                  <Copy className="size-3" />
                </button>
              </div>
              <code className="block text-xs bg-white dark:bg-gray-900 p-2 rounded border border-blue-200 dark:border-blue-800 font-mono break-all">
                {ex.code}
              </code>
              {ex.alt && (
                <code className="block text-xs bg-white dark:bg-gray-900 p-2 rounded border border-blue-200 dark:border-blue-800 font-mono break-all opacity-70">
                  {ex.alt}
                </code>
              )}
            </div>
          ))}
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 pt-2 border-t border-blue-200 dark:border-blue-800">
            💡 <strong>Tip:</strong> You can combine tags like <code className="bg-white dark:bg-gray-900 px-1 py-0.5 rounded text-[10px]">&lt;b&gt;&lt;i&gt;bold italic&lt;/i&gt;&lt;/b&gt;</code>
          </p>
        </div>
      )}
    </div>
  )
}
