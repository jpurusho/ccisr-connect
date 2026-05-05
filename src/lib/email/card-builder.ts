/**
 * Email Card Builder
 *
 * Generates email-safe HTML cards using table-based layout (Gmail/Outlook compatible).
 * Follows the OTS card design language: colored header band, prominent content, clean layout.
 *
 * Each card type has a distinct color palette:
 *   Birthday:        Purple (#7C3AED)
 *   Anniversary:     Gold (#D97706)
 *   Bible Study:     Teal (#0D9488)
 *   Women's Study:   Rose (#DB2777)
 *   Prayer Meeting:  Green (#059669)
 *   Bulletin:        Indigo (#4F46E5)
 */

export interface CardColors {
  primary: string;
  primaryLight: string;
  accent: string;
  textDark: string;
  textLight: string;
  border: string;
  bgLight: string;
}

// ── Style Settings Types ────────────────────────────────────────────────────

export type FontFamily = "sans-serif" | "serif" | "rounded" | "monospace"
export type FontSizeScale = "compact" | "default" | "large"
export type HeaderStyle = "band" | "top-border" | "side-accent"
export type SectionLayout = "table" | "paragraph" | "list"

export interface TemplateStyleSettings {
  fontFamily?: FontFamily
  fontSizeScale?: FontSizeScale
  headerColor?: string
  customPastels?: { bg: string; border: string; label: string }[]
  sectionLayout?: SectionLayout
  headerStyle?: HeaderStyle
  darkModeEnabled?: boolean
  footerText?: string
}

export interface StyleContext {
  fontStack: string
  sizes: { header: number; body: number; label: number; footer: number }
  headerStyle: HeaderStyle
  sectionLayout: SectionLayout
  darkMode: boolean
  footerText?: string
  customPastels?: { bg: string; border: string }[]
}

export const FONT_STACKS: Record<FontFamily, string> = {
  "sans-serif": "'Segoe UI', system-ui, -apple-system, sans-serif",
  "serif": "Georgia, 'Times New Roman', serif",
  "rounded": "'Nunito', 'Segoe UI', system-ui, sans-serif",
  "monospace": "'Courier New', Courier, monospace",
}

export const SIZE_SCALES: Record<FontSizeScale, { header: number; body: number; label: number; footer: number }> = {
  compact: { header: 20, body: 13, label: 11, footer: 10 },
  default: { header: 22, body: 14, label: 12, footer: 11 },
  large: { header: 26, body: 16, label: 13, footer: 12 },
}

export function buildStyleContext(settings?: TemplateStyleSettings): StyleContext {
  const s = settings ?? {}
  return {
    fontStack: FONT_STACKS[s.fontFamily ?? "sans-serif"],
    sizes: SIZE_SCALES[s.fontSizeScale ?? "default"],
    headerStyle: s.headerStyle ?? "band",
    sectionLayout: s.sectionLayout ?? "table",
    darkMode: s.darkModeEnabled ?? false,
    footerText: s.footerText,
    customPastels: s.customPastels,
  }
}

export function deriveColorsFromPrimary(hex: string): CardColors {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const mix = (c: number, w: number, t: number) => Math.round(c * (1 - t) + w * t)
  const toHex = (r2: number, g2: number, b2: number) =>
    `#${[r2, g2, b2].map((c) => c.toString(16).padStart(2, "0")).join("")}`

  return {
    primary: hex,
    primaryLight: toHex(mix(r, 255, 0.85), mix(g, 255, 0.85), mix(b, 255, 0.85)),
    accent: toHex(mix(r, 255, 0.4), mix(g, 255, 0.4), mix(b, 255, 0.4)),
    textDark: "#1E293B",
    textLight: "#64748B",
    border: toHex(mix(r, 255, 0.7), mix(g, 255, 0.7), mix(b, 255, 0.7)),
    bgLight: toHex(mix(r, 255, 0.92), mix(g, 255, 0.92), mix(b, 255, 0.92)),
  }
}

export const PASTEL_BORDER_MAP: Record<string, string> = {
  "#FFE4E4": "#F87171",
  "#FFE8D6": "#FB923C",
  "#FFFBD6": "#EAB308",
  "#D6F5E0": "#34D399",
  "#D6F0FF": "#38BDF8",
  "#E4DEFF": "#A78BFA",
  "#FFD6F5": "#F472B6",
  "#DBEAFE": "#60A5FA",
};

export function getPastelBorderMap(customPastels?: { bg: string; border: string }[]): Record<string, string> {
  const map = { ...PASTEL_BORDER_MAP };
  if (customPastels) {
    for (const p of customPastels) map[p.bg] = p.border;
  }
  return map;
}

