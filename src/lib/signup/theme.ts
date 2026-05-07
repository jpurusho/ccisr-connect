import { deriveColorsFromPrimary, type CardColors } from "@/lib/email/card-builder"

export interface SignupFormTheme {
  primaryColor?: string
  headerStyle?: "band" | "top-border" | "side-accent"
  fontFamily?: string
  emoji?: string
  headerTitle?: string
  headerSubtitle?: string
  verse?: string
  verseRef?: string
  verseBgColor?: string
}

export function getThemeColors(theme: SignupFormTheme): CardColors {
  return deriveColorsFromPrimary(theme.primaryColor || "#4F46E5")
}
