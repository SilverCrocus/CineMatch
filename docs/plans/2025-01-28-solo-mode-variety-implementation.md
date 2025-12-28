# Solo Mode Variety & Quality Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add dismissed movie tracking, undo functionality, RT score filtering, and randomization to solo mode for better variety.

**Architecture:** New `solo_dismissed` table mirrors watchlist pattern. Streaming endpoint filters by RT score and excludes dismissed movies. Frontend adds toast undo and dismissed tab in My List.

**Tech Stack:** Next.js 14, PostgreSQL, TypeScript, Framer Motion (for toast)

---

## Task 1: Add Database Schema for Dismissed Movies

**Files:**
- Modify: `db/schema.sql` (add table at end)

**Step 1: Add the solo_dismissed table schema**

Add to end of `db/schema.sql`:

```sql
-- Solo mode dismissed movies (swiped left)
CREATE TABLE solo_dismissed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);

CREATE INDEX idx_solo_dismissed_user_id ON solo_dismissed(user_id);
CREATE INDEX idx_solo_dismissed_movie_id ON solo_dismissed(movie_id);
```

**Step 2: Run migration on database**

Run the SQL directly on your Render PostgreSQL database (via psql or Render dashboard).

**Step 3: Commit**

```bash
git add db/schema.sql
git commit -m "feat: add solo_dismissed table for tracking rejected movies"
```

---

## Task 2: Create Dismissed Movies API Endpoint

**Files:**
- Create: `app/api/solo/dismissed/route.ts`

**Step 1: Create the dismissed API route**

Create `app/api/solo/dismissed/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, queryMany } from "@/lib/db";
import { getMoviesByIds } from "@/lib/services/movies";

interface DismissedRow {
  id: string;
  movie_id: number;
  dismissed_at: string;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await queryMany<DismissedRow>(
      `SELECT id, movie_id, dismissed_at
       FROM solo_dismissed
       WHERE user_id = $1
       ORDER BY dismissed_at DESC`,
      [session.user.id]
    );

    if (items.length === 0) {
      return NextResponse.json({ dismissed: [] });
    }

    const movieIds = items.map((item) => item.movie_id);
    const movies = await getMoviesByIds(movieIds);
    const movieMap = new Map(movies.map((m) => [m.tmdbId, m]));

    const dismissed = items.map((item) => ({
      id: item.id,
      movieId: item.movie_id,
      dismissedAt: item.dismissed_at,
      movie: movieMap.get(item.movie_id),
    }));

    return NextResponse.json({ dismissed });
  } catch (error) {
    console.error("Error fetching dismissed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { movieId } = await request.json();

    if (!movieId || typeof movieId !== "number") {
      return NextResponse.json({ error: "movieId required" }, { status: 400 });
    }

    await query(
      `INSERT INTO solo_dismissed (user_id, movie_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, movie_id) DO NOTHING`,
      [session.user.id, movieId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding to dismissed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { movieId } = await request.json();

    if (!movieId || typeof movieId !== "number") {
      return NextResponse.json({ error: "movieId required" }, { status: 400 });
    }

    await query(
      `DELETE FROM solo_dismissed
       WHERE user_id = $1 AND movie_id = $2`,
      [session.user.id, movieId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing from dismissed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add app/api/solo/dismissed/route.ts
git commit -m "feat: add dismissed movies API endpoints"
```

---

## Task 3: Update Streaming Endpoint - Add Dismissed Exclusion

**Files:**
- Modify: `app/api/solo/movies/stream/route.ts`

**Step 1: Update the query to include dismissed movies in exclusion set**

In `app/api/solo/movies/stream/route.ts`, find the existing exclusion query (around line 81):

```typescript
// Get user's existing watchlist to exclude
const existing = await queryMany<{ movie_id: number }>(
  "SELECT movie_id FROM solo_watchlist WHERE user_id = $1",
  [session.user.id]
);
const existingIds = new Set(existing.map((e) => e.movie_id));
```

Replace with:

