import { z } from "zod"

// ── Field Types ─────────────────────────────────────────────────────────────

export type SignupFieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "select"
  | "multi_select"
  | "claim_select"
  | "date"
  | "month_picker"
  | "number"
  | "checkbox"
  | "address"
  | "member_lookup"

// ── Field Config (discriminated union) ──────────────────────────────────────

interface BaseFieldConfig {
  id: string
  type: SignupFieldType
  label: string
  placeholder?: string
  required: boolean
  hidden?: boolean
  helpText?: string
  order: number
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: "text"
  minLength?: number
  maxLength?: number
}

export interface EmailFieldConfig extends BaseFieldConfig {
  type: "email"
}

export interface PhoneFieldConfig extends BaseFieldConfig {
  type: "phone"
}

export interface TextareaFieldConfig extends BaseFieldConfig {
  type: "textarea"
  maxLength?: number
  rows?: number
}

export interface SelectFieldConfig extends BaseFieldConfig {
  type: "select"
  options: { value: string; label: string; disabled?: boolean }[]
}

export interface MultiSelectFieldConfig extends BaseFieldConfig {
  type: "multi_select"
  options: { value: string; label: string }[]
  maxSelections?: number
}

export interface ClaimSelectFieldConfig extends BaseFieldConfig {
  type: "claim_select"
  options: { value: string; label: string; capacity: number }[]
  allowCustom: boolean
  maxSelections?: number
  allowCountSelection?: boolean
  allowCapacityIncrease?: boolean  // Let users increase item capacity beyond original count
}

export interface DateFieldConfig extends BaseFieldConfig {
  type: "date"
  minDate?: string
  maxDate?: string
}

export interface MonthPickerFieldConfig extends BaseFieldConfig {
  type: "month_picker"
  year?: number
  excludeMonths?: number[]
}

export interface NumberFieldConfig extends BaseFieldConfig {
  type: "number"
  min?: number
  max?: number
}

export interface CheckboxFieldConfig extends BaseFieldConfig {
  type: "checkbox"
  checkboxLabel?: string
}

export interface AddressFieldConfig extends BaseFieldConfig {
  type: "address"
}

export interface MemberLookupFieldConfig extends BaseFieldConfig {
  type: "member_lookup"
  autoFillFields?: string[]
}

export type SignupFieldConfig =
  | TextFieldConfig
  | EmailFieldConfig
  | PhoneFieldConfig
  | TextareaFieldConfig
  | SelectFieldConfig
  | MultiSelectFieldConfig
  | ClaimSelectFieldConfig
  | DateFieldConfig
  | MonthPickerFieldConfig
  | NumberFieldConfig
  | CheckboxFieldConfig
  | AddressFieldConfig
  | MemberLookupFieldConfig

// ── Field Type Metadata (for builder UI) ────────────────────────────────────

export interface FieldTypeMeta {
  type: SignupFieldType
  label: string
  icon: string
  description: string
}

export const FIELD_TYPE_META: FieldTypeMeta[] = [
  { type: "text", label: "Text", icon: "Type", description: "Short text input" },
  { type: "email", label: "Email", icon: "Mail", description: "Email address" },
  { type: "phone", label: "Phone", icon: "Phone", description: "Phone number" },
  { type: "textarea", label: "Long Text", icon: "AlignLeft", description: "Multi-line text" },
  { type: "select", label: "Dropdown", icon: "ChevronDown", description: "Single choice from options" },
  { type: "multi_select", label: "Multi-Select", icon: "CheckSquare", description: "Multiple choices" },
  { type: "claim_select", label: "Claim Items", icon: "ShoppingBag", description: "Items with capacity limits + custom" },
  { type: "date", label: "Date", icon: "Calendar", description: "Date picker" },
  { type: "month_picker", label: "Month", icon: "CalendarDays", description: "Pick a month" },
  { type: "number", label: "Number", icon: "Hash", description: "Numeric input" },
  { type: "checkbox", label: "Checkbox", icon: "CheckCircle", description: "Yes/No toggle" },
  { type: "address", label: "Address", icon: "MapPin", description: "Street, city, state, zip" },
  { type: "member_lookup", label: "Member Lookup", icon: "Users", description: "Auto-fill from member directory" },
]

// ── Zod Schema Builders ─────────────────────────────────────────────────────

const PHONE_REGEX = /^[\d\s\-().+]+$/
const MAX_TEXT = 1000

