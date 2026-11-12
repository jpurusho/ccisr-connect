# Dynamic Template System

## Overview

The dynamic template system eliminates the need for manual code changes when adding new email templates. Templates are controlled entirely through:
1. **Template Registry** - Code-based registration of template components and metadata
2. **Database Configuration** - Dashboard visibility and display order settings
3. **Templates Page UI** - User-friendly controls to manage template visibility

## Architecture

### Key Components

```
┌─────────────────────────────────────────────────────────┐
│                  Template Registry                       │
│  (src/lib/template-registry.ts)                         │
│  - Maps template types to form components               │
│  - Provides card builders and default values            │
│  - Central source of truth for template metadata        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Database Tables                        │
│  event_types:                                           │
│    - show_in_dashboard: boolean (visibility control)    │
│    - display_order: integer (sort order)                │
│    - icon_name: text (Lucide icon name)                 │
│    - card_color: text (hex color code)                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Dashboard Page                          │
│  (src/app/(dashboard)/dashboard/page.tsx)               │
│  - Queries event_types with visibility fields           │
│  - Looks up each template in registry                   │
│  - Dynamically generates BUILTIN_TEMPLATES array        │
│  - Renders only visible templates in sort order         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Templates Page UI                       │
│  (src/app/(dashboard)/templates/page.tsx)               │
│  - Dashboard Settings section on each template tab      │
│  - Toggle "Show in Dashboard" checkbox                  │
│  - Set "Display Order" number                           │
│  - Persists changes to event_types table                │
└─────────────────────────────────────────────────────────┘
```

## How to Add a New Template

### Step 1: Create Template Form Component

Create a form component in `src/components/templates/` or `src/components/dashboard/communication-edit-forms.tsx`:

```typescript
export interface MyTemplateFormData {
  field1: string
  field2: string
  // ... other fields
}

export function MyTemplateEditForm({ 
  data, 
  onChange 
}: {
  data: MyTemplateFormData
  onChange: (data: MyTemplateFormData) => void
}) {
  return (
    <div>
      <Input 
        value={data.field1} 
        onChange={(e) => onChange({ ...data, field1: e.target.value })} 
      />
      {/* ... other form fields */}
    </div>
  )
}
```

### Step 2: Create Card Builder

Add a card builder function in `src/lib/email/card-builder.ts`:

```typescript
export function buildMyTemplateCard(
  data: MyTemplateFormData, 
  style?: StyleContext
): string {
  const sc = style ?? buildStyleContext()
  // Build HTML email card
  return `<div>...</div>`
}
```

### Step 3: Add Default Values

Add defaults in `src/lib/template-defaults.ts`:

```typescript
export interface MyTemplateDefaults extends CommonCardFields {
  field1?: string
  field2?: string
}

export const FALLBACK_DEFAULTS: Record<string, TemplateDefaults> = {
  // ... existing templates
  my_template: {
    type: "my_template",
    data: {
      field1: "Default value",
      field2: "Another default",
    },
  },
}

export const SUBJECT_FALLBACKS: Record<string, string> = {
  // ... existing templates
  my_template: "My Template Subject — {{weekLabel}}",
}
```

### Step 4: Register in Template Registry

Add registration in `src/lib/template-registry.ts`:

```typescript
import { MyIcon } from "lucide-react"
import { MyTemplateEditForm } from "@/components/..."
import { buildMyTemplateCard } from "@/lib/email/card-builder"

templateRegistry.register({
  type: "my_template",
  label: "My Template",
  icon: MyIcon,
  color: "#FF6B6B",
  formComponent: MyTemplateEditForm as any,
  cardBuilder: buildMyTemplateCard,
  defaults: FALLBACK_DEFAULTS.my_template.data as Record<string, unknown>,
  subjectFallback: SUBJECT_FALLBACKS.my_template,
})
```

### Step 5: Add Database Migration

Create `supabase/migrations/XXXXX_add_my_template.sql`:

```sql
-- Insert event type
INSERT INTO event_types (name, comm_type, show_in_dashboard, display_order, icon_name, card_color)
VALUES ('My Template', 'my_template', true, 80, 'MyIcon', '#FF6B6B')
ON CONFLICT (comm_type) DO NOTHING;
```

### Step 6: Apply Migration