```typescript
// Get user's watchlist AND dismissed movies to exclude
const [watchlist, dismissed] = await Promise.all([
  queryMany<{ movie_id: number }>(
    "SELECT movie_id FROM solo_watchlist WHERE user_id = $1",
    [session.user.id]
  ),
  queryMany<{ movie_id: number }>(
    "SELECT movie_id FROM solo_dismissed WHERE user_id = $1",
    [session.user.id]
  ),
]);
const existingIds = new Set([
  ...watchlist.map((e) => e.movie_id),
  ...dismissed.map((e) => e.movie_id),
]);
```

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add app/api/solo/movies/stream/route.ts
git commit -m "feat: exclude dismissed movies from solo mode results"
```

---

## Task 4: Add RT Audience Score Filtering

**Files:**
- Modify: `app/api/solo/movies/stream/route.ts`

**Step 1: Add helper function for RT score parsing**

Add at the top of the file (after imports, before `fetchMovieFast`):

```typescript
const MIN_RT_AUDIENCE_SCORE = 65;

function parseRTScore(score: string | null): number | null {
  if (!score) return null;
  const numeric = parseInt(score.replace('%', ''));
  return isNaN(numeric) ? null : numeric;
}

function passesRTFilter(movie: Movie): boolean {
  const score = parseRTScore(movie.rtAudienceScore);
  // Include if no score (don't penalize missing data) or score >= threshold
  return score === null || score >= MIN_RT_AUDIENCE_SCORE;
}
```

**Step 2: Apply filter when streaming movies**

Find the loop that sends movies (around line 132-145):

```typescript
for (const movie of results) {
  if (movie) {
    movies.push(movie);
    if (movie.imdbId) {
      imdbIds.push(movie.imdbId);
    }
    sendEvent("movie", movie);
  }
}
```

Replace with:

```typescript
for (const movie of results) {
  if (movie && passesRTFilter(movie)) {
    movies.push(movie);
    if (movie.imdbId) {
      imdbIds.push(movie.imdbId);
    }
    sendEvent("movie", movie);
  }
}
```

**Step 3: Verify the file compiles**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add app/api/solo/movies/stream/route.ts
git commit -m "feat: filter out movies with RT audience score below 65%"
```

---

## Task 5: Add Movie Randomization

**Files:**
- Modify: `app/api/solo/movies/stream/route.ts`

**Step 1: Add helper functions for randomization**

Add after the RT filter helpers:

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
```

**Step 2: Update movie fetching to use random pages**

Find the section that fetches TMDB IDs based on source (around line 87-122). Replace the entire block:

```typescript
if (source === "genre" && genre) {
  const { movies: tmdbMovies } = await discoverMovies({
    genres: [parseInt(genre)],
    page: 1,
  });
  tmdbIds = tmdbMovies.map((m) => m.id);
} else if (source === "similar" && movie) {
  // ... similar logic
} else {
  // Random/surprise me
  const { movies: tmdbMovies } = await discoverMovies({ page: 1 });
  tmdbIds = tmdbMovies.map((m) => m.id);
}
```

With this updated version:

```typescript
// Pick 3 random pages from 1-20 for variety
const randomPages = pickRandomPages(3, 20);

if (source === "genre" && genre) {
  const results = await Promise.all(
    randomPages.map((page) =>
      discoverMovies({ genres: [parseInt(genre)], page })
    )
  );
  tmdbIds = shuffle(results.flatMap((r) => r.movies.map((m) => m.id)));
} else if (source === "similar" && movie) {
  const searchResults = await searchMovies(movie);
  if (searchResults.length > 0) {
    const baseMovie = searchResults[0];
    const genreMap: Record<number, string> = {
      28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
      80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
      14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
      9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 53: "Thriller",
      10752: "War", 37: "Western",
    };
    const genreIds = Object.entries(genreMap)
      .filter(([, name]) => baseMovie.genre_ids?.some((id) => genreMap[id] === name))
      .map(([id]) => parseInt(id))
      .slice(0, 2);

    const results = await Promise.all(
      randomPages.map((page) =>
        discoverMovies({ genres: genreIds.length > 0 ? genreIds : undefined, page })
      )
    );
    tmdbIds = shuffle(results.flatMap((r) => r.movies.map((m) => m.id)));
  }
} else {
  // Random/surprise me
  const results = await Promise.all(
    randomPages.map((page) => discoverMovies({ page }))
  );
  tmdbIds = shuffle(results.flatMap((r) => r.movies.map((m) => m.id)));
}
```

**Step 3: Verify the file compiles**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add app/api/solo/movies/stream/route.ts
git commit -m "feat: randomize movie selection from pages 1-20"
```

---

## Task 6: Update Swipe Page - Add Dismiss API Call

**Files:**
- Modify: `app/(app)/solo/swipe/page.tsx`

**Step 1: Update handleSwipe to call dismiss API on left swipe**

Find the `handleSwipe` function (around line 90):

