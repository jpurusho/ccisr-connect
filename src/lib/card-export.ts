/**
 * Shared utilities for exporting/sharing email card previews.
 *
 * Used by WeeklyCommunicationCard and potentially other components that
 * need to render HTML previews as downloadable PDFs, images, or shareable
 * content via WhatsApp / Web Share API.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function createOffscreenContainer(html: string): HTMLDivElement {
  const el = document.createElement("div")
  el.style.cssText =
    "position:fixed;top:0;left:0;z-index:-9999;width:496px;background:#ffffff;pointer-events:none;padding:8px;"
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

function removeContainer(el: HTMLDivElement) {
  document.body.removeChild(el)
}

function slugify(title: string): string {
  return title.replace(/\s+/g, "-").toLowerCase()
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildShareText(
  title: string,
  subject?: string,
  resourceLinks?: { label: string; url: string }[]
): string {
  const linkLines = (resourceLinks ?? [])
    .filter((l) => l.url)
    .map((l) => `${l.label || "Link"}: ${l.url}`)
  return [subject || title, ...linkLines].join("\n")
}

export function downloadAsPdf(html: string, title: string): void {
  const iframe = document.createElement("iframe")
  iframe.style.cssText =
    "position:fixed;left:-9999px;top:0;width:600px;height:800px;"
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }
  doc.open()
  doc.write(
    `<!DOCTYPE html><html><head><title>${title}</title>` +
      `<style>*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}` +
      `body{font-family:'Inter',-apple-system,sans-serif;margin:20px;display:flex;justify-content:center;}` +
      `@media print{body{margin:0;}}</style></head><body>${html}</body></html>`
  )
  doc.close()
  setTimeout(() => {
    iframe.contentWindow?.print()
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }, 300)
}

export async function downloadAsImage(
  html: string,
  title: string
): Promise<void> {
  const container = createOffscreenContainer(html)
  try {
    const { toPng } = await import("html-to-image")
    const dataUrl = await toPng(container, { pixelRatio: 2 })
    const link = document.createElement("a")
    link.download = `${slugify(title)}.png`
    link.href = dataUrl
    link.click()
  } catch (err) {
    console.error("html-to-image failed:", err)
    throw err
  } finally {
    removeContainer(container)
  }
}

export async function shareViaWhatsApp(
  html: string,
  title: string,
  shareText: string
): Promise<void> {
  const container = createOffscreenContainer(html)
  try {
    const { toBlob, toPng } = await import("html-to-image")
    const filename = `${slugify(title)}.png`

    const blob = await toBlob(container, { pixelRatio: 2 })
    if (!blob) throw new Error("Failed to create image")
    const file = new File([blob], filename, { type: "image/png" })

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ text: shareText, files: [file] })
      return
    }

    const dataUrl = await toPng(container, { pixelRatio: 2 })
    const link = document.createElement("a")
    link.download = filename
    link.href = dataUrl
    link.click()
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + "\n\n(image downloaded — attach it to this message)")}`
    window.open(waUrl, "_blank")
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
    window.open(waUrl, "_blank")
  } finally {
    removeContainer(container)
  }
}

export async function shareCard(
  html: string,
  title: string,
  shareText: string
): Promise<void> {
  const container = createOffscreenContainer(html)
  try {
    const { toBlob, toPng } = await import("html-to-image")
    const filename = `${slugify(title)}.png`

    const blob = await toBlob(container, { pixelRatio: 2 })
    if (!blob) throw new Error("Failed to create image")
    const file = new File([blob], filename, { type: "image/png" })

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ text: shareText, files: [file] })
    } else if (navigator.share) {
      await navigator.share({ text: shareText })
    } else {
      const dataUrl = await toPng(container, { pixelRatio: 2 })
      const link = document.createElement("a")
      link.download = filename
      link.href = dataUrl
      link.click()
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return
    throw err
  } finally {
    removeContainer(container)
  }
}
