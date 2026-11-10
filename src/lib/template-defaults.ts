export interface LocationBreak {
  from: string
  to: string
  message: string
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
  // Optional location fields — available on all event types
  locationName?: string
  hostNames?: string
  address?: string
  city?: string
  phone?: string
}

export interface BibleStudyDefaults extends CommonCardFields {
  title?: string
  topic?: string
  time?: string
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
  date?: string
  time?: string
  dinnerNote?: string
  signupLink?: string
}

export interface ShoeboxMinistryDefaults extends CommonCardFields {
  dueDate?: string
  onlineLink?: string
  pdfPath?: string
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
  | { type: "bible_study"; data: BibleStudyDefaults }
  | { type: "womens_study"; data: WomensStudyDefaults }
  | { type: "bulletin"; data: BulletinDefaults }
  | { type: "prayer_meeting"; data: PrayerMeetingDefaults }
  | { type: "shoebox_ministry"; data: ShoeboxMinistryDefaults }

export function parseBodyTemplate(eventTypeName: string, bodyJson: string): TemplateDefaults | null {
  try {
    const data = JSON.parse(bodyJson)
    switch (eventTypeName) {
      case "birthday":
        return { type: "birthday", data: data as BirthdayDefaults }
      case "anniversary":
        return { type: "anniversary", data: data as AnniversaryDefaults }
      case "bible_study":
        return { type: "bible_study", data: data as BibleStudyDefaults }
      case "womens_study":
        return { type: "womens_study", data: data as WomensStudyDefaults }
      case "bulletin":
        return { type: "bulletin", data: data as BulletinDefaults }
      case "prayer_meeting":
        return { type: "prayer_meeting", data: data as PrayerMeetingDefaults }
      case "shoebox_ministry":
        return { type: "shoebox_ministry", data: data as ShoeboxMinistryDefaults }
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
  bible_study: {
    type: "bible_study",
    data: {
      title: "Bible Study This Friday",
      topic: "Studying the Book of Acts",
      time: "7:30 PM",
      hostNames: "TBD",
      address: "TBD",
      city: "",
      phone: "",
    },
  },
  womens_study: {
    type: "womens_study",
    data: {
      title: "Women's Bible Study",
      topic: "Building a Relationship with God",
      time: "7:00 PM",
    },
  },
  bulletin: {
    type: "bulletin",
    data: {
      events: [],
    },
  },
  shoebox_ministry: {
    type: "shoebox_ministry",
    data: {
      dueDate: "Sunday, November 15th",
      onlineLink: "https://build-a-shoebox.samaritanspurse.org/view/3e945c78-8c3d-4d1d-99fc-62883ef061f1",
      pdfPath: "/Users/jpurshot/Downloads/2026-Gift-Suggestions.pdf",
      primaryColor: "#dc2626",
      headerEmoji: "🎁",
      messageBgColor: "#FFE4E4",
      message: "🎄 It's time for Operation Christmas Child! Our packed shoeboxes bring joy and the Gospel to children around the world.\n\nPacked boxes are due in church this Sunday. If you haven't packed one yet, you can still participate using the online builder!",
    },
  },
}

export const SUBJECT_FALLBACKS: Record<string, string> = {
  birthday: "Happy Birthday! — Week of {{weekLabel}}",
  anniversary: "Happy Anniversary! — Week of {{weekLabel}}",
  bible_study: "Bible Study This Friday — {{date}}",
  womens_study: "Women's Bible Study This Wednesday",
  prayer_meeting: "Monthly Prayer Meeting — {{date}}",
  bulletin: "Weekly Bulletin — {{weekLabel}}",
  shoebox_ministry: "Operation Christmas Child — Shoebox Ministry",
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
  bible_study: [
    { token: "{{weekLabel}}", description: "Week range", example: "Apr 26 – May 2" },
    { token: "{{date}}", description: "Event date", example: "Friday, May 2nd" },
    { token: "{{time}}", description: "Start time", example: "7:30 PM" },
    { token: "{{topic}}", description: "Study topic", example: "Book of Acts" },
  ],
  womens_study: [
    { token: "{{weekLabel}}", description: "Week range", example: "Apr 26 – May 2" },
    { token: "{{date}}", description: "Event date", example: "Wednesday, Apr 29th" },
    { token: "{{time}}", description: "Start time", example: "7:00 PM" },
    { token: "{{topic}}", description: "Study topic", example: "Building a Relationship with God" },
  ],
  prayer_meeting: [
    { token: "{{weekLabel}}", description: "Week range", example: "Apr 26 – May 2" },
    { token: "{{date}}", description: "Event date", example: "Saturday, May 3rd" },
    { token: "{{time}}", description: "Start time", example: "6:00 PM" },
  ],
  bulletin: [
    { token: "{{weekLabel}}", description: "Week range", example: "Apr 26 – May 2" },
    { token: "{{date}}", description: "Current date", example: "April 27, 2026" },
  ],
  shoebox_ministry: [
    { token: "{{weekLabel}}", description: "Week range", example: "Nov 9 – Nov 15" },
    { token: "{{date}}", description: "Due date", example: "Sunday, November 15th" },
  ],
  custom: [
    { token: "{{weekLabel}}", description: "Week range", example: "Apr 26 – May 2" },
    { token: "{{date}}", description: "Current date", example: "April 27, 2026" },
  ],
}