```typescript
const handleSwipe = useCallback(
  async (liked: boolean) => {
    if (!currentMovie) return;

    if (liked) {
      await fetch("/api/solo/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: currentMovie.tmdbId }),
      });
      setSavedCount((prev) => prev + 1);
    }

    setCurrentIndex((prev) => prev + 1);
  },
  [currentMovie]
);
```

Replace with:

```typescript
const handleSwipe = useCallback(
  async (liked: boolean) => {
    if (!currentMovie) return;

    if (liked) {
      await fetch("/api/solo/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: currentMovie.tmdbId }),
      });
      setSavedCount((prev) => prev + 1);
    } else {
      // Track dismissed movie
      await fetch("/api/solo/dismissed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: currentMovie.tmdbId }),
      });
    }

    setCurrentIndex((prev) => prev + 1);
  },
  [currentMovie]
);
```

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add app/(app)/solo/swipe/page.tsx
git commit -m "feat: track dismissed movies when swiping left"
```

---

## Task 7: Add Toast Undo Functionality

**Files:**
- Modify: `app/(app)/solo/swipe/page.tsx`

**Step 1: Add state for toast and last dismissed movie**

Find the state declarations at the top of `SoloSwipeContent` (around line 27-32):

```typescript
const [movies, setMovies] = useState<Movie[]>([]);
const [currentIndex, setCurrentIndex] = useState(0);
const [loading, setLoading] = useState(true);
const [savedCount, setSavedCount] = useState(0);
const [expanded, setExpanded] = useState(false);
const moviesRef = useRef<Movie[]>([]);
```

Add after these:

```typescript
const [showUndoToast, setShowUndoToast] = useState(false);
const [lastDismissed, setLastDismissed] = useState<Movie | null>(null);
const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
```

**Step 2: Update handleSwipe to show toast on dismiss**

Replace the handleSwipe function with:

```typescript
const handleSwipe = useCallback(
  async (liked: boolean) => {
    if (!currentMovie) return;

    // Clear any existing undo timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    setShowUndoToast(false);

    if (liked) {
      await fetch("/api/solo/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: currentMovie.tmdbId }),
      });
      setSavedCount((prev) => prev + 1);
      setLastDismissed(null);
    } else {
      // Track dismissed movie
      await fetch("/api/solo/dismissed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: currentMovie.tmdbId }),
      });

      // Show undo toast
      setLastDismissed(currentMovie);
      setShowUndoToast(true);
      undoTimeoutRef.current = setTimeout(() => {
        setShowUndoToast(false);
        setLastDismissed(null);
      }, 3000);
    }

    setCurrentIndex((prev) => prev + 1);
  },
  [currentMovie]
);
```

**Step 3: Add undo handler**

Add after handleSwipe:

```typescript
const handleUndo = useCallback(async () => {
  if (!lastDismissed) return;

  // Clear timeout
  if (undoTimeoutRef.current) {
    clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = null;
  }

  // Remove from dismissed
  await fetch("/api/solo/dismissed", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ movieId: lastDismissed.tmdbId }),
  });

  // Go back to previous movie
  setCurrentIndex((prev) => prev - 1);
  setShowUndoToast(false);
  setLastDismissed(null);
}, [lastDismissed]);
```

**Step 4: Add cleanup effect**

Add after the other useEffects:

```typescript
// Cleanup undo timeout on unmount
useEffect(() => {
  return () => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
  };
}, []);
```

**Step 5: Add toast UI**

Find the closing `</>` before the final `)` of the main return (around line 313). Add the toast just before it:

```typescript
{/* Undo Toast */}
<AnimatePresence>
  {showUndoToast && (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-800 text-white px-4 py-2 rounded-full flex items-center gap-3 shadow-lg"
    >
      <span className="text-sm">Dismissed</span>
      <button
        onClick={handleUndo}
        className="text-sm font-medium text-accent hover:underline"
      >
        Undo
      </button>
    </motion.div>
  )}
