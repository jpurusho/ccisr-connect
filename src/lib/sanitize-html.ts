export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html
  const DOMPurify = require("dompurify") as typeof import("dompurify")["default"]
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["style"],
    ADD_ATTR: ["target", "style", "class", "cellpadding", "cellspacing", "width", "align", "bgcolor", "background"],
  })
}
