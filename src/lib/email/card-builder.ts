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

function wrapCard(content: string, colors: CardColors): string {
  return `<div style="max-width:480px;margin:0 auto;font-family:'Segoe UI',system-ui,-apple-system,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${colors.border};border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
${content}
</table>
</div>`;
}

function headerRow(
  title: string,
  subtitle: string,
  emoji: string,
  colors: CardColors
): string {
  return `<tr><td style="background:${colors.primary};padding:24px 28px;text-align:center">
<p style="margin:0;font-size:32px;line-height:1">${emoji}</p>
<p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">${title}</p>
<p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85);font-weight:500">${subtitle}</p>
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

function footerRow(text: string, colors: CardColors): string {
  return `<tr><td style="background:${colors.bgLight};padding:14px 28px;text-align:center;border-top:1px solid ${colors.border}">
<p style="margin:0;font-size:11px;color:${colors.textLight}">${text}</p>
</td></tr>`;
}

// ---------- Birthday Card (Multiple People) ----------

export interface BirthdayEntry {
  name: string;
  date: string; // e.g., "4/29" or "April 29"
}

export interface BirthdayCardData {
  weekLabel: string;
  birthdays: BirthdayEntry[];
  message?: string;
  headerSubtitle?: string;
  footerVerse?: string;
  primaryColor?: string;
  resourceLinks?: ResourceLink[];
}

export function buildBirthdayCard(data: BirthdayCardData): string {
  const colors = data.primaryColor ? deriveColorsFromPrimary(data.primaryColor) : EVENT_COLORS.birthday;

  const personRows = data.birthdays
    .map(
      (b) =>
        `<tr>
<td style="padding:10px 16px;font-size:16px;font-weight:600;color:${colors.textDark};border-bottom:1px solid ${colors.border}">${b.name}</td>
<td style="padding:10px 16px;font-size:14px;color:${colors.accent};text-align:right;border-bottom:1px solid ${colors.border};font-weight:500">${b.date}</td>
</tr>`
    )
    .join("");

  const messageHtml = data.message
    ? `<div style="margin:20px auto;width:60px;height:3px;background:${colors.border};border-radius:2px"></div>
<p style="margin:0;font-size:14px;color:${colors.textDark};text-align:center;line-height:1.6">${data.message}</p>`
    : "";

  const content =
    headerRow(
      "Happy Birthday!",
      data.headerSubtitle || "Christ Church of India, San Ramon",
      "🎂",
      colors
    ) +
    contentRow(
      `<p style="margin:0 0 4px;font-size:12px;color:${colors.textLight};text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Birthdays this week &bull; ${data.weekLabel}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bgLight};border-radius:8px;overflow:hidden;margin-top:8px">
${personRows}
</table>
${messageHtml}
${resourceLinksHtml(data.resourceLinks, colors)}`,
      colors
    ) +
    footerRow(data.footerVerse || "Christ Church of India, San Ramon — CCISR Connect", colors);

  return wrapCard(content, colors);
}

// ---------- Anniversary Card (Multiple Couples) ----------

export interface AnniversaryEntry {
  husbandName: string;
  wifeName: string;
  date: string; // e.g., "4/27" or "April 27"
  years?: number;
}

export interface AnniversaryCardData {
  weekLabel: string;
  anniversaries: AnniversaryEntry[];
  message?: string;
  headerSubtitle?: string;
  footerVerse?: string;
  primaryColor?: string;
  resourceLinks?: ResourceLink[];
}

export function buildAnniversaryCard(data: AnniversaryCardData): string {
  const colors = data.primaryColor ? deriveColorsFromPrimary(data.primaryColor) : EVENT_COLORS.anniversary;

  const coupleRows = data.anniversaries
    .map((a) => {
      const yearsText = a.years ? ` (${a.years} yrs)` : "";
      return `<tr>
<td style="padding:10px 16px;font-size:16px;font-weight:600;color:${colors.textDark};border-bottom:1px solid ${colors.border}">${a.husbandName} & ${a.wifeName}</td>
<td style="padding:10px 16px;font-size:14px;color:${colors.accent};text-align:right;border-bottom:1px solid ${colors.border};font-weight:500;white-space:nowrap">${a.date}${yearsText}</td>
</tr>`;
    })
    .join("");

  const messageHtml = data.message
    ? `<div style="margin:20px auto;width:60px;height:3px;background:${colors.border};border-radius:2px"></div>
<p style="margin:0;font-size:14px;color:${colors.textDark};text-align:center;line-height:1.6">${data.message}</p>`
    : "";

  const content =
    headerRow(
      "Happy Anniversary!",
      data.headerSubtitle || "Christ Church of India, San Ramon",
      "💍",
      colors
    ) +
    contentRow(
      `<p style="margin:0 0 4px;font-size:12px;color:${colors.textLight};text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Anniversaries this week &bull; ${data.weekLabel}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bgLight};border-radius:8px;overflow:hidden;margin-top:8px">
${coupleRows}
</table>
${messageHtml}
${resourceLinksHtml(data.resourceLinks, colors)}`,
      colors
    ) +
    footerRow(data.footerVerse || "Christ Church of India, San Ramon — CCISR Connect", colors);

  return wrapCard(content, colors);
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

export interface BibleStudyCardData {
  title?: string;
  date: string;
  time: string;
  topic?: string;
  message?: string;
  headerSubtitle?: string;
  footerVerse?: string;
  primaryColor?: string;
  resourceLink?: ResourceLink;
  resourceLinks?: ResourceLink[];
  locations: BibleStudyLocation[];
}

export function buildBibleStudyCard(data: BibleStudyCardData): string {
  const colors = data.primaryColor ? deriveColorsFromPrimary(data.primaryColor) : EVENT_COLORS.friday_bible_study;

  const detailRow = (label: string, value: string) =>
    `<tr>
<td style="padding:6px 0;font-size:12px;color:${colors.textLight};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;vertical-align:top;width:80px">${label}</td>
<td style="padding:6px 0 6px 12px;font-size:14px;color:${colors.textDark};font-weight:500">${value}</td>
</tr>`;

  const locationBlocks = data.locations
    .map((loc) => {
      const locationHeader = data.locations.length > 1
        ? `<p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${colors.primary}">${loc.label}</p>`
        : "";

      if (loc.onVacation) {
        const msg = loc.vacationMessage || `${loc.label} Bible Study is on break`;
        return `${locationHeader}<div style="background:${colors.bgLight};border-radius:8px;padding:12px 16px;text-align:center">
<p style="margin:0;font-size:13px;color:${colors.textLight};font-style:italic">${msg}</p>
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
      "📖",
      colors
    ) +
    contentRow(
      `${data.message ? `<p style="margin:0 0 16px;font-size:14px;color:${colors.textDark};text-align:center;line-height:1.6">${data.message}</p>` : ""}
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
${sharedDetails}
</table>
${locationBlocks}
${resourceLinksHtml([...(data.resourceLinks ?? []), ...(data.resourceLink ? [data.resourceLink] : [])], colors)}`,
      colors
    ) +
    footerRow(data.footerVerse || "Christ Church of India, San Ramon — CCISR Connect", colors);

  return wrapCard(content, colors);
}

// ---------- Women's Bible Study ----------

export interface WomensStudyCardData {
  title?: string;
  topic?: string;
  date: string;
  time: string;
  zoomLink?: string;
  zoomMeetingId?: string;
  zoomPasscode?: string;
  location?: string;
  message?: string;
  headerSubtitle?: string;
  footerVerse?: string;
  primaryColor?: string;
  resourceLinks?: ResourceLink[];
}

export function buildWomensStudyCard(data: WomensStudyCardData): string {
  const colors = data.primaryColor ? deriveColorsFromPrimary(data.primaryColor) : EVENT_COLORS.wednesday_womens_study;

  const detailRow = (label: string, value: string) =>
    `<tr>
<td style="padding:6px 0;font-size:12px;color:${colors.textLight};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;vertical-align:top;width:80px">${label}</td>
<td style="padding:6px 0 6px 12px;font-size:14px;color:${colors.textDark};font-weight:500">${value}</td>
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
      "🕊️",
      colors
    ) +
    contentRow(
      `${data.message ? `<p style="margin:0 0 16px;font-size:14px;color:${colors.textDark};text-align:center;line-height:1.6">${data.message}</p>` : ""}
<table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bgLight};border-radius:8px;padding:4px 16px">
${details}
</table>
${resourceLinksHtml(data.resourceLinks, colors)}`,
      colors
    ) +
    footerRow(data.footerVerse || "Christ Church of India, San Ramon — CCISR Connect", colors);

  return wrapCard(content, colors);
}

