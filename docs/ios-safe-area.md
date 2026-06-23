# iOS Safe Area Support

## Overview
Added native iOS-like safe area handling for when CCISR Connect is saved as a home screen shortcut on iPhone/iPad devices.

## Changes Made

### 1. Root Layout (`src/app/layout.tsx`)
- **Viewport configuration**: Set `viewportFit: "cover"` to enable safe area insets
- **Apple Web App meta tags**: Enable full-screen web app mode
- **Safe area body class**: Applied padding that respects iOS notch/status bar

### 2. Dashboard Layout (`src/app/(dashboard)/layout.tsx`)
- **Top safe area bar**: Added spacer div that matches notch/status bar height
- **Bottom safe area bar**: Added spacer div for home indicator area
- **Proper scrolling**: Content area now has `overflow-auto` for smooth scrolling

### 3. Global CSS (`src/app/globals.css`)
- **Safe area utilities**: CSS classes using `env(safe-area-inset-*)` variables
- **Sidebar safe areas**: Sidebar wrapper respects left and top insets

## How It Works

### CSS Environment Variables
iOS provides these CSS variables when `viewport-fit=cover` is set:
- `env(safe-area-inset-top)` - Status bar/notch height
- `env(safe-area-inset-right)` - Right edge (landscape notch)
- `env(safe-area-inset-bottom)` - Home indicator area
- `env(safe-area-inset-left)` - Left edge (landscape notch)

### Classes Added
- `.safe-area-insets` - Applies all safe area paddings
- `.safe-top` - Top bar matching notch/status height
- `.safe-bottom` - Bottom bar matching home indicator height

## Bottom Navigation Bar
Added iOS-style bottom tab bar for mobile devices (hidden on desktop):

### Features
- **4 quick-access tabs**: Dashboard, Calendar, Members, More
- **More button**: Opens full sidebar for access to Templates, Signups, Reports, Settings
- **Active state indicators**: Highlighted icon and text for current page
- **Touch-optimized**: Large tap targets (60px wide) with active press feedback
- **Auto-hiding**: Only visible on mobile/tablet (lg: breakpoint hides it)

### Implementation (`src/components/layout/bottom-nav.tsx`)
- Uses sidebar context to toggle full menu
- Pathname-aware active states
- Backdrop blur effect for modern iOS feel
- Respects safe area at bottom

## Result
When users add CCISR Connect to their home screen:
- ✅ Navigation trigger is not obscured by iPhone notch
- ✅ Content doesn't hide behind status bar
- ✅ Bottom tab bar for quick navigation between main sections
- ✅ Bottom content doesn't overlap home indicator
- ✅ App feels like a native iOS application
- ✅ Works on both iPhone and iPad
- ✅ Desktop users see traditional sidebar (no bottom nav)

## Testing
Best tested by:
1. Opening app in Safari on iOS device
2. Using "Add to Home Screen"
3. Opening from home screen icon
4. Verify navigation menu is fully accessible
5. Test on devices with notch (iPhone X and newer)
