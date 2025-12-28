# Solo Mode: Variety & Quality Improvements

## Problem Statement

Solo mode currently shows the same movies every time because:
1. TMDB discover API always returns page 1 (most popular)
2. No tracking of dismissed/rejected movies - only liked movies are excluded
3. No quality filtering - movies with poor ratings still appear

## Solution Overview

| Feature | Approach |
|---------|----------|
| Dismissed movies | New `solo_dismissed` table, permanent exclusion |
| Undo (immediate) | 3-second toast after swiping left |
| Undo (browse) | "Dismissed" tab in My List with restore option |
| RT quality filter | Backend-only, exclude < 65% audience score |
| Movie variety | Random pages (1-20) + shuffle |

---

## 1. Dismissed Movies Storage

### Database Change

Add new table `solo_dismissed`:

```sql
CREATE TABLE solo_dismissed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);

CREATE INDEX idx_solo_dismissed_user_id ON solo_dismissed(user_id);
```

### Behavior

- Swiping left (X button) adds movie to `solo_dismissed`
- Streaming endpoint queries both `solo_watchlist` AND `solo_dismissed` to build exclusion set
- Movies in either table won't appear in future sessions

---

## 2. Undo Mechanism

### Toast Notification (Immediate Undo)

- After swiping left, toast appears at bottom for 3 seconds: "Dismissed · Undo"
- Clicking "Undo" removes movie from `solo_dismissed` and restores it as current card
- Auto-dismisses after 3 seconds

### Dismissed Movies List (Browse Past Dismissals)

- New tab in My List page: toggle between "Saved" and "Dismissed"
- Shows dismissed movies in card layout
- Each card has "Restore" button (moves to watchlist)
- Cards can also be permanently removed

### API Changes

- `GET /api/solo/dismissed` - fetch user's dismissed movies
- `DELETE /api/solo/dismissed` - remove movie from dismissed (for undo/restore)
- Modify `POST /api/solo/list` to also remove from dismissed when restoring

---

## 3. RT Audience Score Filtering

### Filter Logic

- Minimum threshold: 65% RT audience score
- Applied server-side after fetching movie details
- Movies without RT audience score: **include** (don't penalize missing data)

### Implementation Location

In `/api/solo/movies/stream/route.ts`, after `fetchMovieFast()`:

```typescript
// Parse RT audience score and filter
const score = movie.rtAudienceScore;
if (score) {
  const numericScore = parseInt(score.replace('%', ''));
  if (!isNaN(numericScore) && numericScore < 65) {
    continue; // Skip low-rated movies
  }
}
```

### Edge Cases

- No RT score (loading from batch): Include
- RT score is null/undefined: Include
- RT score unparseable: Include

---

## 4. Movie Variety (Randomization)

### Current Problem

Always fetches page 1 from TMDB = same 20 movies every time.

### Solution

1. Pick 2-3 random pages from range 1-20
2. Fetch movies from each page in parallel
3. Combine and shuffle results
4. Apply filters (exclusions, RT score)

### Implementation

```typescript
function pickRandomPages(count: number, maxPage: number): number[] {
  const pages = new Set<number>();
  while (pages.size < count) {
    pages.add(Math.floor(Math.random() * maxPage) + 1);
  }
  return Array.from(pages);
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Usage
const pages = pickRandomPages(3, 20);
const results = await Promise.all(
  pages.map(p => discoverMovies({ ...filters, page: p }))
);
const combined = shuffle(results.flatMap(r => r.movies));
```

### Why Pages 1-20?

- Pages 1-5: Very popular, well-known movies
- Pages 6-20: Still quality films, more variety
- Beyond 20: Quality drops significantly

---

## Files to Modify

| File | Changes |
|------|---------|
| `db/schema.sql` | Add `solo_dismissed` table |
| `/api/solo/movies/stream/route.ts` | Add exclusions, RT filter, randomization |
| `/api/solo/dismissed/route.ts` | New: GET/DELETE endpoints |
| `/app/(app)/solo/swipe/page.tsx` | Dismiss API call, toast undo |
| `/app/(app)/solo/list/page.tsx` | Add Dismissed tab with toggle |
