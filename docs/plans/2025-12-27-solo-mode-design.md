# Solo Mode Design

Replaces the unused History feature with a personal watchlist builder that improves group sessions.

## Problem

The History section was dead weight:
- No natural moment to record watched movies
- After group matching, users verbally pick a movie and close the app
- Would require manual "mark as watched" (friction nobody wants)
- Or guessing which match was picked (impossible)

## Solution

Replace History with Solo Mode — a personal watchlist builder where users swipe on movies anytime. When they create group sessions, the app surfaces pre-matches from participants' solo lists.

## Dashboard Change

- Remove "History" card
- Replace with "Solo Mode" card (same position, same styling)
- New icon (heart or bookmark instead of clock)
- Subtitle: "Your watchlist"

## Solo Mode Experience

### Entry Screen

Four options when tapping Solo Mode:

1. **Similar to...** — text input to search a movie, then swipe similar movies
2. **By genre** — pick from genre badges, then swipe movies in that genre
3. **Surprise me** — tap and immediately start swiping random popular movies
4. **My List** — view saved movies

### Swiping

- Same card UI as group sessions (poster, title, year, genres, rating)
- Swipe right = save to list
- Swipe left = skip
- No timer, no pressure
- Back button returns to solo mode menu

### My List

- Grid or list of saved movie posters
- Tap movie to see details
- Option to remove movies
- Shows total count (e.g., "12 movies saved")

## Pre-Matches in Group Sessions

### When It Triggers

- User creates a group session
- At least one other participant has movies in their solo list
- App finds overlaps between all participants' lists

### How It Shows

- Before swiping, screen appears: "You already agree on these!"
- Shows overlapping movie cards
- Displays who saved each (e.g., "You + Sarah + Mike")
- Two buttons: "Pick one" or "Keep swiping"

### Edge Cases

- No overlaps → skip pre-match screen, go straight to swiping
- Friends haven't used solo mode → skip pre-match screen
- Only one pre-match → still show it

## Data & Technical Changes

### New Database Table

```sql
CREATE TABLE solo_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  movie_id INTEGER NOT NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);
```

### New API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/solo/list` | Fetch user's saved movies |
| POST | `/api/solo/list` | Add movie to list |
| DELETE | `/api/solo/list/:movieId` | Remove movie from list |
| GET | `/api/solo/movies?source=similar&movie=X` | Get movies similar to X |
| GET | `/api/solo/movies?source=genre&genre=28` | Get movies by genre |
| GET | `/api/solo/movies?source=random` | Get random popular movies |

### Session Creation Changes

- Query all participants' solo lists when session starts
- Find intersections (movies in 2+ lists)
- Pass pre-matches to session page

### Files to Remove

- `/api/history/route.ts`
- `app/(app)/history/page.tsx`
- History card from dashboard

## Testing (Playwright E2E)

### Solo Mode Flow

- Navigate to solo mode from dashboard
- Select "Similar to..." → search movie → swipe through results
- Select "By genre" → pick genre → swipe through results
- Select "Surprise me" → verify swiping starts
- Swipe right on movies → verify they appear in "My List"
- Remove movie from list → verify it's gone

### Pre-Match Flow

- Create session with two users who have overlapping solo lists
- Verify pre-match screen appears with shared movies
- Test "Pick one" button ends session with selection
- Test "Keep swiping" button continues to normal flow
- Test no pre-match screen when lists don't overlap

### Cleanup

- Remove any existing history page tests