</AnimatePresence>
```

**Step 6: Verify the file compiles**

Run: `npx tsc --noEmit`

**Step 7: Commit**

```bash
git add app/(app)/solo/swipe/page.tsx
git commit -m "feat: add undo toast for dismissed movies"
```

---

## Task 8: Add Dismissed Tab to My List Page

**Files:**
- Modify: `app/(app)/solo/list/page.tsx`

**Step 1: Read current file to understand structure**

First read the current list page to understand its structure.

**Step 2: Add tab state and dismissed data fetching**

This will require significant changes. The full updated file:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Movie } from "@/types";

interface WatchlistItem {
  id: string;
  movieId: number;
  addedAt: string;
  movie?: Movie;
}

interface DismissedItem {
  id: string;
  movieId: number;
  dismissedAt: string;
  movie?: Movie;
}

type Tab = "saved" | "dismissed";

export default function MyListPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("saved");
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [dismissed, setDismissed] = useState<DismissedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [watchlistRes, dismissedRes] = await Promise.all([
          fetch("/api/solo/list"),
          fetch("/api/solo/dismissed"),
        ]);

        if (watchlistRes.ok) {
          const data = await watchlistRes.json();
          setWatchlist(data.watchlist || []);
        }

        if (dismissedRes.ok) {
          const data = await dismissedRes.json();
          setDismissed(data.dismissed || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleRemoveFromWatchlist = async (movieId: number) => {
    await fetch("/api/solo/list", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId }),
    });
    setWatchlist((prev) => prev.filter((item) => item.movieId !== movieId));
  };

  const handleRestoreFromDismissed = async (movieId: number) => {
    // Remove from dismissed
    await fetch("/api/solo/dismissed", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId }),
    });

    // Add to watchlist
    await fetch("/api/solo/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId }),
    });

    // Update local state
    const item = dismissed.find((d) => d.movieId === movieId);
    setDismissed((prev) => prev.filter((d) => d.movieId !== movieId));
    if (item?.movie) {
      setWatchlist((prev) => [
        { id: crypto.randomUUID(), movieId, addedAt: new Date().toISOString(), movie: item.movie },
        ...prev,
      ]);
    }
  };

  const handleRemoveFromDismissed = async (movieId: number) => {
    await fetch("/api/solo/dismissed", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId }),
    });
    setDismissed((prev) => prev.filter((item) => item.movieId !== movieId));
  };

  const currentList = activeTab === "saved" ? watchlist : dismissed;

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold font-[family-name:var(--font-syne)]">
          My List
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("saved")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === "saved"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Saved ({watchlist.length})
        </button>
        <button
          onClick={() => setActiveTab("dismissed")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === "dismissed"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Dismissed ({dismissed.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : currentList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {activeTab === "saved"
              ? "No saved movies yet"
              : "No dismissed movies"}
          </p>
          <Button onClick={() => router.push("/solo")}>Browse movies</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((item) => {
            const movie = item.movie;
            if (!movie) return null;

            return (
              <Card key={item.id} className="p-3">
                <div className="flex gap-3">
                  {movie.posterUrl && (
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-16 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{movie.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {movie.year} {movie.runtime && `• ${movie.runtime} min`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {movie.rtAudienceScore && (
                        <span className="text-xs text-orange-400">
                          🍿 {movie.rtAudienceScore}
                        </span>
                      )}
                      {movie.imdbRating && (
                        <span className="text-xs text-yellow-400">
                          ⭐ {movie.imdbRating}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      {activeTab === "saved" ? (
                        <>
                          {movie.imdbId && (
                            <a
                              href={`https://www.imdb.com/title/${movie.imdbId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              IMDB
                            </a>
                          )}
                          <button
                            onClick={() => handleRemoveFromWatchlist(movie.tmdbId)}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleRestoreFromDismissed(movie.tmdbId)}
                            className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </button>
                          <button
                            onClick={() => handleRemoveFromDismissed(movie.tmdbId)}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
```

**Step 3: Verify the file compiles**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add app/(app)/solo/list/page.tsx
git commit -m "feat: add dismissed tab to My List with restore functionality"
```

---

## Task 9: Manual Testing

**Step 1: Test dismissed movie tracking**

1. Go to Solo Mode > Surprise Me
2. Swipe left on a movie
3. Verify toast appears with "Dismissed · Undo"
4. Let toast disappear
5. Go back and re-enter Surprise Me
6. Verify that movie no longer appears

**Step 2: Test undo functionality**

1. Swipe left on a movie
2. Click "Undo" on toast
3. Verify movie reappears as current card

**Step 3: Test dismissed list**

1. Go to My List
2. Click "Dismissed" tab
3. Verify dismissed movies appear
4. Click "Restore" on one
5. Verify it moves to "Saved" tab

**Step 4: Test RT filtering**

1. Check server logs to verify movies with <65% RT audience score are being filtered

**Step 5: Test variety**

1. Go to Solo Mode multiple times
2. Verify different movies appear each time (not always the same order)

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete solo mode variety and quality improvements"
```
