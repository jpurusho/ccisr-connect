# 0004 — iOS Safe Area Support for PWA Mode

**Status:** accepted  
**Date:** 2026-06-23

## Context

When CCISR Connect is saved as a home screen shortcut on iPhone/iPad, the navigation trigger was obscured by the device notch/status bar, and content would extend behind the home indicator at the bottom. This made the app feel broken in standalone web app mode.

iOS provides `env(safe-area-inset-*)` CSS variables that expose the notch, status bar, and home indicator dimensions, but they only activate when `viewport-fit=cover` is set in the viewport meta tag.

## Decision

Implement comprehensive iOS safe area support across the application:

1. **Root layout** (`src/app/layout.tsx`):
   - Export `viewport` with `viewportFit: "cover"` to enable safe area CSS variables
   - Add Apple Web App meta tags for full-screen mode
   - Apply `.safe-area-insets` class to body for baseline padding

2. **Dashboard layout** (`src/app/(dashboard)/layout.tsx`):
   - Add `.safe-top` spacer above header (matches notch/status bar height)
   - Add `.safe-bottom` spacer below content (matches home indicator area)
   - Content area gets `overflow-auto` for proper scrolling between safe zones

3. **Public signup layout** (`src/app/signup/layout.tsx`):
   - Same top/bottom safe area bars for consistency
   - Ensures public forms have identical native app feel

4. **CSS utilities** (`src/app/globals.css`):
   - `.safe-top` / `.safe-bottom` classes use `env(safe-area-inset-*)` for dynamic height
   - Sidebar wrapper respects left and top insets for landscape orientation

## Consequences

**Positive:**
- Navigation controls remain accessible on all iOS devices with notches
- App feels native when launched from home screen
- Content frames properly with app-like top/bottom bars
- Adapts automatically to different device types (standard iPhone, notched iPhone, iPad)
- Zero hardcoded pixel values — responsive to actual device safe areas

**Negative:**
- Slightly less vertical space on notched devices due to safe area bars
- Desktop users see no change (safe area variables are 0px on desktop)

**Notes:**
- Safe area support is progressive enhancement — works on iOS 11.2+, degrades gracefully on older browsers
- Users must re-launch from home screen after deployment to see changes (web shortcuts don't need re-installation)
