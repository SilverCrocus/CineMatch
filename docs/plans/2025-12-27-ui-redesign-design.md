# Cinematch UI/UX Redesign

## Overview

A comprehensive UI/UX overhaul to make Cinematch visually distinctive, premium-feeling, and more usable. The redesign targets mobile-first usage while maintaining a cinematic, Netflix-quality aesthetic.

## Design Direction

**Visual Style:** Cinematic Bento — combining modern bento grid layouts with movie theater aesthetics.

**Goals:**
1. Stand out visually — memorable, screenshot-worthy
2. Feel premium — Netflix/Letterboxd quality polish
3. Improve usability — clearer interactions, smoother flows

## Color Palette: Midnight Premium

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-deep` | `#0a0e1a` | Page backgrounds |
| `--bg-card` | `#131927` | Card backgrounds |
| `--bg-card-hover` | `#1a2236` | Card hover states |
| `--bg-elevated` | `#1e2640` | Elevated surfaces |
| `--border-subtle` | `rgba(148, 163, 194, 0.12)` | Subtle separators |
| `--text-primary` | `#f0f2f7` | Primary text |
| `--text-secondary` | `#94a3c2` | Secondary text |
| `--text-muted` | `#5a6a8a` | Muted/hint text |
| `--accent-silver` | `#c4cee4` | Accent color, buttons |
| `--accent-glow` | `rgba(196, 206, 228, 0.15)` | Glow effects, highlights |

## Typography

**System:** Bold Display

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Headings | Syne | 700-800 | 1.5-3rem |
| Body | Outfit | 400-500 | 0.9-1rem |
| Buttons | Syne | 600-700 | 0.9-1rem |
| Labels | Outfit | 500 | 0.75rem |
| Mono/Code | Space Mono | 400 | 0.85rem |

## Logo

- Location: `/public/logo.png`
- Style: Silver/chrome metallic wordmark with film strip integrated into the "M"
- Usage: Login screen, app header, splash screen

## Component Specifications

### Dashboard Layout: Mixed Hierarchy

- Large hero card for primary action (Create Session)
- Smaller tile cards for secondary actions (Join, Friends, History)
- Grid: 2 columns for tiles
- Gap: 16px between cards

### Card Style: Borderless with Depth

- No visible borders
- Background gradient: `linear-gradient(145deg, var(--bg-card) 0%, #101625 100%)`
- Shadow layers:
  - `0 4px 12px rgba(0, 0, 0, 0.3)`
  - `0 1px 3px rgba(0, 0, 0, 0.2)`
  - `inset 0 1px 0 rgba(255, 255, 255, 0.03)`
- Hover: lift 4px, increase shadow intensity
- Border radius: 16px standard, 20-24px for hero cards

### Swipe Cards: Glass Overlay

- Movie poster fills entire card
- Frosted glass panel at bottom with movie info
- Glass properties:
  - `background: rgba(10, 14, 26, 0.75)`
  - `backdrop-filter: blur(20px)`
  - `border-top: 1px solid rgba(255, 255, 255, 0.08)`
- Panel slides up slightly on interaction
- Card border radius: 24px
- Shadow: `0 24px 48px rgba(0, 0, 0, 0.5)`

### Buttons

**Primary:**
- Background: `var(--accent-silver)`
- Text: `var(--bg-deep)`
- Border radius: 12px
- Padding: 16px 32px
- Shadow: `0 4px 16px rgba(196, 206, 228, 0.25)`
- Font: Syne 600

**Secondary:**
- Background: `var(--bg-elevated)`
- Text: `var(--text-primary)`
- No shadow

## Motion & Interactions

**Philosophy:** Cinematic Moments — keep daily interactions snappy and performant, but make key moments theatrical.

### Standard Interactions (Snappy)
- Tap feedback: quick scale to 0.98, spring back
- Page transitions: 200-250ms ease-out
- Card lifts: 250ms cubic-bezier

### Theatrical Moments
- **Match reveal:** Staggered card animations, scale + fade entrance, delay between each match (100ms)
- **Session start:** Cinematic fade transition, movie countdown vibe
- **Swipe completion:** Satisfying confirmation animation
- **Lobby join:** Participant avatars animate in with spring physics

### Mobile Considerations
- No hover states (touch only)
- Tap targets minimum 44px
- Gestures: swipe for cards, pull-to-refresh where appropriate
- 60fps target for all animations
- Reduce motion for accessibility preference

## Screen-by-Screen Specifications

### Login Screen
- Centered layout
- Logo with subtle radial glow behind it
- Tagline: "Find movies together"
- Google sign-in button (primary style)
- Terms text (muted)
- Background: subtle radial gradient from center

### Dashboard
- Header: Avatar + name + logout icon
- Hero card: Create Session with prominent CTA
- 2x2 grid: Join, Friends, History, (optional: Settings)
- Join has inline code input

### Session Lobby
- Large room code display (monospace, tracking-widest)
- Copy button with checkmark feedback
- Participant avatars in horizontal scroll/wrap
- Host gets "Start Swiping" CTA
- Non-host sees "Waiting for host..." state

### Swipe Interface
- Full-screen card stack
- Glass overlay with movie info
- Like/Nope indicators on drag
- Progress indicator (subtle)
- Swipe physics: elastic drag, snap threshold at 100px

### Match Reveal
- Theatrical entrance animation
- "You matched!" or "No matches" heading
- Matched movies in card list
- Selectable cards with ring highlight
- Back to dashboard CTA

## Files to Modify

1. `app/globals.css` — new color palette and theme variables
2. `app/login/page.tsx` — new login design with logo
3. `app/(app)/dashboard/page.tsx` — bento layout redesign
4. `app/(app)/session/[id]/page.tsx` — lobby and reveal redesign
5. `components/swipe/swipe-card.tsx` — glass overlay style
6. `components/ui/button.tsx` — new button variants
7. `components/ui/card.tsx` — borderless depth style
8. `app/layout.tsx` — add Syne + Outfit fonts

## New Components Needed

1. `components/ui/logo.tsx` — Logo component with optional glow
2. `components/ui/glass-panel.tsx` — Reusable glass overlay
3. `components/motion/theatrical-reveal.tsx` — Match reveal animation wrapper

## Assets

- `/public/logo.png` — Main wordmark logo
- Consider: app icon variant (just the film-strip M)

## Accessibility

- Maintain WCAG AA contrast ratios
- Respect `prefers-reduced-motion`
- Touch targets 44px minimum
- Focus states visible and clear
- Screen reader labels for icon-only buttons
