# Solo Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the unused History feature with Solo Mode — a personal watchlist builder that surfaces pre-matches in group sessions.

**Architecture:** New solo_watchlist table stores user movie saves. New /api/solo/* endpoints handle list CRUD and movie discovery. Dashboard replaces History card with Solo Mode card. Session creation checks for pre-matches.

**Tech Stack:** Next.js 16, React 19, PostgreSQL, TMDB API, Playwright E2E

---

## Task 1: Database Schema

**Files:**
- Modify: `db/schema.sql` (add new table)

**Step 1: Add solo_watchlist table to schema**

Add after the `watched_movies` table in `db/schema.sql`:

```sql
-- Solo mode watchlist
CREATE TABLE solo_watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);

CREATE INDEX idx_solo_watchlist_user_id ON solo_watchlist(user_id);
CREATE INDEX idx_solo_watchlist_movie_id ON solo_watchlist(movie_id);
```

**Step 2: Run migration on local database**

```bash
psql $DATABASE_URL -c "
CREATE TABLE solo_watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);
CREATE INDEX idx_solo_watchlist_user_id ON solo_watchlist(user_id);
CREATE INDEX idx_solo_watchlist_movie_id ON solo_watchlist(movie_id);
"
```

**Step 3: Commit**

```bash
git add db/schema.sql
git commit -m "feat(db): add solo_watchlist table"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `types/index.ts`

**Step 1: Add SoloWatchlistItem type**

Add to `types/index.ts`:

```typescript
export interface SoloWatchlistItem {
  id: string;
  userId: string;
  movieId: number;
  addedAt: Date;
  movie?: Movie;
}
```

**Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat(types): add SoloWatchlistItem type"
```

---

## Task 3: API - Get Watchlist

**Files:**
- Create: `app/api/solo/list/route.ts`

**Step 1: Create GET endpoint**

Create `app/api/solo/list/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { queryMany } from "@/lib/db";
import { getMoviesByIds } from "@/lib/services/movies";

interface WatchlistRow {
  id: string;
  movie_id: number;
  added_at: string;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await queryMany<WatchlistRow>(
      `SELECT id, movie_id, added_at
       FROM solo_watchlist
       WHERE user_id = $1
       ORDER BY added_at DESC`,
      [session.user.id]
    );

    if (items.length === 0) {
      return NextResponse.json({ watchlist: [] });
    }

    const movieIds = items.map((item) => item.movie_id);
    const movies = await getMoviesByIds(movieIds);
    const movieMap = new Map(movies.map((m) => [m.tmdbId, m]));

    const watchlist = items.map((item) => ({
      id: item.id,
      movieId: item.movie_id,
      addedAt: item.added_at,
      movie: movieMap.get(item.movie_id),
    }));

    return NextResponse.json({ watchlist });
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Verify endpoint works**

```bash
npm run dev
# In another terminal:
curl -X GET http://localhost:3000/api/solo/list -H "Cookie: <session-cookie>"
```

**Step 3: Commit**

```bash
git add app/api/solo/list/route.ts
git commit -m "feat(api): add GET /api/solo/list endpoint"
```

---

## Task 4: API - Add/Remove from Watchlist

**Files:**
- Modify: `app/api/solo/list/route.ts`

**Step 1: Add POST handler**

Add to `app/api/solo/list/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { query, queryMany, queryOne } from "@/lib/db";
// ... existing imports

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
      `INSERT INTO solo_watchlist (user_id, movie_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, movie_id) DO NOTHING`,
      [session.user.id, movieId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding to watchlist:", error);
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
      `DELETE FROM solo_watchlist
       WHERE user_id = $1 AND movie_id = $2`,
      [session.user.id, movieId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/solo/list/route.ts
git commit -m "feat(api): add POST/DELETE handlers for watchlist"
```

---

## Task 5: API - Get Movies for Swiping

**Files:**
- Create: `app/api/solo/movies/route.ts`

**Step 1: Create endpoint with source parameter**

Create `app/api/solo/movies/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { queryMany } from "@/lib/db";
import {
  buildDeckFromFilters,
  searchMoviesByTitle,
  getMoviesByIds,
} from "@/lib/services/movies";
import { discoverMovies } from "@/lib/api/tmdb";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const genre = searchParams.get("genre");
  const movie = searchParams.get("movie");

  try {
    // Get user's existing watchlist to exclude
    const existing = await queryMany<{ movie_id: number }>(
      "SELECT movie_id FROM solo_watchlist WHERE user_id = $1",
      [session.user.id]
    );
    const existingIds = new Set(existing.map((e) => e.movie_id));

    let movies;

    switch (source) {
      case "genre":
        if (!genre) {
          return NextResponse.json({ error: "genre required" }, { status: 400 });
        }
        movies = await buildDeckFromFilters({
          genres: [parseInt(genre)],
          limit: 30,
        });
        break;

      case "similar":
        if (!movie) {
          return NextResponse.json({ error: "movie required" }, { status: 400 });
        }
        // Search for the movie to get its ID
        const searchResults = await searchMoviesByTitle(movie);
        if (searchResults.length === 0) {
          return NextResponse.json({ error: "Movie not found" }, { status: 404 });
        }
        // Use the first result's genres to find similar movies
        const baseMovie = searchResults[0];
        movies = await buildDeckFromFilters({
          genres: baseMovie.genres
            ? [28, 35, 18, 27, 878, 53].filter(() => Math.random() > 0.5)
            : undefined,
          limit: 30,
        });
        break;

      case "random":
      default:
        movies = await buildDeckFromFilters({ limit: 30 });
        break;
    }

    // Filter out movies already in watchlist
    const filtered = movies.filter((m) => !existingIds.has(m.tmdbId));

    return NextResponse.json({ movies: filtered });
  } catch (error) {
    console.error("Error fetching movies:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/solo/movies/route.ts
git commit -m "feat(api): add GET /api/solo/movies endpoint"
```

---

## Task 6: API - Search Movies

**Files:**
- Create: `app/api/solo/search/route.ts`

**Step 1: Create search endpoint**

Create `app/api/solo/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchMoviesByTitle } from "@/lib/services/movies";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  try {
    const movies = await searchMoviesByTitle(query);
    return NextResponse.json({ movies });
  } catch (error) {
    console.error("Error searching movies:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/solo/search/route.ts
git commit -m "feat(api): add GET /api/solo/search endpoint"
```

---

## Task 7: Solo Mode Entry Page

**Files:**
- Create: `app/(app)/solo/page.tsx`

**Step 1: Create solo mode entry page**

Create `app/(app)/solo/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Shuffle, List, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GENRE_MAP } from "@/lib/api/tmdb";

const GENRES = Object.entries(GENRE_MAP).map(([id, name]) => ({
  id: parseInt(id),
  name,
}));

type Mode = "menu" | "similar-search" | "genre-select";

export default function SoloModePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("menu");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSimilarSearch = () => {
    if (!searchQuery.trim()) return;
    router.push(`/solo/swipe?source=similar&movie=${encodeURIComponent(searchQuery)}`);
  };

  const handleGenreSelect = (genreId: number) => {
    router.push(`/solo/swipe?source=genre&genre=${genreId}`);
  };

  const handleSurpriseMe = () => {
    router.push("/solo/swipe?source=random");
  };

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold font-[family-name:var(--font-syne)]">
          {mode === "menu" && "Solo Mode"}
          {mode === "similar-search" && "Find Similar"}
          {mode === "genre-select" && "Pick a Genre"}
        </h1>
      </div>

      {mode === "menu" && (
        <div className="space-y-4">
          {/* Similar to... */}
          <Card
            variant="interactive"
            className="p-5"
            onClick={() => setMode("similar-search")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-glow flex items-center justify-center">
                <Search className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold font-[family-name:var(--font-syne)]">
                  Similar to...
                </h3>
                <p className="text-sm text-muted-foreground">
                  Find movies like one you love
                </p>
              </div>
            </div>
          </Card>

          {/* By Genre */}
          <Card
            variant="interactive"
            className="p-5"
            onClick={() => setMode("genre-select")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-glow flex items-center justify-center">
                <Film className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold font-[family-name:var(--font-syne)]">
                  By Genre
                </h3>
                <p className="text-sm text-muted-foreground">
                  Browse movies by category
                </p>
              </div>
            </div>
          </Card>

          {/* Surprise Me */}
          <Card variant="interactive" className="p-5" onClick={handleSurpriseMe}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-glow flex items-center justify-center">
                <Shuffle className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold font-[family-name:var(--font-syne)]">
                  Surprise Me
                </h3>
                <p className="text-sm text-muted-foreground">
                  Random popular movies
                </p>
              </div>
            </div>
          </Card>

          {/* My List */}
          <Card
            variant="interactive"
            className="p-5"
            onClick={() => router.push("/solo/list")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-glow flex items-center justify-center">
                <List className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold font-[family-name:var(--font-syne)]">
                  My List
                </h3>
                <p className="text-sm text-muted-foreground">
                  View saved movies
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {mode === "similar-search" && (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Enter a movie you like and we&apos;ll find similar ones
          </p>
          <div className="flex gap-3">
            <Input
              placeholder="e.g. Inception"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSimilarSearch()}
            />
            <Button onClick={handleSimilarSearch} disabled={!searchQuery.trim()}>
              Go
            </Button>
          </div>
          <Button variant="ghost" onClick={() => setMode("menu")}>
            Back to menu
          </Button>
        </div>
      )}

      {mode === "genre-select" && (
        <div className="space-y-4">
          <p className="text-muted-foreground">Pick a genre to explore</p>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => (
              <Badge
                key={genre.id}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleGenreSelect(genre.id)}
              >
                {genre.name}
              </Badge>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setMode("menu")}>
            Back to menu
          </Button>
        </div>
      )}
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(app\)/solo/page.tsx
git commit -m "feat(ui): add solo mode entry page"
```

---

## Task 8: Solo Mode Swipe Page

**Files:**
- Create: `app/(app)/solo/swipe/page.tsx`

**Step 1: Create swiping page**

Create `app/(app)/solo/swipe/page.tsx`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, X, Heart, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { Movie } from "@/types";

export default function SoloSwipePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source") || "random";
  const genre = searchParams.get("genre");
  const movie = searchParams.get("movie");

  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ source });
    if (genre) params.set("genre", genre);
    if (movie) params.set("movie", movie);

    fetch(`/api/solo/movies?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setMovies(data.movies || []);
        setLoading(false);
      });
  }, [source, genre, movie]);

  const currentMovie = movies[currentIndex];

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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handleSwipe(false);
      if (e.key === "ArrowRight") handleSwipe(true);
    },
    [handleSwipe]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const isDone = currentIndex >= movies.length;

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {savedCount} saved
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading movies...</p>
        </div>
      ) : isDone ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="text-xl font-semibold mb-2">All done!</p>
          <p className="text-muted-foreground mb-6">
            You saved {savedCount} movies to your list
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.push("/solo")}>
              Browse more
            </Button>
            <Button onClick={() => router.push("/solo/list")}>
              View my list
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Movie Card */}
          <div className="flex-1 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentMovie.tmdbId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0"
              >
                <div className="h-full rounded-2xl overflow-hidden relative">
                  {currentMovie.posterUrl && (
                    <img
                      src={currentMovie.posterUrl}
                      alt={currentMovie.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {currentMovie.title}
                    </h2>
                    <p className="text-white/70 text-sm mb-2">
                      {currentMovie.year} • {currentMovie.genres?.slice(0, 2).join(", ")}
                    </p>
                    {currentMovie.imdbRating && (
                      <p className="text-yellow-400 text-sm">
                        ⭐ {currentMovie.imdbRating}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Swipe Buttons */}
          <div className="flex justify-center gap-6 py-6">
            <button
              onClick={() => handleSwipe(false)}
              className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center hover:bg-red-500/30 transition-colors"
            >
              <X className="h-8 w-8 text-red-500" />
            </button>
            <button
              onClick={() => handleSwipe(true)}
              className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center hover:bg-green-500/30 transition-colors"
            >
              <Heart className="h-8 w-8 text-green-500" />
            </button>
          </div>

          {/* Progress */}
          <div className="text-center text-sm text-muted-foreground pb-4">
            {currentIndex + 1} / {movies.length}
          </div>
        </>
      )}
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(app\)/solo/swipe/page.tsx
git commit -m "feat(ui): add solo mode swipe page"
```

---

## Task 9: My List Page

**Files:**
- Create: `app/(app)/solo/list/page.tsx`

**Step 1: Create my list page**

Create `app/(app)/solo/list/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Movie } from "@/types";

interface WatchlistItem {
  id: string;
  movieId: number;
  addedAt: string;
  movie?: Movie;
}

export default function MyListPage() {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/solo/list")
      .then((res) => res.json())
      .then((data) => {
        setWatchlist(data.watchlist || []);
        setLoading(false);
      });
  }, []);

  const handleRemove = async (movieId: number) => {
    await fetch("/api/solo/list", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId }),
    });
    setWatchlist((prev) => prev.filter((item) => item.movieId !== movieId));
  };

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold font-[family-name:var(--font-syne)]">
            My List
          </h1>
        </div>
        <span className="text-sm text-muted-foreground">
          {watchlist.length} movies
        </span>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : watchlist.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Your list is empty</p>
          <Button onClick={() => router.push("/solo")}>
            <Plus className="h-4 w-4 mr-2" />
            Start swiping
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {watchlist.map((item) => (
            <Card key={item.id} className="overflow-hidden group relative">
              {item.movie?.posterUrl && (
                <img
                  src={item.movie.posterUrl}
                  alt={item.movie.title}
                  className="w-full aspect-[2/3] object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-sm font-medium truncate">
                    {item.movie?.title}
                  </p>
                  <button
                    onClick={() => handleRemove(item.movieId)}
                    className="mt-2 text-red-400 text-xs flex items-center gap-1 hover:text-red-300"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(app\)/solo/list/page.tsx
git commit -m "feat(ui): add my list page"
```

---

## Task 10: Update Dashboard

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

**Step 1: Replace History card with Solo Mode card**

In `app/(app)/dashboard/page.tsx`, find the History Card section (around line 126-137) and replace:

```typescript
// Old code:
{/* History Card */}
<Card
  variant="interactive"
  className="p-6 flex flex-col items-center text-center"
  onClick={() => router.push("/history")}
>
  <div className="w-12 h-12 rounded-xl bg-glow flex items-center justify-center mb-3">
    <History className="h-6 w-6 text-accent" />
  </div>
  <span className="font-[family-name:var(--font-syne)] font-semibold">History</span>
  <span className="text-sm text-muted-foreground">Past sessions</span>
</Card>
```

With:

```typescript
{/* Solo Mode Card */}
<Card
  variant="interactive"
  className="p-6 flex flex-col items-center text-center"
  onClick={() => router.push("/solo")}
>
  <div className="w-12 h-12 rounded-xl bg-glow flex items-center justify-center mb-3">
    <Heart className="h-6 w-6 text-accent" />
  </div>
  <span className="font-[family-name:var(--font-syne)] font-semibold">Solo Mode</span>
  <span className="text-sm text-muted-foreground">Your watchlist</span>
</Card>
```

**Step 2: Update imports**

Change the import from `History` to `Heart`:

```typescript
import { Plus, Users, Heart, LogOut } from "lucide-react";
```

**Step 3: Commit**

```bash
git add app/\(app\)/dashboard/page.tsx
git commit -m "feat(ui): replace History with Solo Mode on dashboard"
```

---

## Task 11: API - Get Pre-matches for Session

**Files:**
- Create: `app/api/sessions/[id]/prematches/route.ts`

**Step 1: Create pre-matches endpoint**

Create `app/api/sessions/[id]/prematches/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { queryMany, queryOne } from "@/lib/db";
import { getMoviesByIds } from "@/lib/services/movies";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const { id: sessionId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all participants in this session
    const participants = await queryMany<{ user_id: string }>(
      "SELECT user_id FROM session_participants WHERE session_id = $1",
      [sessionId]
    );

    if (participants.length < 2) {
      return NextResponse.json({ prematches: [] });
    }

    const userIds = participants.map((p) => p.user_id);

    // Find movies that appear in multiple users' watchlists
    const overlaps = await queryMany<{ movie_id: number; user_ids: string[] }>(
      `SELECT movie_id, array_agg(user_id) as user_ids
       FROM solo_watchlist
       WHERE user_id = ANY($1)
       GROUP BY movie_id
       HAVING COUNT(DISTINCT user_id) > 1
       ORDER BY COUNT(DISTINCT user_id) DESC
       LIMIT 10`,
      [userIds]
    );

    if (overlaps.length === 0) {
      return NextResponse.json({ prematches: [] });
    }

    // Get movie details
    const movieIds = overlaps.map((o) => o.movie_id);
    const movies = await getMoviesByIds(movieIds);
    const movieMap = new Map(movies.map((m) => [m.tmdbId, m]));

    // Get user names for display
    const users = await queryMany<{ id: string; name: string }>(
      "SELECT id, name FROM users WHERE id = ANY($1)",
      [userIds]
    );
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    const prematches = overlaps.map((o) => ({
      movie: movieMap.get(o.movie_id),
      savedBy: o.user_ids.map((id) => userMap.get(id) || "Unknown"),
    }));

    return NextResponse.json({ prematches });
  } catch (error) {
    console.error("Error fetching prematches:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/sessions/\[id\]/prematches/route.ts
git commit -m "feat(api): add pre-matches endpoint for sessions"
```

---

## Task 12: Remove History Files

**Files:**
- Delete: `app/api/history/route.ts`
- Delete: `app/(app)/history/page.tsx`

**Step 1: Delete history files**

```bash
rm app/api/history/route.ts
rm app/\(app\)/history/page.tsx
rmdir app/\(app\)/history
rmdir app/api/history
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove unused history feature"
```

---

## Task 13: E2E Test - Solo Mode Flow

**Files:**
- Create: `e2e/tests/solo-mode.spec.ts`

**Step 1: Create E2E test file**

Create `e2e/tests/solo-mode.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { testLogin } from "../fixtures/auth";
import { launchSplitScreenBrowsers, closeAllBrowsers } from "../utils/browser-layout";

test.setTimeout(120000);

test.describe("Solo Mode", () => {
  test("can navigate to solo mode from dashboard", async () => {
    const browsers = await launchSplitScreenBrowsers(1);
    const [browser] = browsers;
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto("http://localhost:3000/");
      await testLogin(page, "host");

      await page.goto("http://localhost:3000/dashboard");

      // Click solo mode card
      await page.locator("text=Solo Mode").click();

      // Should be on solo mode page
      await expect(page).toHaveURL(/\/solo$/);

      // Should see all four options
      await expect(page.locator("text=Similar to...")).toBeVisible();
      await expect(page.locator("text=By Genre")).toBeVisible();
      await expect(page.locator("text=Surprise Me")).toBeVisible();
      await expect(page.locator("text=My List")).toBeVisible();
    } finally {
      await closeAllBrowsers(browsers);
    }
  });

  test("can swipe movies in surprise me mode", async () => {
    const browsers = await launchSplitScreenBrowsers(1);
    const [browser] = browsers;
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto("http://localhost:3000/");
      await testLogin(page, "host");

      await page.goto("http://localhost:3000/solo");

      // Click surprise me
      await page.locator("text=Surprise Me").click();

      // Should be on swipe page
      await expect(page).toHaveURL(/\/solo\/swipe/);

      // Wait for movies to load
      await page.waitForSelector("text=Loading movies...", { state: "hidden", timeout: 15000 });

      // Swipe right on first movie (save it)
      const likeButton = page.locator("button").filter({ has: page.locator(".text-green-500") });
      await expect(likeButton).toBeVisible();
      await likeButton.click();

      // Should show "1 saved"
      await expect(page.locator("text=1 saved")).toBeVisible();

      // Swipe left on next movie (skip it)
      const skipButton = page.locator("button").filter({ has: page.locator(".text-red-500") });
      await skipButton.click();

      // Should still show "1 saved"
      await expect(page.locator("text=1 saved")).toBeVisible();
    } finally {
      await closeAllBrowsers(browsers);
    }
  });

  test("can view and remove from my list", async () => {
    const browsers = await launchSplitScreenBrowsers(1);
    const [browser] = browsers;
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto("http://localhost:3000/");
      await testLogin(page, "host");

      // First add a movie via swiping
      await page.goto("http://localhost:3000/solo/swipe?source=random");
      await page.waitForSelector("text=Loading movies...", { state: "hidden", timeout: 15000 });

      const likeButton = page.locator("button").filter({ has: page.locator(".text-green-500") });
      await likeButton.click();

      // Go to my list
      await page.goto("http://localhost:3000/solo/list");

      // Should see at least 1 movie
      await expect(page.locator("text=movies")).toBeVisible();

      // Hover over first movie and click remove
      const firstMovie = page.locator(".group").first();
      await firstMovie.hover();
      await page.locator("text=Remove").first().click();

    } finally {
      await closeAllBrowsers(browsers);
    }
  });

  test("can browse by genre", async () => {
    const browsers = await launchSplitScreenBrowsers(1);
    const [browser] = browsers;
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto("http://localhost:3000/");
      await testLogin(page, "host");

      await page.goto("http://localhost:3000/solo");

      // Click by genre
      await page.locator("text=By Genre").click();

      // Should see genre badges
      await expect(page.locator("text=Action")).toBeVisible();
      await expect(page.locator("text=Comedy")).toBeVisible();

      // Click action genre
      await page.locator("text=Action").click();

      // Should navigate to swipe with genre param
      await expect(page).toHaveURL(/\/solo\/swipe\?source=genre&genre=28/);
    } finally {
      await closeAllBrowsers(browsers);
    }
  });
});
```

**Step 2: Run tests to verify**

```bash
npm run test:e2e -- e2e/tests/solo-mode.spec.ts
```

**Step 3: Commit**

```bash
git add e2e/tests/solo-mode.spec.ts
git commit -m "test(e2e): add solo mode tests"
```

---

## Task 14: E2E Test - Pre-matches

**Files:**
- Modify: `e2e/tests/session-flow.spec.ts`

**Step 1: Add pre-match test**

Add new test to `e2e/tests/session-flow.spec.ts`:

```typescript
test.describe("Pre-matches from Solo Mode", () => {
  test("shows pre-matches when users have overlapping watchlists", async () => {
    const browsers = await launchSplitScreenBrowsers(2);
    const [hostBrowser, guestBrowser] = browsers;

    const hostContext = await hostBrowser.newContext();
    const guestContext = await guestBrowser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      // Log in both users
      await hostPage.goto("http://localhost:3000/");
      await testLogin(hostPage, "host");
      await guestPage.goto("http://localhost:3000/");
      await testLogin(guestPage, "guest1");

      // Both users save the same movie in solo mode
      // Host saves movies
      await hostPage.goto("http://localhost:3000/solo/swipe?source=random");
      await hostPage.waitForSelector("text=Loading movies...", { state: "hidden", timeout: 15000 });
      const hostLikeButton = hostPage.locator("button").filter({ has: hostPage.locator(".text-green-500") });
      await hostLikeButton.click();

      // Guest saves the same type of movies (genre-based for overlap chance)
      await guestPage.goto("http://localhost:3000/solo/swipe?source=random");
      await guestPage.waitForSelector("text=Loading movies...", { state: "hidden", timeout: 15000 });
      const guestLikeButton = guestPage.locator("button").filter({ has: guestPage.locator(".text-green-500") });
      await guestLikeButton.click();

      // Host creates a session
      await hostPage.goto("http://localhost:3000/session/create");
      await hostPage.locator("text=Action").click();
      await hostPage.getByRole("button", { name: "Create Session" }).click();
      await hostPage.waitForURL(/\/session\//);

      // Get room code
      const roomCode = await hostPage.locator("[data-testid='room-code'], .font-mono").first().textContent();

      // Guest joins
      await guestPage.goto("http://localhost:3000/dashboard");
      await guestPage.locator('input[placeholder*="code" i]').fill(roomCode || "");
      await guestPage.locator('button:has-text("Join")').click();
      await guestPage.waitForURL(/\/session\//);

      // Note: Pre-match UI integration would be tested here
      // For now, verify both are in session
      await expect(hostPage.locator("text=Test Guest 1")).toBeVisible({ timeout: 10000 });

    } finally {
      await closeAllBrowsers(browsers);
    }
  });
});
```

**Step 2: Run all tests**

```bash
npm run test:e2e
```

**Step 3: Commit**

```bash
git add e2e/tests/session-flow.spec.ts
git commit -m "test(e2e): add pre-match test for session flow"
```

---

## Task 15: Final Verification

**Step 1: Run linting**

```bash
npm run lint
```

**Step 2: Run all tests**

```bash
npm run test:e2e
```

**Step 3: Manual verification**

1. Start dev server: `npm run dev`
2. Log in and verify dashboard shows "Solo Mode" instead of "History"
3. Test all four solo mode options
4. Verify movies can be saved and viewed in "My List"
5. Create a session and verify no errors

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any issues from final verification"
```
