export interface BibleStudyLocationDefault {
  label: string
  hostNames: string
  address: string
  city: string
  phone: string
  onVacation?: boolean
  vacationMessage?: string
}

export interface ResourceLinkDefault {
  label: string
  url: string
}

export interface BibleStudyDefaults {
  title?: string
  topic?: string
  time?: string
  message?: string
  footerVerse?: string
  primaryColor?: string
  resourceLinks?: ResourceLinkDefault[]
  locations?: BibleStudyLocationDefault[]
}

export interface WomensStudyDefaults {
  title?: string
  topic?: string
  time?: string
  zoomLink?: string
  zoomMeetingId?: string
  zoomPasscode?: string
  location?: string
  message?: string
  footerVerse?: string
  primaryColor?: string
  resourceLinks?: ResourceLinkDefault[]
}

export interface BirthdayDefaults {
  message?: string
  footerVerse?: string
  primaryColor?: string
  resourceLinks?: ResourceLinkDefault[]
}

export interface AnniversaryDefaults {
  message?: string
  footerVerse?: string
  primaryColor?: string
  resourceLinks?: ResourceLinkDefault[]
}

export interface BulletinDefaults {
  events?: { title: string; details: string }[]
  primaryColor?: string
  resourceLinks?: ResourceLinkDefault[]
}

export type TemplateDefaults =
  | { type: "birthday"; data: BirthdayDefaults }
  | { type: "anniversary"; data: AnniversaryDefaults }
  | { type: "friday_bible_study"; data: BibleStudyDefaults }
  | { type: "wednesday_womens_study"; data: WomensStudyDefaults }
  | { type: "bulletin"; data: BulletinDefaults }

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
  bulletin: "Weekly Bulletin — {{weekLabel}}",
}