function fieldSchema(field: SignupFieldConfig): z.ZodTypeAny {
  switch (field.type) {
    case "text": {
      let s = z.string().max(field.maxLength ?? MAX_TEXT)
      if (field.minLength) s = s.min(field.minLength)
      return field.required ? s.min(1, `${field.label} is required`) : s
    }
    case "email":
      return field.required
        ? z.string().email("Invalid email address")
        : z.string().email("Invalid email address").or(z.literal(""))
    case "phone":
      return field.required
        ? z.string().regex(PHONE_REGEX, "Invalid phone number").min(7)
        : z.string().regex(PHONE_REGEX, "Invalid phone number").or(z.literal(""))
    case "textarea": {
      const s = z.string().max(field.maxLength ?? 2000)
      return field.required ? s.min(1, `${field.label} is required`) : s
    }
    case "select": {
      const validValues = field.options.filter((o) => !o.disabled).map((o) => o.value)
      const s = z.string().refine((v) => validValues.includes(v), { message: "Invalid selection" })
      return field.required ? s : s.or(z.literal(""))
    }
    case "multi_select": {
      const validValues = field.options.map((o) => o.value)
      let s = z.array(z.string().refine((v) => validValues.includes(v)))
      if (field.maxSelections) s = s.max(field.maxSelections)
      return field.required ? s.min(1, "Select at least one option") : s
    }
    case "claim_select": {
      if (field.allowCountSelection) {
        // Count format: { itemValue: count }
        const countSchema = z.record(z.string(), z.number().int().min(1))
        if (field.required) {
          return countSchema.refine((obj) => Object.keys(obj).length > 0, { message: "Select at least one item" })
        }
        return countSchema
      }
      let s = z.array(z.string().min(1))
      if (field.maxSelections) s = s.max(field.maxSelections)
      return field.required ? s.min(1, "Select at least one item") : s
    }
    case "date":
      return field.required
        ? z.string().min(1, `${field.label} is required`).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
        : z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").or(z.literal(""))
    case "month_picker": {
      const excluded = new Set(field.excludeMonths ?? [])
      return field.required
        ? z.number().int().min(1).max(12).refine((m) => !excluded.has(m), { message: "This month is not available" })
        : z.number().int().min(1).max(12).refine((m) => !excluded.has(m)).or(z.literal(0))
    }
    case "number": {
      let s = z.number()
      if (field.min !== undefined) s = s.min(field.min)
      if (field.max !== undefined) s = s.max(field.max)
      return field.required ? s : s.or(z.literal(0))
    }
    case "checkbox":
      return field.required ? z.literal(true, { message: `${field.label} must be checked` }) : z.boolean()
    case "address":
      return field.required
        ? z.object({
            street: z.string().min(1, "Street is required"),
            city: z.string().min(1, "City is required"),
            state: z.string().min(1, "State is required"),
            zip: z.string().min(1, "ZIP is required"),
          })
        : z.object({
            street: z.string(),
            city: z.string(),
            state: z.string(),
            zip: z.string(),
          })
    case "member_lookup":
      return field.required
        ? z.string().min(1, `${field.label} is required`)
        : z.string()
  }
}

export function buildFormSchema(fields: SignupFieldConfig[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const field of fields) {
    shape[field.id] = fieldSchema(field)
  }
  return z.object(shape)
}

// ── Default values per field type ───────────────────────────────────────────

export function getDefaultValue(field: SignupFieldConfig): unknown {
  switch (field.type) {
    case "text":
    case "email":
    case "phone":
    case "textarea":
    case "select":
    case "date":
    case "member_lookup":
      return ""
    case "multi_select":
      return []
    case "claim_select":
      return field.allowCountSelection ? {} : []
    case "month_picker":
    case "number":
      return 0
    case "checkbox":
      return false
    case "address":
      return { street: "", city: "", state: "", zip: "" }
  }
}

// ── Create a new field config with defaults ─────────────────────────────────

export function createFieldConfig(type: SignupFieldType, order: number): SignupFieldConfig {
  const base = {
    id: crypto.randomUUID(),
    label: FIELD_TYPE_META.find((m) => m.type === type)?.label ?? "Field",
    required: false,
    order,
  }

  switch (type) {
    case "text": return { ...base, type: "text" }
    case "email": return { ...base, type: "email", label: "Email" }
    case "phone": return { ...base, type: "phone", label: "Phone" }
    case "textarea": return { ...base, type: "textarea", label: "Details" }
    case "select": return { ...base, type: "select", label: "Selection", options: [{ value: "option1", label: "Option 1" }] }
    case "multi_select": return { ...base, type: "multi_select", label: "Choices", options: [{ value: "option1", label: "Option 1" }] }
    case "claim_select": return { ...base, type: "claim_select", label: "Bring an Item", options: [{ value: "item1", label: "Item 1", capacity: 2 }], allowCustom: true }
    case "date": return { ...base, type: "date", label: "Date" }
    case "month_picker": return { ...base, type: "month_picker", label: "Month" }
    case "number": return { ...base, type: "number", label: "Number" }
    case "checkbox": return { ...base, type: "checkbox", label: "Confirm" }
    case "address": return { ...base, type: "address", label: "Address" }
    case "member_lookup": return { ...base, type: "member_lookup", label: "Name" }
  }
}