```bash
supabase db push
```

### Step 7: Verify

1. Restart dev server: `npm run dev`
2. Go to `/dashboard` - your template should appear
3. Go to `/templates` - your template should have a tab
4. Edit visibility settings and verify they work

## Benefits

### Before Dynamic System (Pre-v1.49.0)

Adding a new template required changes in **~15 files**:
- Hardcoded `CommType` union in `dashboard-types.ts`
- Hardcoded arrays in `dashboard/page.tsx`
- Hardcoded arrays in `templates/page.tsx`
- Multiple `Record<CommType, ...>` initializations
- Database migration
- Manual testing of every affected file

### Before Multi-Location System (v1.49.0 - v1.83.x)

Adding a new **location** for an existing template was impossible without duplicating the template type and all its code.

### After Dynamic System (v1.49.0+)

Adding a new template requires changes in **4 files + 1 migration**:
1. Template form component (new or existing file)
2. Card builder (add function to `card-builder.ts`)
3. Defaults (add to `template-defaults.ts`)
4. Registry (add registration in `template-registry.ts`)
5. Database migration (one INSERT statement)

**No dashboard code changes needed!**

### After Multi-Location System (v1.84.0+)

Adding a new **location** for an existing template requires **only a database INSERT**:
```sql
INSERT INTO event_types (name, template_type, is_primary, show_in_dashboard)
VALUES ('Mountain House Bible Study', 'bible_study', false, true);
```

**Zero code changes needed!** The dashboard automatically:
- Shows a new card for the location
- Uses the correct form component (from template registry)
- Maintains independent state per location
- Builds cards with the registered card builder

**Key architectural change:**
- Dashboard state keyed by `event_type.id` (numeric, unique per location)
- `template_type` identifies which template to use (e.g., "bible_study")
- Multiple locations = multiple event_types with same `template_type`

## Database Schema

### event_types table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| show_in_dashboard | boolean | true | Controls visibility on dashboard |
| display_order | integer | 0 | Sort order (lower = earlier) |
| icon_name | text | 'Calendar' | Lucide icon component name |
| card_color | text | '#4F46E5' | Hex color for card styling |

### Current Template Order

```sql
SELECT comm_type, display_order, icon_name, card_color 
FROM event_types 
WHERE show_in_dashboard = true 
ORDER BY display_order;
```

Expected result:
| comm_type | display_order | icon_name | card_color |
|-----------|---------------|-----------|------------|
| bulletin | 10 | Newspaper | #4F46E5 |
| birthday | 20 | Cake | #7C3AED |
| anniversary | 30 | Heart | #D97706 |
| bible_study | 40 | BookOpen | #0D9488 |
| womens_study | 50 | Users | #DB2777 |
| prayer_meeting | 60 | HandHelping | #059669 |
| shoebox_ministry | 70 | Gift | #DC2626 |

## Template Registry API

### TemplateConfig Interface

```typescript
interface TemplateConfig<TFormData = any> {
  type: string                 // Unique identifier (matches comm_type)
  label: string                // Display name
  icon: LucideIcon             // Icon component from lucide-react
  color: string                // Default hex color
  formComponent: ComponentType // React form component
  cardBuilder: Function        // HTML card builder function
  defaults: Record<string, unknown>  // Default form values
  subjectFallback: string      // Default email subject template
}
```

### Registry Methods

```typescript
// Register a new template
templateRegistry.register(config: TemplateConfig): void

// Get a template by type
templateRegistry.get(type: string): TemplateConfig | undefined

// Get all registered templates
templateRegistry.getAll(): TemplateConfig[]

// Get all template types
templateRegistry.getAllTypes(): string[]

// Check if a type is registered
templateRegistry.has(type: string): boolean
```

## UI Controls

### Templates Page - Dashboard Settings

Each template tab includes a "Dashboard Settings" section with:

1. **Show in Dashboard** - Toggle visibility
   - Checked: Template appears as a card on dashboard
   - Unchecked: Template hidden from dashboard

2. **Display Order** - Number input for sort order
   - Lower numbers appear first
   - Default: 0
   - Recommended: Use increments of 10 (10, 20, 30...) for easy reordering

Changes are saved when clicking "Save Defaults" button.

## Implementation Details