export function pastelBoxHtml(content: string, bgColor: string | undefined, outerStyle?: string, customPastels?: { bg: string; border: string }[]): string {
  if (!bgColor) return content;
  const map = customPastels ? getPastelBorderMap(customPastels) : PASTEL_BORDER_MAP;
  const border = map[bgColor];
  if (!border) return content;
  const extra = outerStyle ? `;${outerStyle}` : "";
  return `<div style="background:${bgColor};border:1.5px solid ${border};border-radius:8px;padding:12px 16px;box-shadow:0 0 8px ${border}50${extra}">${content}</div>`;
}

function msgBlock(message: string, bgColor: string | undefined, colors: CardColors, margin = "0 0 16px", style?: StyleContext): string {
  const sz = style?.sizes.body ?? 14;
  const p = `<p style="margin:0;font-size:${sz}px;color:${colors.textDark};text-align:center;line-height:1.6;white-space:pre-wrap">${message}</p>`;
  return bgColor
    ? pastelBoxHtml(p, bgColor, `margin:${margin}`, style?.customPastels)
    : `<p style="margin:${margin};font-size:${sz}px;color:${colors.textDark};text-align:center;line-height:1.6;white-space:pre-wrap">${message}</p>`;
}

export const EVENT_COLORS: Record<string, CardColors> = {
  birthday: {
    primary: "#7C3AED",
    primaryLight: "#EDE9FE",
    accent: "#A78BFA",
    textDark: "#1E293B",
    textLight: "#64748B",
    border: "#DDD6FE",
    bgLight: "#F5F3FF",
  },
  anniversary: {
    primary: "#D97706",
    primaryLight: "#FEF3C7",
    accent: "#F59E0B",
    textDark: "#1E293B",
    textLight: "#64748B",
    border: "#FDE68A",
    bgLight: "#FFFBEB",
  },
  friday_bible_study: {
    primary: "#0D9488",
    primaryLight: "#CCFBF1",
    accent: "#14B8A6",
    textDark: "#1E293B",
    textLight: "#64748B",
    border: "#99F6E4",
    bgLight: "#F0FDFA",
  },
  wednesday_womens_study: {
    primary: "#DB2777",
    primaryLight: "#FCE7F3",
    accent: "#F472B6",
    textDark: "#1E293B",
    textLight: "#64748B",
    border: "#FBCFE8",
    bgLight: "#FDF2F8",
  },
  monthly_prayer: {
    primary: "#059669",
    primaryLight: "#D1FAE5",
    accent: "#34D399",
    textDark: "#1E293B",
    textLight: "#64748B",
    border: "#A7F3D0",
    bgLight: "#ECFDF5",
  },
  bulletin: {
    primary: "#4F46E5",
    primaryLight: "#EEF2FF",
    accent: "#818CF8",
    textDark: "#1E293B",
    textLight: "#64748B",
    border: "#C7D2FE",
    bgLight: "#EEF2FF",
  },
};

export interface CardCustomSection {
  title: string;
  emoji: string;
  color?: string;
  entries: { label: string; name: string }[];
}

export interface CardFlyerSection {
  imageUrl: string;
  caption?: string;
  captionBgColor?: string;
  resourceLinks?: ResourceLink[];
}

export interface BaseCardData {
  message?: string;
  messageBgColor?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  headerEmoji?: string;
  footerVerse?: string;
  footerVerseBgColor?: string;
  primaryColor?: string;
  resourceLinks?: ResourceLink[];
  customSections?: CardCustomSection[];
}