// ---------- Monthly Prayer Meeting ----------

export interface PrayerMeetingCardData {
  hostNames: string;
  address: string;
  city?: string;
  phone?: string;
  date: string;
  time: string;
  dinnerNote?: string;
  signupLink?: string;
  message?: string;
  headerSubtitle?: string;
  primaryColor?: string;
  footerVerse?: string;
  resourceLink?: ResourceLink;
  resourceLinks?: ResourceLink[];
}

export function buildPrayerMeetingCard(data: PrayerMeetingCardData): string {
  const colors = data.primaryColor ? deriveColorsFromPrimary(data.primaryColor) : EVENT_COLORS.monthly_prayer;
  const message =
    data.message ||
    "Please join us for a time of prayer and worship, followed by a fellowship dinner.";

  const detailRow = (label: string, value: string) =>
    `<tr>
<td style="padding:6px 0;font-size:12px;color:${colors.textLight};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;vertical-align:top;width:80px">${label}</td>
<td style="padding:6px 0 6px 12px;font-size:14px;color:${colors.textDark};font-weight:500">${value}</td>
</tr>`;

  let details = detailRow("When", `${data.date} at ${data.time}`);
  details += detailRow("Host", data.hostNames);
  details += detailRow("Where", data.address + (data.city ? `<br/>${data.city}` : ""));
  if (data.phone) details += detailRow("Contact", data.phone);
  if (data.dinnerNote) details += detailRow("Dinner", data.dinnerNote);

  let signupHtml = "";
  if (data.signupLink) {
    signupHtml = `<div style="text-align:center;margin-top:16px">
<a href="${data.signupLink}" style="display:inline-block;background:${colors.primary};color:#ffffff;padding:10px 28px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none">Sign Up for Planning</a>
</div>`;
  }

  const content =
    headerRow(
      "Monthly Prayer Meeting",
      data.headerSubtitle || "Christ Church of India, San Ramon",
      "🙏",
      colors
    ) +
    contentRow(
      `<p style="margin:0 0 16px;font-size:14px;color:${colors.textDark};text-align:center;line-height:1.6">${message}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bgLight};border-radius:8px;padding:4px 16px">
${details}
</table>
${signupHtml}
${resourceLinksHtml([...(data.resourceLinks ?? []), ...(data.resourceLink ? [data.resourceLink] : [])], colors)}`,
      colors
    ) +
    footerRow(
      data.footerVerse || '"For where two or three gather in my name, there am I with them." — Matthew 18:20',
      colors
    );

  return wrapCard(content, colors);
}