### Dashboard Loading Flow

1. **Query event_types** with visibility fields:
   ```typescript
   supabase
     .from("event_types")
     .select("id, name, comm_type, show_in_dashboard, display_order, icon_name, card_color")
   ```

2. **Filter visible templates**:
   ```typescript
   for (const et of eventTypesRes.data) {
     if (et.show_in_dashboard === false) continue
     const templateConfig = templateRegistry.get(et.comm_type)
     if (!templateConfig) continue
     visibleTemplates.push({ /* template data */ })
   }
   ```

3. **Sort by display_order**:
   ```typescript
   visibleTemplates.sort((a, b) => a.displayOrder - b.displayOrder)
   ```

4. **Generate BUILTIN_TEMPLATES**:
   ```typescript
   const BUILTIN_TEMPLATES = useMemo(() => loadedTemplates, [loadedTemplates])
   ```

### Templates Page Save Flow

1. **Update event_types** with dashboard settings:
   ```typescript
   supabase
     .from("event_types")
     .update({
       show_in_dashboard: dashSettings.showInDashboard,
       display_order: dashSettings.displayOrder,
       icon_name: dashSettings.iconName,
       card_color: dashSettings.cardColor,
     })
     .eq("id", etId)
   ```

2. **Update email_templates** with template content:
   ```typescript
   supabase
     .from("email_templates")
     .update({
       subject_template: subjectTmpl,
       body_template: bodyJson,
       style_settings: styleSettings[typeName],
     })
     .eq("id", existing.id)
   ```

## Migration History

| Migration | Purpose |
|-----------|---------|
| `00051_add_template_visibility_fields.sql` | Adds show_in_dashboard, display_order, icon_name, card_color columns to event_types and email_templates tables. Sets initial values for 7 built-in templates. |

## Future Enhancements

### Completed
- ✅ Dynamic template loading (v1.49.0)
- ✅ Database-driven visibility control (v1.49.0)
- ✅ UI for editing visibility settings (v1.49.0)
- ✅ Template registry pattern (v1.49.0)
- ✅ Documentation and test checklist (v1.49.0)
- ✅ Replace CommType union with TemplateType string (v1.84.0)
- ✅ Multi-location support with zero code changes (v1.84.0)
- ✅ ID-based dashboard state (v1.84.0)

### Potential Future Work
- ⏳ Icon picker UI in Templates page
- ⏳ Color picker UI in Templates page (already exists for card content)
- ⏳ Drag-and-drop reordering on dashboard
- ⏳ Template categories/groups
- ⏳ Template permissions (role-based visibility)
- ⏳ Location-specific template overrides (different defaults per location)

## Troubleshooting

### Template doesn't appear on dashboard

1. Check `show_in_dashboard` is `true` in database
2. Verify template is registered in `template-registry.ts`
3. Check `comm_type` matches between database and registry
4. Verify no console errors during dashboard load

### Template appears in wrong order

1. Check `display_order` value in database
2. Lower numbers appear first
3. Use consistent increments (10, 20, 30...) for clarity

### Changes don't persist after save

1. Check browser console for error messages
2. Verify database permissions allow updates
3. Check `handleSave` function completes without errors
4. Refresh page to verify data was saved to database

### TypeScript errors after adding template

1. Add type definitions to `template-defaults.ts`
2. Export form component types from form file
3. Update imports in `template-registry.ts`
4. Run `npm run build` to verify types are correct

## Related Files

- `/src/lib/template-registry.ts` - Template registration
- `/src/lib/template-defaults.ts` - Default values and types
- `/src/lib/email/card-builder.ts` - Card building functions
- `/src/app/(dashboard)/dashboard/page.tsx` - Dashboard loading
- `/src/app/(dashboard)/templates/page.tsx` - Templates UI
- `/src/components/dashboard/communication-edit-forms.tsx` - Form components
- `/supabase/migrations/00051_add_template_visibility_fields.sql` - Database schema

## See Also

- [Test Checklist](../DYNAMIC_TEMPLATES_TEST_CHECKLIST.md)
- [Memory: Templates are stateless](../../../.claude/projects/-Users-jpurshot-experimental-ccisr-connect/memory/feedback_templates_stateless.md)
- [Memory: No code duplication](../CLAUDE.md)
