export type TemplateVars = Record<string, string>

export function interpolate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

// Interpolate only if template is non-empty; otherwise return undefined
export function interp(template: string | undefined, vars: TemplateVars): string | undefined {
  return template ? interpolate(template, vars) : undefined
}

// ── Var builders per template type ─────────────────────────────────────────

export function makeBirthdayVars(weekLabel: string, names: string[]): TemplateVars {
  return { weekLabel, date: weekLabel, names: names.join(", "), count: String(names.length) }
}

export function makeAnniversaryVars(weekLabel: string, couples: string[]): TemplateVars {
  return { weekLabel, date: weekLabel, couples: couples.join(", "), count: String(couples.length) }
}

// Shared by bible study and women's study (same var shape)
export function makeEventVars(weekLabel: string, date: string, time: string, topic: string): TemplateVars {
  return { weekLabel, date, time, topic }
}

export function makeBulletinVars(weekLabel: string, date: string): TemplateVars {
  return { weekLabel, date }
}