function customSectionsHtml(sections: CardCustomSection[] | undefined, colors: CardColors, style?: StyleContext): string {
  if (!sections || sections.length === 0) return "";
  const layout = style?.sectionLayout ?? "table";
  const sz = style?.sizes ?? SIZE_SCALES.default;

  return sections
    .filter((s) => s.title)
    .map((s) => {
      const sColor = s.color || colors.primary;
      const sBg = s.color ? deriveColorsFromPrimary(s.color).bgLight : "";
      const bgStyle = sBg ? `background:${sBg};border-radius:8px;padding:4px 16px;` : "";
      const validEntries = s.entries.filter((e) => e.label || e.name);
      const headerHtml = `<td style="padding:16px 0 8px;font-size:${sz.label + 1}px;font-weight:700;color:${sColor};text-transform:uppercase;letter-spacing:0.5px">${s.emoji || "📋"} ${s.title}</td>`;

      if (layout === "paragraph") {
        const text = validEntries.map((e) => e.label ? `${e.label}: ${e.name}` : e.name).join(", ");
        return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;${bgStyle}"><tr>${headerHtml}</tr><tr><td style="padding:4px 12px 12px;font-size:${sz.body}px;color:${colors.textDark};line-height:1.6">${text}</td></tr></table>`;
      }

      if (layout === "list") {
        const items = validEntries.map((e) => `<li style="padding:2px 0;font-size:${sz.body}px;color:${colors.textDark}">${e.label ? `<strong>${e.label}:</strong> ` : ""}${e.name}</li>`).join("");
        return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;${bgStyle}"><tr>${headerHtml}</tr><tr><td style="padding:4px 12px 12px"><ul style="margin:0;padding-left:20px;color:${colors.textDark}">${items}</ul></td></tr></table>`;
      }

      const rows = validEntries
        .map(
          (e) =>
            `<tr><td style="padding:4px 0 4px 12px;font-size:${sz.body}px;color:${colors.textDark}">${e.label || ""}</td><td style="padding:4px 12px 4px 0;font-size:${sz.body - 1}px;color:${colors.textLight};text-align:right;font-weight:500">${e.name || ""}</td></tr>`
        )
        .join("");
      return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;${bgStyle}"><tr>${headerHtml}</tr>${rows}</table>`;
    })
    .join("");
}

function flyerSectionsHtml(sections: CardFlyerSection[] | undefined, colors: CardColors): string {
  if (!sections || sections.length === 0) return "";
  return sections
    .filter((s) => s.imageUrl)
    .map((s) => {
      const captionHtml = s.caption
        ? (s.captionBgColor
          ? pastelBoxHtml(`<p style="margin:0;font-size:14px;line-height:1.6;color:#374151">${s.caption}</p>`, s.captionBgColor, "margin-bottom:8px")
          : `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#374151">${s.caption}</p>`)
        : "";
      return `<div style="border-top:1px solid ${colors.border};margin:16px 0"></div><img src="${s.imageUrl}" alt="Event Flyer" style="width:100%;display:block;border-radius:8px;margin-bottom:10px" />${captionHtml}${resourceLinksHtml(s.resourceLinks, colors)}`;
    })
    .join("");
}

function commonTrailingHtml(data: BaseCardData, colors: CardColors, extraResourceLinks?: ResourceLink[], style?: StyleContext): string {
  const allLinks = [...(data.resourceLinks ?? []), ...(extraResourceLinks ?? [])];
  return `${customSectionsHtml(data.customSections, colors, style)}
${resourceLinksHtml(allLinks, colors)}`;
}

export function extractCommonCardData(form: {
  message?: string;
  messageBgColor?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  headerEmoji?: string;
  primaryColor?: string;
  footerVerse?: string;
  footerVerseBgColor?: string;
  resourceLinks?: { label: string; url: string }[];
  customSections?: CardCustomSection[];
}): BaseCardData {
  return {
    message: form.message || undefined,
    messageBgColor: form.messageBgColor || undefined,
    headerTitle: form.headerTitle || undefined,
    headerSubtitle: form.headerSubtitle || undefined,
    headerEmoji: form.headerEmoji || undefined,
    primaryColor: form.primaryColor || undefined,
    footerVerse: form.footerVerse || undefined,
    footerVerseBgColor: form.footerVerseBgColor || undefined,
    resourceLinks: (form.resourceLinks ?? []).filter((l) => l.url),
    customSections: form.customSections,
  };
}

function wrapCard(content: string, colors: CardColors, style?: StyleContext): string {
  const font = style?.fontStack ?? FONT_STACKS["sans-serif"];
  const darkBlock = style?.darkMode
    ? `<style>@media(prefers-color-scheme:dark){.card-outer{background:#1e293b!important}.card-content td{background:#0f172a!important}}</style>`
    : "";
  return `${darkBlock}<div class="card-outer" style="max-width:480px;margin:0 auto;font-family:${font}">
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${colors.border};border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
${content}
</table>
</div>`;
}

