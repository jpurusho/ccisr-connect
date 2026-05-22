export interface LocationBreak {
  from: string
  to: string
  message: string
}

export interface BibleStudyLocationDefault {
  label: string
  hostNames: string
  address: string
  city: string
  phone: string
  onVacation?: boolean
  vacationMessage?: string
  breaks?: LocationBreak[]
}

export interface ResourceLinkDefault {
  label: string
  url: string
}

export interface CustomSectionDefault {
  title: string
  emoji: string
  color?: string
  entries: { label: string; name: string }[]
}

export interface CommonCardFields {
  message?: string
  messageBgColor?: string
  messageTextColor?: string
  headerTitle?: string
  headerTitleColor?: string
  headerSubtitle?: string
  headerSubtitleColor?: string
  headerEmoji?: string
  footerVerse?: string
  footerVerseBgColor?: string
  footerVerseTextColor?: string
  primaryColor?: string
  resourceLinks?: ResourceLinkDefault[]
  customSections?: CustomSectionDefault[]
  onBreak?: boolean
  breakMessage?: string
  breaks?: LocationBreak[]
}

export interface BibleStudyDefaults extends CommonCardFields {
  title?: string
  topic?: string
  time?: string
  locations?: BibleStudyLocationDefault[]
}

export interface WomensStudyDefaults extends CommonCardFields {
  title?: string
  topic?: string
  time?: string
  zoomLink?: string
  zoomMeetingId?: string
  zoomPasscode?: string
  location?: string
}

export interface BirthdayDefaults extends CommonCardFields {}

export interface AnniversaryDefaults extends CommonCardFields {}

export interface BulletinDefaults extends CommonCardFields {
  events?: { title: string; details: string }[]
}

export interface PrayerMeetingDefaults extends CommonCardFields {
  hostNames?: string
  address?: string
  city?: string
  phone?: string
  date?: string
  time?: string
  dinnerNote?: string
  signupLink?: string
}

/**
 * Extract common card fields from a defaults object with safe fallbacks.
 * Eliminates the `(def as Record<string, unknown>).field as string ?? ""` pattern.
 */
export function extractCommonFields(def: CommonCardFields): {
  message: string
  messageBgColor: string | undefined
  messageTextColor: string | undefined
  headerTitle: string
  headerTitleColor: string | undefined
  headerSubtitle: string
  headerSubtitleColor: string | undefined
  headerEmoji: string
  primaryColor: string
  footerVerse: string
  footerVerseBgColor: string | undefined
  footerVerseTextColor: string | undefined
  resourceLinks: ResourceLinkDefault[]
  customSections: CustomSectionDefault[]
} {
  return {
    message: def.message ?? "",
    messageBgColor: def.messageBgColor,
    messageTextColor: def.messageTextColor,
    headerTitle: def.headerTitle ?? "",
    headerTitleColor: def.headerTitleColor,
    headerSubtitle: def.headerSubtitle ?? "",
    headerSubtitleColor: def.headerSubtitleColor,
    headerEmoji: def.headerEmoji ?? "",
    primaryColor: def.primaryColor ?? "",
    footerVerse: def.footerVerse ?? "",
    footerVerseBgColor: def.footerVerseBgColor,
    footerVerseTextColor: def.footerVerseTextColor,
    resourceLinks: (def.resourceLinks ?? []) as ResourceLinkDefault[],
    customSections: (def.customSections ?? []) as CustomSectionDefault[],
  }
}

export type TemplateDefaults =
  | { type: "birthday"; data: BirthdayDefaults }
  | { type: "anniversary"; data: AnniversaryDefaults }
  | { type: "friday_bible_study"; data: BibleStudyDefaults }
  | { type: "wednesday_womens_study"; data: WomensStudyDefaults }
  | { type: "bulletin"; data: BulletinDefaults }
  | { type: "monthly_prayer"; data: PrayerMeetingDefaults }

export function parseBodyTemplate(eventTypeName: string, bodyJson: string): TemplateDefaults | null {
  try {
    const data = JSON.parse(bodyJson)
    switch (eventTypeName) {
      case "birthday":
        return { type: "birthday", data: data as BirthdayDefaults }
      case "anniversary":
        return { type: "anniversary", data: data as AnniversaryDefaults }
      case "friday_bible_study":
        return { type: "friday_bible_study", data: data as BibleStudyDefaults }
      case "wednesday_womens_study":
        return { type: "wednesday_womens_study", data: data as WomensStudyDefaults }
      case "bulletin":
        return { type: "bulletin", data: data as BulletinDefaults }
      case "monthly_prayer":
        return { type: "monthly_prayer", data: data as PrayerMeetingDefaults }
      default:
        return null
    }
  } catch {
    return null
  }
}

