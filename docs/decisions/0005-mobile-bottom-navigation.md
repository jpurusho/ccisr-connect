# 0005 — Bottom Tab Navigation for Mobile

**Status:** accepted  
**Date:** 2026-06-23

## Context

On mobile/tablet devices, the sidebar trigger was difficult to reach at the top of the screen, especially on large phones and iPads. Users accessing CCISR Connect as a home screen shortcut expected iOS-native navigation patterns (bottom tab bar).

The desktop sidebar remained the primary navigation, so any mobile solution needed to coexist with the sidebar without creating redundancy or confusion.

## Decision

Implement iOS-style bottom tab navigation visible only on mobile/tablet (`lg:` breakpoint hides it):

1. **Component** (`src/components/layout/bottom-nav.tsx`):
   - 5 tabs: Dashboard, Calendar, Members, Signups, More
   - "More" tab opens the full sidebar for access to Templates, Reports, Settings
   - Uses `useSidebar()` context to trigger sidebar toggle
   - Active state highlights current route
   - Touch-optimized with 64px tap targets

2. **Layout integration** (`src/app/(dashboard)/layout.tsx`):
   - Bottom nav sits above `.safe-bottom` spacer (respects iOS home indicator)
   - Content area gets `pb-20 lg:pb-6` to prevent overlap on mobile
   - Hidden on desktop (traditional sidebar navigation remains)

3. **Styling**:
   - Backdrop blur effect for modern iOS aesthetic
   - `active:scale-95` for tactile press feedback
   - Border-top separator from content

## Consequences

**Positive:**
- Thumb-friendly navigation on mobile devices
- Reduces reliance on hamburger menu for common actions
- Feels like a native iOS app when launched from home screen
- Desktop users unaffected (bottom nav hidden, sidebar unchanged)
- Easy to extend with more tabs if needed

**Negative:**
- Adds ~64px footer height on mobile (reduced screen space)
- 5 tabs is approaching comfortable limit for bottom nav density
- Secondary pages (Templates, Reports, Settings) require two taps (More → item)

**Alternatives considered:**
- Floating Action Button: Too minimal, doesn't reduce sidebar dependency
- Context-aware action bar: Complex to maintain, unclear affordances
- Full bottom nav with all pages: Too many tabs (8+) would be cramped

**Notes:**
- Tab selection chosen based on most-accessed pages from analytics (assumed Dashboard, Calendar, Members, Signups as top 4)
- Signups added explicitly per user request for quick mobile access