function headerRow(
  title: string,
  subtitle: string,
  emoji: string,
  colors: CardColors,
  style?: StyleContext
): string {
  const sz = style?.sizes ?? SIZE_SCALES.default;
  const variant = style?.headerStyle ?? "band";

  if (variant === "top-border") {
    return `<tr><td style="border-top:4px solid ${colors.primary};padding:24px 28px;text-align:center;background:#ffffff">
<p style="margin:0;font-size:32px;line-height:1">${emoji}</p>
<p style="margin:8px 0 0;font-size:${sz.header}px;font-weight:700;color:${colors.textDark};letter-spacing:-0.3px">${title}</p>
<p style="margin:6px 0 0;font-size:${sz.label + 1}px;color:${colors.textLight};font-weight:500">${subtitle}</p>
</td></tr>`;
  }

  if (variant === "side-accent") {
    return `<tr><td style="border-left:6px solid ${colors.primary};padding:20px 24px;background:#ffffff">
<table cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:14px;vertical-align:middle"><span style="font-size:28px">${emoji}</span></td>
<td style="vertical-align:middle">
<p style="margin:0;font-size:${sz.header - 2}px;font-weight:700;color:${colors.textDark};letter-spacing:-0.3px">${title}</p>
<p style="margin:4px 0 0;font-size:${sz.label + 1}px;color:${colors.textLight};font-weight:500">${subtitle}</p>
</td></tr></table>
</td></tr>`;
  }

  return `<tr><td style="background:${colors.primary};padding:24px 28px;text-align:center">
<p style="margin:0;font-size:32px;line-height:1">${emoji}</p>
<p style="margin:8px 0 0;font-size:${sz.header}px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">${title}</p>
<p style="margin:6px 0 0;font-size:${sz.label + 1}px;color:rgba(255,255,255,0.85);font-weight:500">${subtitle}</p>
</td></tr>`;
}

function contentRow(html: string, colors: CardColors): string {
  return `<tr><td style="background:#ffffff;padding:24px 28px">
${html}
</td></tr>`;
}

function resourceLinksHtml(links: ResourceLink[] | undefined, colors: CardColors): string {
  const valid = (links ?? []).filter(l => l.url);
  if (valid.length === 0) return "";
  return `<div style="text-align:center;margin-top:16px">${valid.map(l =>
    `<a href="${l.url}" style="display:inline-block;padding:8px 20px;background:${colors.primary};color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;margin:4px">${l.label || "View Link"}</a>`
  ).join("")}</div>`;
}

function footerRow(text: string, colors: CardColors, bgColor?: string, style?: StyleContext): string {
  const footerText = style?.footerText || text;
  const sz = style?.sizes.footer ?? 11;
  const bg = bgColor || colors.bgLight;
  const map = style?.customPastels ? getPastelBorderMap(style.customPastels) : PASTEL_BORDER_MAP;
  const border = bgColor ? (map[bgColor] ?? colors.border) : colors.border;
  const glow = bgColor && map[bgColor] ? `;box-shadow:0 0 8px ${map[bgColor]}50` : "";
  return `<tr><td style="background:${bg};padding:14px 28px;text-align:center;border-top:1.5px solid ${border}${glow}">
<p style="margin:0;font-size:${sz}px;color:${colors.textLight}">${footerText}</p>
</td></tr>`;
}

// ---------- Birthday Card (Multiple People) ----------

export interface BirthdayEntry {
  name: string;
  date: string; // e.g., "4/29" or "April 29"
}

export interface BirthdayCardData extends BaseCardData {
  weekLabel: string;
  birthdays: BirthdayEntry[];
}

export function buildBirthdayCard(data: BirthdayCardData, style?: StyleContext): string {
  const colors = data.primaryColor ? deriveColorsFromPrimary(data.primaryColor) : EVENT_COLORS.birthday;
  const sz = style?.sizes ?? SIZE_SCALES.default;

  const personRows = data.birthdays
    .map(
      (b) =>
        `<tr>
<td style="padding:10px 16px;font-size:${sz.body + 2}px;font-weight:600;color:${colors.textDark};border-bottom:1px solid ${colors.border}">${b.name}</td>
<td style="padding:10px 16px;font-size:${sz.body}px;color:${colors.accent};text-align:right;border-bottom:1px solid ${colors.border};font-weight:500">${b.date}</td>
</tr>`
    )
    .join("");

  const messageHtml = data.message
    ? `<div style="margin:20px auto;width:60px;height:3px;background:${colors.border};border-radius:2px"></div>
${msgBlock(data.message, data.messageBgColor, colors, "0", style)}`
    : "";

  const content =
    headerRow(
      data.headerTitle || "Happy Birthday!",
      data.headerSubtitle || "Christ Church of India, San Ramon",
      data.headerEmoji || "🎂",
      colors,
      style
    ) +
    contentRow(
      `<p style="margin:0 0 4px;font-size:${sz.label}px;color:${colors.textLight};text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Birthdays this week &bull; ${data.weekLabel}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bgLight};border-radius:8px;overflow:hidden;margin-top:8px">
${personRows}
</table>
${messageHtml}
${commonTrailingHtml(data, colors, undefined, style)}`,
      colors
    ) +
    footerRow(data.footerVerse || "Christ Church of India, San Ramon — CCISR Connect", colors, data.footerVerseBgColor, style);

  return wrapCard(content, colors, style);
}