// ---------- Weekly Bulletin ----------

export interface BulletinItem {
  type: "birthday" | "anniversary" | "helper" | "event";
  label: string;
  value: string;
}

export interface BulletinCardData {
  weekLabel: string;
  headerSubtitle?: string;
  birthdays: { name: string; date: string }[];
  anniversaries: { names: string; date: string }[];
  helpers: { role: string; name: string }[];
  events: { title: string; details: string }[];
  message?: string;
  primaryColor?: string;
  footerVerse?: string;
  resourceLinks?: ResourceLink[];
}

export function buildBulletinCard(data: BulletinCardData): string {
  const colors = data.primaryColor ? deriveColorsFromPrimary(data.primaryColor) : EVENT_COLORS.bulletin;

  const sectionTitle = (icon: string, title: string, sectionColor: string) =>
    `<tr><td style="padding:16px 0 8px;font-size:13px;font-weight:700;color:${sectionColor};text-transform:uppercase;letter-spacing:0.5px">${icon} ${title}</td></tr>`;

  const itemRow = (name: string, detail: string) =>
    `<tr>
<td style="padding:4px 0 4px 12px;font-size:14px;color:${colors.textDark}">${name}</td>
<td style="padding:4px 0;font-size:13px;color:${colors.textLight};text-align:right;font-weight:500">${detail}</td>
</tr>`;

  let sections = "";

  if (data.birthdays.length > 0) {
    sections += `<table width="100%" cellpadding="0" cellspacing="0">
${sectionTitle("🎂", "Birthdays", EVENT_COLORS.birthday.primary)}
${data.birthdays.map((b) => itemRow(b.name, b.date)).join("")}
</table>`;
  }

  if (data.anniversaries.length > 0) {
    sections += `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px">
${sectionTitle("💍", "Anniversaries", EVENT_COLORS.anniversary.primary)}
${data.anniversaries.map((a) => itemRow(a.names, a.date)).join("")}
</table>`;
  }

  if (data.helpers.length > 0) {
    sections += `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px">
${sectionTitle("🤝", "Helpers This Month", colors.primary)}
${data.helpers.map((h) => itemRow(h.role, h.name)).join("")}
</table>`;
  }

  if (data.events.length > 0) {
    sections += `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px">
${sectionTitle("📅", "This Week", EVENT_COLORS.friday_bible_study.primary)}
${data.events.map((e) => `<tr><td colspan="2" style="padding:4px 0 4px 12px;font-size:14px;color:${colors.textDark}"><strong>${e.title}</strong><br/><span style="font-size:12px;color:${colors.textLight}">${e.details}</span></td></tr>`).join("")}
</table>`;
  }

  const messageHtml = data.message
    ? `<div style="margin:16px 0 0;padding:12px 16px;background:${colors.bgLight};border-radius:8px;font-size:14px;color:${colors.textDark};line-height:1.6;white-space:pre-wrap">${data.message}</div>`
    : "";

  const churchLine = data.headerSubtitle
    ? `<p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.75);font-weight:500;text-transform:uppercase;letter-spacing:1px">${data.headerSubtitle}</p>`
    : "";

  const bulletinHeader = `<tr><td style="background:${colors.primary};padding:24px 28px;text-align:center">
<p style="margin:0;font-size:32px;line-height:1">⛪</p>
${churchLine}<p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">Weekly Bulletin</p>
<p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85);font-weight:500">${data.weekLabel}</p>
</td></tr>`;

  const content =
    bulletinHeader +
    contentRow(`${sections}${messageHtml}
${resourceLinksHtml(data.resourceLinks, colors)}`, colors) +
    footerRow(
      data.footerVerse || "Christ Church of India, San Ramon — CCISR Connect",
      colors
    );

  return wrapCard(content, colors);
}

