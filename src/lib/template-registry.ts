/**
 * Template Registry
 *
 * Central registry for all email templates in the system.
 * Templates register themselves here with their form components, card builders, and metadata.
 * This eliminates the need for hardcoded arrays and switch statements throughout the codebase.
 */

import type { ComponentType } from "react"
import type { LucideIcon } from "lucide-react"
import type { StyleContext } from "@/lib/email/card-builder"
import {
  Cake,
  Heart,
  BookOpen,
  Users,
  HandHelping,
  Newspaper,
  Gift,
} from "lucide-react"

// Import form components
import {
  BirthdayEditForm,
  AnniversaryEditForm,
  BibleStudyEditForm,
  WomensStudyEditForm,
  PrayerMeetingEditForm,
  BulletinEditForm,
  ShoeboxMinistryEditForm,
  type BirthdayFormData,
  type AnniversaryFormData,
  type BibleStudyFormData,
  type WomensStudyFormData,
  type PrayerMeetingFormData,
  type BulletinFormData,
  type ShoeboxMinistryFormData,
} from "@/components/dashboard/communication-edit-forms"

// Import card builders
import {
  buildBirthdayCard,
  buildAnniversaryCard,
  buildBibleStudyCard,
  buildWomensStudyCard,
  buildPrayerMeetingCard,
  buildBulletinCard,
  buildShoeboxMinistryCard,
} from "@/lib/email/card-builder"

// Import defaults
import { FALLBACK_DEFAULTS, SUBJECT_FALLBACKS } from "@/lib/template-defaults"

export interface TemplateConfig<TFormData = any> {
  type: string
  label: string
  icon: LucideIcon
  color: string
  formComponent: ComponentType<{
    data: TFormData
    onChange: (data: TFormData) => void
    [key: string]: any
  }>
  cardBuilder: (data: any, style?: StyleContext) => string
  defaults: Record<string, unknown>
  subjectFallback: string
}

class TemplateRegistry {
  private registry = new Map<string, TemplateConfig>()

  register(config: TemplateConfig): void {
    this.registry.set(config.type, config)
  }

  get(type: string): TemplateConfig | undefined {
    return this.registry.get(type)
  }

  getAll(): TemplateConfig[] {
    return Array.from(this.registry.values())
  }

  getAllTypes(): string[] {
    return Array.from(this.registry.keys())
  }

  has(type: string): boolean {
    return this.registry.has(type)
  }
}

// Singleton instance
export const templateRegistry = new TemplateRegistry()

// Register all built-in templates
templateRegistry.register({
  type: "birthday",
  label: "Birthdays",
  icon: Cake,
  color: "#7C3AED",
  formComponent: BirthdayEditForm as any,
  cardBuilder: buildBirthdayCard,
  defaults: FALLBACK_DEFAULTS.birthday.data as Record<string, unknown>,
  subjectFallback: SUBJECT_FALLBACKS.birthday,
})

templateRegistry.register({
  type: "anniversary",
  label: "Anniversaries",
  icon: Heart,
  color: "#D97706",
  formComponent: AnniversaryEditForm as any,
  cardBuilder: buildAnniversaryCard,
  defaults: FALLBACK_DEFAULTS.anniversary.data as Record<string, unknown>,
  subjectFallback: SUBJECT_FALLBACKS.anniversary,
})

templateRegistry.register({
  type: "bible_study",
  label: "Bible Study",
  icon: BookOpen,
  color: "#0D9488",
  formComponent: BibleStudyEditForm as any,
  cardBuilder: buildBibleStudyCard,
  defaults: FALLBACK_DEFAULTS.bible_study.data as Record<string, unknown>,
  subjectFallback: SUBJECT_FALLBACKS.bible_study,
})

templateRegistry.register({
  type: "womens_study",
  label: "Women's Study",
  icon: Users,
  color: "#DB2777",
  formComponent: WomensStudyEditForm as any,
  cardBuilder: buildWomensStudyCard,
  defaults: FALLBACK_DEFAULTS.womens_study.data as Record<string, unknown>,
  subjectFallback: SUBJECT_FALLBACKS.womens_study,
})

templateRegistry.register({
  type: "prayer_meeting",
  label: "Prayer Meeting",
  icon: HandHelping,
  color: "#059669",
  formComponent: PrayerMeetingEditForm as any,
  cardBuilder: buildPrayerMeetingCard,
  defaults: FALLBACK_DEFAULTS.prayer_meeting.data as Record<string, unknown>,
  subjectFallback: SUBJECT_FALLBACKS.prayer_meeting,
})

templateRegistry.register({
  type: "bulletin",
  label: "Weekly Bulletin",
  icon: Newspaper,
  color: "#4F46E5",
  formComponent: BulletinEditForm as any,
  cardBuilder: buildBulletinCard,
  defaults: FALLBACK_DEFAULTS.bulletin.data as Record<string, unknown>,
  subjectFallback: SUBJECT_FALLBACKS.bulletin,
})

templateRegistry.register({
  type: "shoebox_ministry",
  label: "Shoebox Ministry",
  icon: Gift,
  color: "#DC2626",
  formComponent: ShoeboxMinistryEditForm as any,
  cardBuilder: buildShoeboxMinistryCard,
  defaults: FALLBACK_DEFAULTS.shoebox_ministry.data as Record<string, unknown>,
  subjectFallback: SUBJECT_FALLBACKS.shoebox_ministry,
})

// Helper functions
export function getTemplate(type: string): TemplateConfig | undefined {
  return templateRegistry.get(type)
}

export function getAllTemplates(): TemplateConfig[] {
  return templateRegistry.getAll()
}

export function isValidTemplateType(type: string): boolean {
  return templateRegistry.has(type)
}