// ---------- Anniversary Card (Multiple Couples) ----------

export interface AnniversaryEntry {
  husbandName: string;
  wifeName: string;
  date: string; // e.g., "4/27" or "April 27"
  years?: number;
}

export interface AnniversaryCardData extends BaseCardData {
  weekLabel: string;
  anniversaries: AnniversaryEntry[];
}

export function buildAnniversaryCard(data: AnniversaryCardData, style?: StyleContext): string {
  const colors = data.primaryColor ? deriveColorsFromPrimary(data.primaryColor) : EVENT_COLORS.anniversary;
  const sz = style?.sizes ?? SIZE_SCALES.default;

  const coupleRows = data.anniversaries
    .map((a) => {
      const yearsText = a.years ? ` (${a.years} yrs)` : "";
      return `<tr>
<td style="padding:10px 16px;font-size:${sz.body + 2}px;font-weight:600;color:${colors.textDark};border-bottom:1px solid ${colors.border}">${a.husbandName} & ${a.wifeName}</td>
<td style="padding:10px 16px;font-size:${sz.body}px;color:${colors.accent};text-align:right;border-bottom:1px solid ${colors.border};font-weight:500;white-space:nowrap">${a.date}${yearsText}</td>
</tr>`;
    })
    .join("");

  const messageHtml = data.message
    ? `<div style="margin:20px auto;width:60px;height:3px;background:${colors.border};border-radius:2px"></div>
${msgBlock(data.message, data.messageBgColor, colors, "0", style)}`
    : "";

  const content =
    headerRow(
      data.headerTitle || "Happy Anniversary!",
      data.headerSubtitle || "Christ Church of India, San Ramon",
      data.headerEmoji || "💍",
      colors,
      style
    ) +
    contentRow(
      `<p style="margin:0 0 4px;font-size:${sz.label}px;color:${colors.textLight};text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Anniversaries this week &bull; ${data.weekLabel}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bgLight};border-radius:8px;overflow:hidden;margin-top:8px">
${coupleRows}
</table>
${messageHtml}
${commonTrailingHtml(data, colors, undefined, style)}`,
      colors
    ) +
    footerRow(data.footerVerse || "Christ Church of India, San Ramon — CCISR Connect", colors, data.footerVerseBgColor, style);

  return wrapCard(content, colors, style);
}

// ---------- Bible Study Invite (multi-location) ----------

export interface BibleStudyLocation {
  label: string;
  hostNames?: string;
  address?: string;
  city?: string;
  phone?: string;
  onVacation?: boolean;
  vacationMessage?: string;
}

export interface ResourceLink {
  label: string;
  url: string;
}

export interface BibleStudyCardData extends BaseCardData {
  title?: string;
  date: string;
  time: string;
  topic?: string;
  resourceLink?: ResourceLink;
  locations: BibleStudyLocation[];
}

