# Mobile App Web Parity Design

**Date:** 2025-12-28
**Goal:** Achieve full feature parity between the Cinematch mobile app and web app

## Overview

The mobile app currently has basic functionality but is missing many features from the web app. This design document outlines a phased approach to bring the mobile app to full parity.

## Phase Summary

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Swipe Card Parity | Pending |
| Phase 2 | Solo Mode Menu | Pending |
| Phase 3 | My List Improvements | Pending |
| Phase 4 | Home Dashboard | Pending |

---

## Phase 1: Swipe Card Parity

### Goal
Make the mobile swipe card match the web app's rich movie card with synopsis, ratings, and visual polish.

### Current State
- Basic poster image
- Title + year + TMDB rating (⭐ 0.0)
- No synopsis, no IMDB/RT scores
- No progress indicator

### Target State

```
┌─────────────────────────────┐
│         "2 saved"           │  ← Saved count header
│                             │
│  ┌─────────────────────┐   │
│  │  "Tap for synopsis" │   │  ← Hint pill (fades when expanded)
│  │                     │   │
│  │      POSTER         │   │
│  │                     │   │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │   │  ← Gradient overlay
│  │ Synopsis text here  │   │  ← Shows on tap
│  │ when expanded...    │   │
│  │                     │   │
│  │ Movie Title         │   │
│  │ 2024 • 120 min • Action │
│  │ [IMDB 7.5][🍅 85][🍿 90]│  ← Score badges
│  └─────────────────────┘   │
│                             │
│    (✕)          (♥)        │  ← Swipe buttons
│                             │
│         1 / 20             │  ← Progress counter
└─────────────────────────────┘
```

### Features to Add

1. **Synopsis with tap-to-expand**
   - Tap card to show/hide synopsis
   - Gradient overlay darkens when expanded
   - "Tap for synopsis" hint pill at top

2. **Score badges**
   - IMDB rating with link (yellow badge)
   - RT Critic score 🍅 (red badge)
   - RT Audience score 🍿 (orange badge)
   - Tapping badges opens respective website

3. **Movie metadata**
   - Runtime in minutes
   - Genres (first 2)
   - Year

4. **Progress tracking**
   - "X saved" counter in header
   - "1 / 20" progress at bottom

5. **Undo toast**
   - When dismissing, show toast with "Undo" button
   - 3-second timeout before disappearing

### Files to Modify

| File | Changes |
|------|---------|
| `components/MovieCard.tsx` | Add synopsis, scores, hint, gradient, tap handling |
| `components/SwipeDeck.tsx` | Add progress counter |
| `app/(tabs)/solo.tsx` | Add saved count header, undo toast |
| `types/index.ts` | Ensure Movie type has: synopsis, imdbId, imdbRating, rtCriticScore, rtAudienceScore, rtUrl, runtime, genres |
| `lib/api.ts` | Ensure API returns all movie fields |

### API Requirements

The `/api/solo/movies` endpoint must return:
```typescript
interface Movie {
  id: number;
  tmdbId: number;
  title: string;
  year: string;
  poster_path: string;
  synopsis: string;
  runtime: number;
  genres: string[];
  imdbId: string;
  imdbRating: string;
  rtCriticScore: string;
  rtAudienceScore: string;
  rtUrl: string;
}
```

---

## Phase 2: Solo Mode Menu

### Goal
Add discovery options before swiping (similar search, genre browse, surprise me).

### Current State
- Discover tab goes directly to random movie swiping
- No way to filter or search

### Target State

```
┌─────────────────────────────┐
│  ← Solo Mode                │
│                             │
│  ┌─────────────────────┐   │
│  │ 🔍  Similar to...   │   │
│  │     Find movies like│   │
│  │     one you love    │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ 🎬  By Genre        │   │
│  │     Browse by       │   │
│  │     category        │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ 🎲  Surprise Me     │   │
│  │     Random popular  │   │
│  │     movies          │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ 📋  My List         │   │
│  │     View saved      │   │
│  │     movies          │   │
│  └─────────────────────┘   │
│                             │
│  [Home] [Discover] [Friends]│
└─────────────────────────────┘
```

### Features to Add

1. **Similar to... search**
   - Text input for movie name
   - Navigates to swipe with `?source=similar&movie=X`

2. **By Genre browser**
   - Genre badge selector (multi-select)
   - Match mode toggle (Any genre / All genres)
   - Era presets (2020s, 2010s, 2000s, 90s, 80s & older, Custom)
   - Custom year range picker
   - "Start Swiping" button

3. **Surprise Me**
   - Direct navigation to swipe with `?source=random`

4. **My List shortcut**
   - Navigate to saved movies list

### Files to Create/Modify

| File | Changes |
|------|---------|
| `app/(tabs)/solo.tsx` | Convert to menu screen |
| `app/solo/swipe.tsx` | New file - move swipe logic here |
| `app/solo/genres.tsx` | New file - genre selection screen |
| `app/solo/_layout.tsx` | Update stack navigation |
| `lib/constants.ts` | Add GENRE_MAP from web app |

### Navigation Flow

```
(tabs)/solo.tsx (Menu)
    ├── "Similar to..." → Modal/Input → solo/swipe?source=similar&movie=X
    ├── "By Genre" → solo/genres.tsx → solo/swipe?source=browse&genres=1,2&match=any
    ├── "Surprise Me" → solo/swipe?source=random
    └── "My List" → solo/list.tsx
```

---

## Phase 3: My List Improvements

### Goal
Match web app's My List with tabs, scores, and restore functionality.

