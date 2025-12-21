# Cinematch - Design Document

## Overview

Cinematch is a mobile-friendly web app where groups of friends swipe on movies (Tinder-style) to find one everyone agrees to watch. It solves the "what should we watch?" problem by making the decision democratic, fast, and fun.

## Core User Flow

1. **Create Session** - User opens Cinematch, taps "New Session"
2. **Build the Deck** - Host populates movies via:
   - TMDB filters (genre, year, streaming services)
   - URL import (RT, Letterboxd, ListChallenges, IMDb lists)
   - Pasted text list of movie titles
3. **Invite Friends** - Share link, room code, or invite from friends list
4. **Everyone Swipes** - Same deck of ~20-30 movies. Swipe right = yes, left = no
5. **Reveal** - Once everyone finishes, show all mutual matches
6. **Pick One** - Group discusses, someone selects the movie they're watching. Saves to history.

## Key Features

### Session Creation
- **TMDB Filters**: Genre, year range, streaming service availability
- **URL Import**: Parse movie lists from RT, Letterboxd, ListChallenges, IMDb
- **Text Paste**: Raw list of movie titles matched to TMDB

### Joining Sessions
- Shareable link (`cinematch.app/s/abc123`)
- Room code (e.g., "X7K2")
- Direct invite from friends list

### Swipe Cards (Rich View)
- Movie poster (dominant)
- Title, year
- Genre tags
- TMDB rating + IMDb score
- Short synopsis
- Runtime
- Streaming availability

### Matching
- End-of-deck reveal (no real-time websockets needed)
- Shows all movies everyone liked
- User selects which one they're watching
- Selection saved to "watched together" history

### Social Features
- Google sign-in (required)
- Friends system (add, accept, invite)
- Watch history with friends
- Basic stats (movies matched, watch history)

## Technical Architecture

### Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS + Framer Motion |
| Backend | Next.js API Routes |
| Database | PostgreSQL via Supabase |
| Auth | NextAuth.js + Google Provider |
| Hosting | Vercel |

### External APIs

| API | Purpose |
|-----|---------|
| TMDB | Movie catalog, posters, metadata, streaming availability |
| OMDb | IMDb scores, RT critic scores |

### URL Parsers
- Rotten Tomatoes browse pages
- Letterboxd lists
- ListChallenges
- IMDb lists
- Generic fallback (scan for movie titles)

### Database Schema

```
User
- id (uuid)
- google_id
- email
- name
- avatar_url
- created_at

Friendship
- id
- user_id (fk)
- friend_id (fk)
- status (pending/accepted)
- created_at

Session
- id (uuid)
- code (unique, 4-6 chars)
- host_id (fk User)
- deck (movie IDs array)
- status (lobby/swiping/revealed)
- created_at

SessionParticipant
- id
- session_id (fk)
- user_id (fk)
- nickname
- completed (boolean)
- joined_at

Swipe
- id
- session_id (fk)
- user_id (fk)
- movie_id
- liked (boolean)

CachedMovie
- tmdb_id (pk)
- title
- year
- poster_url
- genres
- synopsis
- runtime
- tmdb_rating
- imdb_rating
- streaming_services
- fetched_at

WatchedMovie
- id
- session_id (fk)
- movie_id
- watched_by (user IDs)
- watched_at
```

### Project Structure

```
/app
  /api              → API routes
    /auth           → NextAuth handlers
    /sessions       → Session CRUD, join, swipe, reveal
    /friends        → Friend requests, list
    /movies         → TMDB/OMDb fetching, URL parsing
  /(auth)           → Login page
  /(app)            → Protected app routes
    /dashboard      → Home, recent sessions
    /session/[id]   → Session lobby, swipe, reveal
    /friends        → Friends list, requests
    /history        → Watch history
    /profile        → User profile, stats
/components
  /ui               → Base components (Button, Card, etc.)
  /swipe            → SwipeCard, SwipeDeck
  /session          → Lobby, Reveal, etc.
/lib
  /api              → TMDB, OMDb clients
  /parsers          → URL list parsers
  /db               → Database queries
  /utils            → Helpers
/db
  /schema.sql       → Database schema
  /migrations       → Schema migrations
```

## UI/UX Design

### Design Principles
- Dark mode by default (movie night vibes)
- Minimal chrome, content-forward
- 60fps animations, buttery smooth
- Satisfying micro-interactions
- Mobile-first, responsive

### Color Palette
- Deep charcoal/black backgrounds
- Vibrant accent (coral or electric purple)
- Subtle gradients and glassmorphism on cards

### Key Screens

1. **Dashboard**
   - Prominent "New Session" CTA
   - Recent sessions
   - Watch history preview
   - Friends activity

2. **Create Session**
   - Tab selector: Filters | Import URL | Paste List
   - Multi-select chips for genres, streaming services
   - Year range slider
   - Deck preview before starting

3. **Lobby**
   - Large room code display
   - Share button (native share sheet)
   - Live-updating participant avatars
   - "Start Swiping" button (host)

4. **Swipe Screen**
   - Full-bleed movie card
   - Gradient overlay with metadata
   - Tap to expand for full details
   - Swipe right (green glow) / left (red glow)
   - Progress indicator

5. **Reveal Screen**
   - Dramatic build-up animation
   - Cards reveal matches one by one
   - "You all matched on X movies!"
   - Tap to select "We're watching this"

6. **History/Profile**
   - Watch history with friends
   - Stats and insights

## MVP Scope

### In Scope (V1)
- Google sign-in
- Session creation (TMDB filters, URL import, text paste)
- Join via link, code, or friend invite
- Friend system (add, accept, invite)
- Swipe through deck
- End-of-deck reveal
- Select movie → save to history
- Watch history
- Basic stats
- Mobile-first responsive design
- PWA support

### Out of Scope (Future)
- Async mode (swipe independently, compare later)
- Real-time live swiping with instant match notifications
- Movie recommendations based on history
- Comments/reactions on watched movies
- Group chats
- Push notifications
- Native iOS/Android apps
- Additional auth providers

## Launch Requirements

- TMDB API key
- OMDb API key
- Google OAuth credentials (Google Cloud Console)
- Supabase project (Postgres + Auth helpers)
- Vercel account for deployment