export function buildBibleStudyCard(data: BibleStudyCardData, style?: StyleContext): string {
  const colors = data.primaryColor ? deriveColorsFromPrimary(data.primaryColor) : EVENT_COLORS.friday_bible_study;
  const sz = style?.sizes ?? SIZE_SCALES.default;

  const detailRow = (label: string, value: string) =>
    `<tr>
<td style="padding:6px 0;font-size:${sz.label}px;color:${colors.textLight};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;vertical-align:top;width:80px">${label}</td>
<td style="padding:6px 0 6px 12px;font-size:${sz.body}px;color:${colors.textDark};font-weight:500">${value}</td>
</tr>`;

  const locationBlocks = data.locations
    .map((loc) => {
      const locationHeader = data.locations.length > 1
        ? `<p style="margin:0 0 8px;font-size:${sz.body}px;font-weight:700;color:${colors.primary}">${loc.label}</p>`
        : "";

      if (loc.onVacation) {
        const msg = loc.vacationMessage || `${loc.label} Bible Study is on break`;
        return `${locationHeader}<div style="background:${colors.bgLight};border-radius:8px;padding:12px 16px;text-align:center">
<p style="margin:0;font-size:${sz.label + 1}px;color:${colors.textLight};font-style:italic">${msg}</p>
</div>`;
      }

      let details = "";
      if (loc.hostNames) details += detailRow("Host", loc.hostNames);
      const addrParts = [loc.address, loc.city].filter(Boolean).join("<br/>");
      if (addrParts) details += detailRow("Where", addrParts);
      if (loc.phone) details += detailRow("Contact", loc.phone);

      if (!details) return "";

      return `${locationHeader}<table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bgLight};border-radius:8px;padding:4px 16px">
${details}
</table>`;
    })
    .filter(Boolean)
    .join(`<div style="height:16px"></div>`);

  let sharedDetails = detailRow("When", `${data.date} at ${data.time}`);
  if (data.topic) sharedDetails += detailRow("Topic", data.topic);

  const content =
    headerRow(
      data.title || "Bible Study This Friday",
      data.headerSubtitle || "Christ Church of India, San Ramon",
      data.headerEmoji || "📖",
      colors,
      style
    ) +
    contentRow(
      `${data.message ? msgBlock(data.message, data.messageBgColor, colors, "0 0 16px", style) : ""}
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
${sharedDetails}
</table>
${locationBlocks}
${commonTrailingHtml(data, colors, data.resourceLink ? [data.resourceLink] : undefined, style)}`,
      colors
    ) +
    footerRow(data.footerVerse || "Christ Church of India, San Ramon — CCISR Connect", colors, data.footerVerseBgColor, style);

  return wrapCard(content, colors, style);
}

// ---------- Women's Bible Study ----------

export interface WomensStudyCardData extends BaseCardData {
  title?: string;
  topic?: string;
  date: string;
  time: string;
  zoomLink?: string;
  zoomMeetingId?: string;
  zoomPasscode?: string;
  location?: string;
}

export function buildWomensStudyCard(data: WomensStudyCardData, style?: StyleContext): string {
  const colors = data.primaryColor ? deriveColorsFromPrimary(data.primaryColor) : EVENT_COLORS.wednesday_womens_study;
  const sz = style?.sizes ?? SIZE_SCALES.default;

  const detailRow = (label: string, value: string) =>
    `<tr>
<td style="padding:6px 0;font-size:${sz.label}px;color:${colors.textLight};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;vertical-align:top;width:80px">${label}</td>
<td style="padding:6px 0 6px 12px;font-size:${sz.body}px;color:${colors.textDark};font-weight:500">${value}</td>
</tr>`;

  let details = detailRow("When", `${data.date} at ${data.time}`);
  if (data.topic) details += detailRow("Topic", data.topic);
  if (data.zoomLink) {
    details += detailRow("Where", "Via Zoom");
    details += detailRow(
      "Link",
      `<a href="${data.zoomLink}" style="color:${colors.primary};text-decoration:underline">Join Zoom Meeting</a>`
    );
    if (data.zoomMeetingId) details += detailRow("Meeting ID", data.zoomMeetingId);
    if (data.zoomPasscode) details += detailRow("Passcode", data.zoomPasscode);
  } else if (data.location) {
    details += detailRow("Where", data.location);
  }

  const content =
    headerRow(
      data.title || "Women's Bible Study",
      data.headerSubtitle || "Christ Church of India, San Ramon",
      data.headerEmoji || "🕊️",
      colors,
      style
    ) +
    contentRow(
      `${data.message ? msgBlock(data.message, data.messageBgColor, colors, "0 0 16px", style) : ""}
<table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bgLight};border-radius:8px;padding:4px 16px">
${details}
</table>
${commonTrailingHtml(data, colors, undefined, style)}`,
      colors
    ) +
    footerRow(data.footerVerse || "Christ Church of India, San Ramon — CCISR Connect", colors, data.footerVerseBgColor, style);

  return wrapCard(content, colors, style);
}

// ---------- Monthly Prayer Meeting ----------

export interface PrayerMeetingCardData extends BaseCardData {
  hostNames: string;
  address: string;
  city?: string;
  phone?: string;
  date: string;
  time: string;
  dinnerNote?: string;
  signupLink?: string;
  resourceLink?: ResourceLink;
}