### Current State
- Basic list view
- No tabs
- No scores on cards
- No restore from dismissed

### Target State

```
┌─────────────────────────────┐
│  ← My List                  │
│                             │
│  [Saved (12)] [Dismissed (5)]│  ← Tab switcher
│                             │
│  ┌──────────┐ ┌──────────┐ │
│  │  POSTER  │ │  POSTER  │ │
│  │ ▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓ │ │
│  │ Title    │ │ Title    │ │
│  │ 2024     │ │ 2023     │ │
│  │⭐7.5 🍅85│ │⭐6.8 🍿72│ │
│  │ [Remove] │ │ [Remove] │ │
│  └──────────┘ └──────────┘ │
│                             │
│  [Home] [Discover] [Friends]│
└─────────────────────────────┘
```

### Features to Add

1. **Tab switcher**
   - "Saved (count)" tab
   - "Dismissed (count)" tab
   - Pill-style toggle

2. **Enhanced movie cards**
   - 2-column grid layout
   - Poster with gradient overlay
   - Title and year
   - Score badges (IMDB, RT Critic, RT Audience)
   - Tap poster to open IMDB

3. **Actions by tab**
   - Saved tab: "Remove" button
   - Dismissed tab: "Restore" + "Delete" buttons

4. **Empty states**
   - "Your list is empty" with "Start swiping" CTA
   - "No dismissed movies" message

### Files to Modify

| File | Changes |
|------|---------|
| `app/solo/list.tsx` | Add tabs, grid layout, scores, actions |
| `lib/api.ts` | Add `getDismissedMovies()`, `restoreMovie()`, `deleteDismissed()` |

### API Endpoints Required

```typescript
// Get dismissed movies
GET /api/solo/dismissed
Response: { dismissed: DismissedItem[] }

// Restore from dismissed to saved
POST /api/solo/dismissed/restore
Body: { movieId: number }

// Delete from dismissed
DELETE /api/solo/dismissed
Body: { movieId: number }
```

---

## Phase 4: Home Dashboard

### Goal
Transform Home tab from simple welcome to full dashboard with session features.

### Current State
- Just shows "Welcome, [user]!" text
- No session creation or joining

### Target State

```
┌─────────────────────────────┐
│                             │
│  (Avatar)  John Doe    [⚙] │
│           Welcome back!     │
│                             │
│  ┌─────────────────────────┐│
│  │  ✨ New Session         ││
│  │                         ││
│  │  Create a movie night   ││
│  │  and invite friends     ││
│  │                         ││
│  │  [  Create Session  ]   ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │  Join Session           ││
│  │  Enter a room code      ││
│  │  ┌──────────┐ [Join]    ││
│  │  │  CODE    │           ││
│  │  └──────────┘           ││
│  └─────────────────────────┘│
│                             │
│  ┌──────────┐ ┌──────────┐ │
│  │ 👥       │ │ ❤️        │ │
│  │ Friends  │ │ Solo Mode │ │
│  │ View all │ │ Watchlist │ │
│  └──────────┘ └──────────┘ │
│                             │
│  [Home] [Discover] [Friends]│
└─────────────────────────────┘
```

### Features to Add

1. **User header**
   - Avatar image
   - User name
   - "Welcome back!" subtitle
   - Logout/settings button

2. **Create Session card (hero)**
   - Prominent styling with glow effect
   - "Create Session" button
   - Navigates to session creation flow

3. **Join Session card**
   - 6-character code input (uppercase, monospace)
   - "Join" button
   - Error handling for invalid codes

4. **Quick access cards**
   - Friends card → Friends tab
   - Solo Mode card → Discover tab

### Files to Create/Modify

| File | Changes |
|------|---------|
| `app/(tabs)/index.tsx` | Complete redesign to dashboard layout |
| `app/session/create.tsx` | New screen for session creation |
| `app/session/[id].tsx` | Session room screen |
| `app/session/_layout.tsx` | Stack navigator for session flow |
| `components/ui/Card.tsx` | Reusable card component with variants |
| `components/ui/Avatar.tsx` | User avatar component |

### API Endpoints Required

```typescript
// Create new session
POST /api/sessions
Response: { sessionId: string, code: string }

// Join session by code
POST /api/sessions/join
Body: { code: string }
Response: { sessionId: string }

// Get session details
GET /api/sessions/[id]
Response: { session: Session }
```

---

## Implementation Order

1. **Phase 1** - Start here, most visible impact
2. **Phase 2** - Builds on Phase 1's swipe screen
3. **Phase 3** - Independent, can be done in parallel
4. **Phase 4** - Largest scope, do last

## Testing Checklist

### Phase 1
- [ ] Synopsis expands/collapses on tap
- [ ] All score badges display correctly
- [ ] Badge taps open correct URLs
- [ ] Progress counter updates
- [ ] Saved count updates on like
- [ ] Undo toast appears on dismiss
- [ ] Undo restores movie

### Phase 2
- [ ] Menu displays all 4 options
- [ ] Similar search works
- [ ] Genre selection allows multi-select
- [ ] Era presets filter correctly
- [ ] Custom year range works
- [ ] Surprise Me loads random movies

### Phase 3
- [ ] Tabs switch correctly
- [ ] Counts update in real-time
- [ ] Remove from saved works
- [ ] Restore from dismissed works
- [ ] Delete from dismissed works
- [ ] Poster tap opens IMDB

### Phase 4
- [ ] User info displays correctly
- [ ] Create session works
- [ ] Join with valid code works
- [ ] Join with invalid code shows error
- [ ] Quick access cards navigate correctly
- [ ] Logout works
