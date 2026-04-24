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
<p style="margin:12px 0 0;font-size:10px;color:${colors.textLight};text-align:center">Christ Church of India, San Ramon &bull; CCISR Connect</p>
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
  weekLabel: string; // e.g., "April 27 – May 3"
  birthdays: BirthdayEntry[];
  message?: string;
}

export function buildBirthdayCard(data: BirthdayCardData): string {
  const colors = EVENT_COLORS.birthday;
  const message =
    data.message ||
    "Wishing you a blessed birthday filled with God's love, joy, and peace. May this new year bring wonderful blessings!";

  const personRows = data.birthdays
    .map(
      (b) =>
        `<tr>
<td style="padding:10px 16px;font-size:16px;font-weight:600;color:${colors.textDark};border-bottom:1px solid ${colors.border}">${b.name}</td>
<td style="padding:10px 16px;font-size:14px;color:${colors.accent};text-align:right;border-bottom:1px solid ${colors.border};font-weight:500">${b.date}</td>
</tr>`
    )
    .join("");

  const content =
    headerRow(
      data.birthdays.length === 1 ? "Happy Birthday!" : "Happy Birthday!",
      `Christ Church of India, San Ramon`,
      "🎂",
      colors
    ) +
    contentRow(
      `<p style="margin:0 0 4px;font-size:12px;color:${colors.textLight};text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Birthdays this week &bull; ${data.weekLabel}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bgLight};border-radius:8px;overflow:hidden;margin-top:8px">
${personRows}
</table>
<div style="margin:20px auto;width:60px;height:3px;background:${colors.border};border-radius:2px"></div>
<p style="margin:0;font-size:14px;color:${colors.textDark};text-align:center;line-height:1.6">${message}</p>`,
      colors
    ) +
    footerRow(
      '"The LORD bless you and keep you; the LORD make His face shine on you and be gracious to you." — Numbers 6:24-25',
      colors
    );

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
  weekLabel: string; // e.g., "April 27 – May 3"
  anniversaries: AnniversaryEntry[];
  message?: string;
}

export function buildAnniversaryCard(data: AnniversaryCardData): string {
  const colors = EVENT_COLORS.anniversary;
  const message =
    data.message ||
    "Congratulations on your wedding anniversary! May the Lord continue to bless your marriage with love, joy, and togetherness.";

  const coupleRows = data.anniversaries
    .map((a) => {
      const yearsText = a.years ? ` (${a.years} yrs)` : "";
      return `<tr>
<td style="padding:10px 16px;font-size:16px;font-weight:600;color:${colors.textDark};border-bottom:1px solid ${colors.border}">${a.husbandName} & ${a.wifeName}</td>
<td style="padding:10px 16px;font-size:14px;color:${colors.accent};text-align:right;border-bottom:1px solid ${colors.border};font-weight:500;white-space:nowrap">${a.date}${yearsText}</td>
</tr>`;
    })
    .join("");

  const content =
    headerRow(
      "Happy Anniversary!",
      `Christ Church of India, San Ramon`,
      "💍",
      colors
    ) +
    contentRow(
      `<p style="margin:0 0 4px;font-size:12px;color:${colors.textLight};text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Anniversaries this week &bull; ${data.weekLabel}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bgLight};border-radius:8px;overflow:hidden;margin-top:8px">
${coupleRows}
</table>
<div style="margin:20px auto;width:60px;height:3px;background:${colors.border};border-radius:2px"></div>
<p style="margin:0;font-size:14px;color:${colors.textDark};text-align:center;line-height:1.6">${message}</p>`,
      colors
    ) +
    footerRow(
      '"And over all these virtues put on love, which binds them all together in perfect unity." — Colossians 3:14',
      colors
    );

  return wrapCard(content, colors);
}

// ---------- Bible Study Invite ----------

export interface BibleStudyCardData {
  hostNames: string; // e.g., "Jerome & Sunitha"
  address: string;
  city?: string;
  phone?: string;
  date: string; // e.g., "Friday, May 2nd"
  time: string; // e.g., "7:30 PM"
  topic?: string;
  message?: string;
}

