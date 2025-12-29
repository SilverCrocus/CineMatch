# Home Screen & Group Sessions Design

## Overview

Redesign the mobile home screen to focus on group sessions (the core social feature) while keeping Solo Mode and Friends accessible via the bottom tab bar. Implement full group session functionality with feature parity to the web app, plus a new pre-matches feature.

## Navigation Structure

| Tab | Icon | Purpose |
|-----|------|---------|
| Home | house | Group Sessions hub (Create/Join) |
| Discover | film | Solo Mode - personal movie swiping |
| Friends | people | Friend list & management |

## Home Screen

The home screen is dedicated to Group Sessions only. Solo Mode and Friends are accessible via tabs.

### Layout

- **Header**: User avatar, welcome message, sign out button
- **Hero Card**: "New Session" - primary CTA to create a group session
- **Join Card**: Code input field + Join button

No redundant navigation cards - the tab bar handles Solo and Friends.

## Group Session Flow

### Phase 1: Session Creation

Three methods (tabs) to create a session:

1. **Filters** - Select genres and year range
2. **URL** - Paste any movie list URL (AI extracts titles)
3. **List** - Type movie titles manually (one per line or comma-separated)

### Phase 2: Lobby

- Display 6-character room code (large, copyable)
- Show participants as they join (avatar + name)
- Poll every 3 seconds for updates
- Host sees "Start Swiping (X movies)" button
- Non-hosts see "Waiting for host..."

### Phase 3: Pre-matches (NEW)

Before swiping begins, check if participants have common movies on their solo watchlists.

**If matches found:**
- Show "You already have X movies in common!" message
- Display movie poster thumbnails
- "Continue to Swiping" button
- This is informational only - always proceeds to swiping

**If no matches:** Skip this screen entirely.

### Phase 4: Swiping

- Same swipe deck UI as solo mode
- Each participant swipes independently
- Poll every 3 seconds for completion status
- When user finishes: show waiting screen with participant completion checkmarks
- Auto-proceed to reveal when everyone is done

### Phase 5: Reveal

Two distinct sections:

1. **"Already on your lists"** - Pre-match movies from existing watchlists
2. **"New matches"** - Movies everyone liked during this session

**Behavior:**
- Host can tap any movie to select it as the group's choice (checkmark indicator)
- Shows poster, title, year, genres, rating for each movie
- If no matches at all: "No matches this time" message with option to return home
- "Back to Home" button at bottom

## Technical Decisions

### Real-time Updates

**Approach:** HTTP polling every 3 seconds (same as web)

**Rationale:**
- Sessions are short-lived (15-30 min)
- 3-second delay is acceptable for lobby joins and completion status
- No backend changes required - uses existing API
- Simpler than WebSockets, avoids connection recovery complexity on mobile

### API Endpoints (existing)

- `POST /api/sessions` - Create session
- `POST /api/sessions/join` - Join with code
- `GET /api/sessions/[id]` - Get session state (poll this)
- `POST /api/sessions/[id]/start` - Host starts session
- `POST /api/sessions/[id]/swipe` - Record swipe
- `POST /api/sessions/[id]/reveal` - Trigger/get reveal
- `POST /api/sessions/[id]/select` - Select final movie

### New API Endpoint Needed

- `GET /api/sessions/[id]/prematches` - Get common movies from participants' watchlists

## Screen Inventory

| Screen | Route | Description |
|--------|-------|-------------|
| Home | `/(tabs)/index` | Create/Join session UI |
| Create Session | `/session/create` | Filters/URL/List tabs |
| Session Lobby | `/session/[id]` | Code + participants |
| Pre-matches | `/session/[id]` | Common movies notice (conditional) |
| Swiping | `/session/[id]` | Swipe deck |
| Waiting | `/session/[id]` | Completion status |
| Reveal | `/session/[id]` | Match results |

Note: Lobby through Reveal are all handled by the same route with different UI states based on session status.

## Files to Create/Modify

### New Files
- `app/session/create.tsx` - Session creation screen
- `app/session/[id].tsx` - Session screen (handles all phases)
- `lib/sessions.ts` - Session API helpers

### Modified Files
- `app/(tabs)/index.tsx` - Redesign home screen
- `lib/api.ts` - Add session API methods