// ---------- Generic / Custom Card ----------

export interface CustomCardData {
  title: string;
  subtitle?: string;
  emoji?: string;
  bannerImageUrl?: string;
  bodyHtml: string;
  footerText?: string;
  primaryColor?: string;
  colorScheme?: string;
  resourceLinks?: ResourceLink[];
}

export function buildCustomCard(data: CustomCardData): string {
  const colors = data.primaryColor
    ? deriveColorsFromPrimary(data.primaryColor)
    : EVENT_COLORS[data.colorScheme ?? "bulletin"] || EVENT_COLORS.bulletin;

  const header = data.bannerImageUrl
    ? `<tr><td style="padding:0;line-height:0"><img src="${data.bannerImageUrl}" alt="${data.title}" style="width:100%;display:block;border-radius:12px 12px 0 0" /></td></tr>
<tr><td style="background:${colors.primary};padding:12px 28px;text-align:center">
<p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">${data.title}</p>
${data.subtitle ? `<p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.85);font-weight:500">${data.subtitle}</p>` : ""}
</td></tr>`
    : headerRow(data.title, data.subtitle || "Christ Church of India, San Ramon", data.emoji || "📋", colors);

  const content =
    header +
    contentRow(`${data.bodyHtml}
${resourceLinksHtml(data.resourceLinks, colors)}`, colors) +
    footerRow(
      data.footerText || "Christ Church of India, San Ramon — CCISR Connect",
      colors
    );

  return wrapCard(content, colors);
}