export function buildPrayerMeetingCard(data: PrayerMeetingCardData, style?: StyleContext): string {
  const colors = data.primaryColor ? deriveColorsFromPrimary(data.primaryColor) : EVENT_COLORS.monthly_prayer;
  const sz = style?.sizes ?? SIZE_SCALES.default;
  const message =
    data.message ||
    "Please join us for a time of prayer and worship, followed by a fellowship dinner.";

  const detailRow = (label: string, value: string) =>
    `<tr>
<td style="padding:6px 0;font-size:${sz.label}px;color:${colors.textLight};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;vertical-align:top;width:80px">${label}</td>
<td style="padding:6px 0 6px 12px;font-size:${sz.body}px;color:${colors.textDark};font-weight:500">${value}</td>
</tr>`;

  let details = detailRow("When", `${data.date} at ${data.time}`);
  details += detailRow("Host", data.hostNames);
  details += detailRow("Where", data.address + (data.city ? `<br/>${data.city}` : ""));
  if (data.phone) details += detailRow("Contact", data.phone);
  if (data.dinnerNote) details += detailRow("Dinner", data.dinnerNote);

  let signupHtml = "";
  if (data.signupLink) {
    signupHtml = `<div style="text-align:center;margin-top:16px">
<a href="${data.signupLink}" style="display:inline-block;background:${colors.primary};color:#ffffff;padding:10px 28px;border-radius:6px;font-size:${sz.body}px;font-weight:600;text-decoration:none">Sign Up for Planning</a>
</div>`;
  }

  const content =
    headerRow(
      data.headerTitle || "Monthly Prayer Meeting",
      data.headerSubtitle || "Christ Church of India, San Ramon",
      data.headerEmoji || "🙏",
      colors,
      style
    ) +
    contentRow(
      `${msgBlock(message, data.messageBgColor, colors, "0 0 16px", style)}
<table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bgLight};border-radius:8px;padding:4px 16px">
${details}
</table>
${signupHtml}
${commonTrailingHtml(data, colors, data.resourceLink ? [data.resourceLink] : undefined, style)}`,
      colors
    ) +
    footerRow(
      data.footerVerse || '"For where two or three gather in my name, there am I with them." — Matthew 18:20',
      colors,
      data.footerVerseBgColor,
      style
    );

  return wrapCard(content, colors, style);
}

// ---------- Weekly Bulletin ----------

export interface BulletinItem {
  type: "birthday" | "anniversary" | "helper" | "event";
  label: string;
  value: string;
}

export interface BulletinCardData extends BaseCardData {
  weekLabel: string;
  birthdays: { name: string; date: string }[];
  anniversaries: { names: string; date: string }[];
  helpers: { role: string; name: string }[];
  events: { title: string; details: string }[];
  sectionOrder?: string[];
}