// Hardcoded fallbacks used when no saved template exists
export const FALLBACK_DEFAULTS: Record<string, TemplateDefaults> = {
  birthday: { type: "birthday", data: {} },
  anniversary: { type: "anniversary", data: {} },
  friday_bible_study: {
    type: "friday_bible_study",
    data: {
      title: "Bible Study This Friday",
      topic: "Studying the Book of Acts",
      time: "7:30 PM",
      locations: [
        { label: "San Ramon", hostNames: "TBD", address: "TBD", city: "", phone: "", onVacation: false, vacationMessage: "" },
        { label: "Mountain House", hostNames: "TBD", address: "TBD", city: "Mountain House, CA", phone: "", onVacation: false, vacationMessage: "" },
      ],
    },
  },
  wednesday_womens_study: {
    type: "wednesday_womens_study",
    data: {
      title: "Women's Bible Study",
      topic: "Building a Relationship with God",
      time: "7:00 PM",
    },
  },
  bulletin: {
    type: "bulletin",
    data: {
      events: [
        { title: "Women's Bible Study", details: "Building a Relationship with God — Wednesdays @ 7:00 PM via Zoom" },
        { title: "San Ramon Bible Study", details: "Studying the Book of Acts — Friday at 7:30 PM" },
      ],
    },
  },
}

export const SUBJECT_FALLBACKS: Record<string, string> = {
  birthday: "Happy Birthday! — Week of {{weekLabel}}",
  anniversary: "Happy Anniversary! — Week of {{weekLabel}}",
  friday_bible_study: "Bible Study This Friday — {{date}}",
  wednesday_womens_study: "Women's Bible Study This Wednesday",
  monthly_prayer: "Monthly Prayer Meeting — {{date}}",
  bulletin: "Weekly Bulletin — {{weekLabel}}",
}

export interface PlaceholderDef {
  token: string
  description: string
  example: string
}

export const TEMPLATE_PLACEHOLDERS: Record<string, PlaceholderDef[]> = {
  birthday: [
    { token: "{{weekLabel}}", description: "Week range", example: "Apr 26 – May 2" },
    { token: "{{names}}", description: "Birthday person names", example: "John, Mary" },
    { token: "{{count}}", description: "Number of birthdays", example: "2" },
  ],
  anniversary: [
    { token: "{{weekLabel}}", description: "Week range", example: "Apr 26 – May 2" },
    { token: "{{couples}}", description: "Couple names", example: "John & Mary" },
    { token: "{{count}}", description: "Number of anniversaries", example: "1" },
  ],
  friday_bible_study: [
    { token: "{{weekLabel}}", description: "Week range", example: "Apr 26 – May 2" },
    { token: "{{date}}", description: "Event date", example: "Friday, May 2nd" },
    { token: "{{time}}", description: "Start time", example: "7:30 PM" },
    { token: "{{topic}}", description: "Study topic", example: "Book of Acts" },
  ],
  wednesday_womens_study: [
    { token: "{{weekLabel}}", description: "Week range", example: "Apr 26 – May 2" },
    { token: "{{date}}", description: "Event date", example: "Wednesday, Apr 29th" },
    { token: "{{time}}", description: "Start time", example: "7:00 PM" },
    { token: "{{topic}}", description: "Study topic", example: "Building a Relationship with God" },
  ],
  monthly_prayer: [
    { token: "{{weekLabel}}", description: "Week range", example: "Apr 26 – May 2" },
    { token: "{{date}}", description: "Event date", example: "Saturday, May 3rd" },
    { token: "{{time}}", description: "Start time", example: "6:00 PM" },
  ],
  bulletin: [
    { token: "{{weekLabel}}", description: "Week range", example: "Apr 26 – May 2" },
    { token: "{{date}}", description: "Current date", example: "April 27, 2026" },
  ],
  custom: [
    { token: "{{weekLabel}}", description: "Week range", example: "Apr 26 – May 2" },
    { token: "{{date}}", description: "Current date", example: "April 27, 2026" },
  ],
}
