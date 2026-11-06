/**
 * Card & Template Types
 *
 * Shared types for email cards, templates, and their data structures.
 * Re-exports types from card-builder for consistency.
 */

// Import types used in this file
import type { TemplateStyleSettings } from "@/lib/email/card-builder"

// Re-export all card-related types from card-builder
export type {
  CardColors,
  FontFamily,
  FontSizeScale,
  HeaderStyle,
  SectionLayout,
  HeaderGradient,
  TemplateStyleSettings,
  StyleContext,
  BaseCardData,
  BirthdayEntry,
  BirthdayCardData,
  AnniversaryEntry,
  AnniversaryCardData,
  BibleStudyCardData,
  WomensStudyCardData,
  PrayerMeetingCardData,
  BulletinCardData,
  CustomCardData,
  GenericEventCardData,
  ResourceLink,
  CardCustomSection,
  CardFlyerSection,
} from "@/lib/email/card-builder"

// ── Template Types ──────────────────────────────────────────────────────────

export type TemplateType =
  | "birthday"
  | "anniversary"
  | "bible_study"
  | "womens_study"
  | "prayer_meeting"
  | "bulletin"
  | "custom"

export interface BaseTemplate {
  id: string
  name: string
  type: TemplateType
  subject_template: string
  style_settings?: TemplateStyleSettings
  created_at: string
  updated_at: string
}

export interface BirthdayTemplate extends BaseTemplate {
  type: "birthday"
}

export interface AnniversaryTemplate extends BaseTemplate {
  type: "anniversary"
}

export interface BibleStudyTemplate extends BaseTemplate {
  type: "bible_study"
  default_topic?: string
  default_time?: string
}

export interface WomensStudyTemplate extends BaseTemplate {
  type: "womens_study"
  default_topic?: string
  default_time?: string
}

export interface PrayerMeetingTemplate extends BaseTemplate {
  type: "prayer_meeting"
  default_time?: string
  default_dinner_note?: string
}

export interface BulletinTemplate extends BaseTemplate {
  type: "bulletin"
}

export interface CustomTemplate extends BaseTemplate {
  type: "custom"
  sections: TemplateSection[]
}

// ── Custom Template Section Types ───────────────────────────────────────────

export type SectionType =
  | "heading"
  | "text"
  | "list"
  | "table"
  | "divider"
  | "button"
  | "image"
  | "verse"

export interface BaseSection {
  id: string
  type: SectionType
  order: number
}

export interface HeadingSection extends BaseSection {
  type: "heading"
  text: string
  level?: 1 | 2 | 3
}

export interface TextSection extends BaseSection {
  type: "text"
  content: string
}

export interface ListSection extends BaseSection {
  type: "list"
  items: string[]
  ordered?: boolean
}

export interface TableSection extends BaseSection {
  type: "table"
  headers: string[]
  rows: string[][]
}

export interface DividerSection extends BaseSection {
  type: "divider"
}

export interface ButtonSection extends BaseSection {
  type: "button"
  text: string
  url: string
}

export interface ImageSection extends BaseSection {
  type: "image"
  url: string
  alt?: string
}

export interface VerseSection extends BaseSection {
  type: "verse"
  reference: string
  text?: string
}

export type TemplateSection =
  | HeadingSection
  | TextSection
  | ListSection
  | TableSection
  | DividerSection
  | ButtonSection
  | ImageSection
  | VerseSection

// ── Card Builder Function Types ─────────────────────────────────────────────

export type CardBuilderFunction<T> = (data: T) => string