export function buildBulletinCard(data: BulletinCardData, style?: StyleContext): string {
  const colors = data.primaryColor ? deriveColorsFromPrimary(data.primaryColor) : EVENT_COLORS.bulletin;
  const sz = style?.sizes ?? SIZE_SCALES.default;

  const sectionTitle = (icon: string, title: string, sectionColor: string) =>
    `<tr><td style="padding:16px 0 8px;font-size:${sz.label + 1}px;font-weight:700;color:${sectionColor};text-transform:uppercase;letter-spacing:0.5px">${icon} ${title}</td></tr>`;

  const itemRow = (name: string, detail: string) =>
    `<tr>
<td style="padding:4px 0 4px 12px;font-size:${sz.body}px;color:${colors.textDark}">${name}</td>
<td style="padding:4px 0;font-size:${sz.body - 1}px;color:${colors.textLight};text-align:right;font-weight:500">${detail}</td>
</tr>`;

  const sectionBuilders: Record<string, () => string> = {
    birthdays: () => data.birthdays.length === 0 ? "" :
      `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px">
${sectionTitle("🎂", "Birthdays", EVENT_COLORS.birthday.primary)}
${data.birthdays.map((b) => itemRow(b.name, b.date)).join("")}
</table>`,
    anniversaries: () => data.anniversaries.length === 0 ? "" :
      `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px">
${sectionTitle("💍", "Anniversaries", EVENT_COLORS.anniversary.primary)}
${data.anniversaries.map((a) => itemRow(a.names, a.date)).join("")}
</table>`,
    helpers: () => data.helpers.length === 0 ? "" :
      `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px">
${sectionTitle("🤝", "Helpers This Month", colors.primary)}
${data.helpers.map((h) => itemRow(h.role, h.name)).join("")}
</table>`,
    events: () => data.events.length === 0 ? "" :
      `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px">
${sectionTitle("📅", "This Week", EVENT_COLORS.friday_bible_study.primary)}
${data.events.map((e) => `<tr><td colspan="2" style="padding:4px 0 4px 12px;font-size:${sz.body}px;color:${colors.textDark}"><strong>${e.title}</strong><br/><span style="font-size:${sz.label}px;color:${colors.textLight}">${e.details}</span></td></tr>`).join("")}
</table>`,
  };

  const order = data.sectionOrder ?? ["birthdays", "anniversaries", "helpers", "events"];
  let sections = order.map((key) => sectionBuilders[key]?.() ?? "").join("");

  const messageBg = data.messageBgColor || colors.bgLight;
  const messageBc = data.messageBgColor ? (PASTEL_BORDER_MAP[data.messageBgColor] ?? colors.border) : colors.border;
  const messageGlow = data.messageBgColor && PASTEL_BORDER_MAP[data.messageBgColor] ? `;box-shadow:0 0 8px ${PASTEL_BORDER_MAP[data.messageBgColor]}50` : "";
  const messageHtml = data.message
    ? `<div style="margin:16px 0 0;padding:12px 16px;background:${messageBg};border:1.5px solid ${messageBc};border-radius:8px;font-size:${sz.body}px;color:${colors.textDark};line-height:1.6;white-space:pre-wrap${messageGlow}">${data.message}</div>`
    : "";

  const churchName = data.headerSubtitle || "Christ Church of India, San Ramon";
  const churchLine = `<p style="margin:0 0 4px;font-size:${sz.label}px;color:rgba(255,255,255,0.75);font-weight:500;text-transform:uppercase;letter-spacing:1px">${churchName}</p>`;

  const bulletinEmoji = data.headerEmoji || "⛪";
  const bulletinTitle = data.headerTitle || "Weekly Bulletin";
  const bulletinHeader = `<tr><td style="background:${colors.primary};padding:24px 28px;text-align:center">
<p style="margin:0;font-size:32px;line-height:1">${bulletinEmoji}</p>
${churchLine}<p style="margin:8px 0 0;font-size:${sz.header}px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">${bulletinTitle}</p>
<p style="margin:6px 0 0;font-size:${sz.label + 1}px;color:rgba(255,255,255,0.85);font-weight:500">${data.weekLabel}</p>
</td></tr>`;

  const content =
    bulletinHeader +
    contentRow(`${sections}${messageHtml}
${commonTrailingHtml(data, colors, undefined, style)}`, colors) +
    footerRow(
      data.footerVerse || "Christ Church of India, San Ramon — CCISR Connect",
      colors,
      undefined,
      style
    );

  return wrapCard(content, colors, style);
}

// ---------- Generic / Custom Card ----------

export interface CustomCardData extends BaseCardData {
  title: string;
  subtitle?: string;
  emoji?: string;
  bannerImageUrl?: string;
  bodyHtml: string;
  flyerSections?: CardFlyerSection[];
  colorScheme?: string;
}

export function buildCustomCard(data: CustomCardData, style?: StyleContext): string {
  const colors = data.primaryColor
    ? deriveColorsFromPrimary(data.primaryColor)
    : EVENT_COLORS[data.colorScheme ?? "bulletin"] || EVENT_COLORS.bulletin;
  const sz = style?.sizes ?? SIZE_SCALES.default;

  const effectiveTitle = data.headerTitle || data.title;
  const effectiveSubtitle = data.headerSubtitle || data.subtitle;
  const effectiveEmoji = data.headerEmoji || data.emoji;

  const header = data.bannerImageUrl
    ? `<tr><td style="padding:0;line-height:0"><img src="${data.bannerImageUrl}" alt="${effectiveTitle}" style="width:100%;display:block;border-radius:12px 12px 0 0" /></td></tr>
<tr><td style="background:${colors.primary};padding:12px 28px;text-align:center">
<p style="margin:0;font-size:${sz.header - 2}px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">${effectiveTitle}</p>
${effectiveSubtitle ? `<p style="margin:4px 0 0;font-size:${sz.label}px;color:rgba(255,255,255,0.85);font-weight:500">${effectiveSubtitle}</p>` : ""}
</td></tr>`
    : headerRow(effectiveTitle, effectiveSubtitle || "Christ Church of India, San Ramon", effectiveEmoji || "📋", colors, style);

  const messageHtml = data.message
    ? msgBlock(data.message, data.messageBgColor, colors, "16px 0 0", style)
    : "";

  const content =
    header +
    contentRow(`${data.bodyHtml}
${messageHtml}
${flyerSectionsHtml(data.flyerSections, colors)}
${commonTrailingHtml(data, colors, undefined, style)}`, colors) +
    footerRow(
      data.footerVerse || "Christ Church of India, San Ramon — CCISR Connect",
      colors,
      undefined,
      style
    );

  return wrapCard(content, colors, style);
}