export function buildBibleStudyCard(data: BibleStudyCardData): string {
  const colors = EVENT_COLORS.friday_bible_study;
  const message =
    data.message || "We invite you to join our weekly Bible Study.";

  const detailRow = (label: string, value: string) =>
    `<tr>
<td style="padding:6px 0;font-size:12px;color:${colors.textLight};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;vertical-align:top;width:80px">${label}</td>
<td style="padding:6px 0 6px 12px;font-size:14px;color:${colors.textDark};font-weight:500">${value}</td>
</tr>`;

  let details = detailRow("When", `${data.date} at ${data.time}`);
  details += detailRow("Host", data.hostNames);
  details += detailRow("Where", data.address + (data.city ? `<br/>${data.city}` : ""));
  if (data.phone) details += detailRow("Contact", data.phone);
  if (data.topic) details += detailRow("Topic", data.topic);

  const content =
    headerRow(
      "Bible Study This Friday",
      "Christ Church of India, San Ramon",
      "📖",
      colors
    ) +
    contentRow(
      `<p style="margin:0 0 16px;font-size:14px;color:${colors.textDark};text-align:center;line-height:1.6">${message}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bgLight};border-radius:8px;padding:4px 16px">
${details}
</table>`,
      colors
    ) +
    footerRow(
      '"Your word is a lamp for my feet, a light on my path." — Psalm 119:105',
      colors
    );

  return wrapCard(content, colors);
}

// ---------- Women's Bible Study ----------

export interface WomensStudyCardData {
  topic: string;
  date: string; // e.g., "Wednesday, May 7th"
  time: string;
  zoomLink?: string;
  message?: string;
}

export function buildWomensStudyCard(data: WomensStudyCardData): string {
  const colors = EVENT_COLORS.wednesday_womens_study;
  const message =
    data.message || "Join us for our Women's Bible Study — all women welcome!";

  const detailRow = (label: string, value: string) =>
    `<tr>
<td style="padding:6px 0;font-size:12px;color:${colors.textLight};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;vertical-align:top;width:80px">${label}</td>
<td style="padding:6px 0 6px 12px;font-size:14px;color:${colors.textDark};font-weight:500">${value}</td>
</tr>`;

  let details = detailRow("When", `${data.date} at ${data.time}`);
  details += detailRow("Topic", data.topic);
  details += detailRow("Where", "Via Zoom");
  if (data.zoomLink) {
    details += detailRow(
      "Link",
      `<a href="${data.zoomLink}" style="color:${colors.primary};text-decoration:underline">Join Zoom Meeting</a>`
    );
  }

  const content =
    headerRow(
      "Women's Bible Study",
      "Christ Church of India, San Ramon",
      "🕊️",
      colors
    ) +
    contentRow(
      `<p style="margin:0 0 16px;font-size:14px;color:${colors.textDark};text-align:center;line-height:1.6">${message}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bgLight};border-radius:8px;padding:4px 16px">
${details}
</table>`,
      colors
    ) +
    footerRow(
      '"She is clothed with strength and dignity; she can laugh at the days to come." — Proverbs 31:25',
      colors
    );

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
}

export function buildPrayerMeetingCard(data: PrayerMeetingCardData): string {
  const colors = EVENT_COLORS.monthly_prayer;
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
      "Christ Church of India, San Ramon",
      "🙏",
      colors
    ) +
    contentRow(
      `<p style="margin:0 0 16px;font-size:14px;color:${colors.textDark};text-align:center;line-height:1.6">${message}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bgLight};border-radius:8px;padding:4px 16px">
${details}
</table>
${signupHtml}`,
      colors
    ) +
    footerRow(
      '"For where two or three gather in my name, there am I with them." — Matthew 18:20',
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
  weekLabel: string; // e.g., "Week of April 27 – May 3, 2026"
  birthdays: { name: string; date: string }[];
  anniversaries: { names: string; date: string }[];
  helpers: { role: string; name: string }[];
  events: { title: string; details: string }[];
  message?: string;
}

export function buildBulletinCard(data: BulletinCardData): string {
  const colors = EVENT_COLORS.bulletin;

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

  const content =
    headerRow("Weekly Bulletin", data.weekLabel, "⛪", colors) +
    contentRow(sections, colors) +
    footerRow(
      "Christ Church of India, San Ramon — CCISR Connect",
      colors
    );

  return wrapCard(content, colors);
}

// ---------- Generic / Custom Card ----------

export interface CustomCardData {
  title: string;
  subtitle: string;
  emoji: string;
  bodyHtml: string;
  footerText?: string;
  colorScheme: keyof typeof EVENT_COLORS;
}

export function buildCustomCard(data: CustomCardData): string {
  const colors = EVENT_COLORS[data.colorScheme] || EVENT_COLORS.bulletin;

  const content =
    headerRow(data.title, data.subtitle, data.emoji, colors) +
    contentRow(data.bodyHtml, colors) +
    footerRow(
      data.footerText || "Christ Church of India, San Ramon",
      colors
    );

  return wrapCard(content, colors);
}
