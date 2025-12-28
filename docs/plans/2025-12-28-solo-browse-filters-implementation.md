# Solo Browse Filters Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-genre selection, AND/OR logic toggle, and year range presets to the solo mode genre screen.

**Architecture:** Enhance the existing genre-select mode in `/solo/page.tsx` to support multi-select genres with a match toggle and year presets. Update `discoverMovies` to support OR logic via pipe separator. Update streaming endpoint to accept new params.

**Tech Stack:** Next.js 14, React, TypeScript, TMDB API, Tailwind CSS

---

### Task 1: Update discoverMovies to support OR logic

**Files:**
- Modify: `lib/api/tmdb.ts:83-111`

**Step 1: Update the discoverMovies function signature and logic**

Change the function to accept a `genreMatch` parameter:

```typescript
export async function discoverMovies(filters: {
  genres?: number[];
  genreMatch?: "any" | "all";
  yearFrom?: number;
  yearTo?: number;
  page?: number;
}): Promise<{ movies: TMDBMovie[]; totalPages: number }> {
  const params: Record<string, string> = {
    sort_by: "popularity.desc",
    include_adult: "false",
    include_video: "false",
    page: String(filters.page || 1),
  };

  if (filters.genres?.length) {
    // TMDB: comma = AND, pipe = OR
    const separator = filters.genreMatch === "all" ? "," : "|";
    params.with_genres = filters.genres.join(separator);
  }
  if (filters.yearFrom) {
    params["primary_release_date.gte"] = `${filters.yearFrom}-01-01`;
  }
  if (filters.yearTo) {
    params["primary_release_date.lte"] = `${filters.yearTo}-12-31`;
  }

  const data = await tmdbFetch<TMDBDiscoverResponse>("/discover/movie", params);
  return {
    movies: data.results,
    totalPages: data.total_pages,
  };
}
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds (existing callers don't pass genreMatch, defaults to OR)

**Step 3: Commit**

```bash
git add lib/api/tmdb.ts
git commit -m "feat: add genreMatch param to discoverMovies for AND/OR logic"
```

---

### Task 2: Update streaming endpoint to accept new parameters

**Files:**
- Modify: `app/api/solo/movies/stream/route.ts:99-170`

**Step 1: Update parameter parsing and discover calls**

Replace the parameter parsing and genre handling section:

```typescript
// Inside GET function, after session check (around line 99)
const { searchParams } = new URL(request.url);
const source = searchParams.get("source") || "random";
const genresParam = searchParams.get("genres"); // comma-separated IDs
const genre = searchParams.get("genre"); // legacy single genre
const movie = searchParams.get("movie");
const match = searchParams.get("match") || "any"; // "any" or "all"
const yearFrom = searchParams.get("yearFrom");
const yearTo = searchParams.get("yearTo");

// Parse genres - support both new multi-genre and legacy single genre
const genres: number[] = genresParam
  ? genresParam.split(",").map((id) => parseInt(id)).filter((id) => !isNaN(id))
  : genre
  ? [parseInt(genre)]
  : [];
```

**Step 2: Update the genre source handling**

Replace the genre source block (around line 134-140):

```typescript
if ((source === "genre" || source === "browse") && genres.length > 0) {
  const results = await Promise.all(
    randomPages.map((page) =>
      discoverMovies({
        genres,
        genreMatch: match as "any" | "all",
        yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
        yearTo: yearTo ? parseInt(yearTo) : undefined,
        page,
      })
    )
  );
  tmdbIds = shuffle(results.flatMap((r) => r.movies.map((m) => m.id)));
}
```

**Step 3: Update similar source to also use year filters**

Replace the similar source block (around line 141-163):

```typescript
else if (source === "similar" && movie) {
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
        discoverMovies({
          genres: genreIds.length > 0 ? genreIds : undefined,
          yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
          yearTo: yearTo ? parseInt(yearTo) : undefined,
          page,
        })
      )
    );
    tmdbIds = shuffle(results.flatMap((r) => r.movies.map((m) => m.id)));
  }
}
```

**Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add app/api/solo/movies/stream/route.ts
git commit -m "feat: support multi-genre, match mode, and year filters in stream endpoint"
```

---

### Task 3: Create enhanced genre selection UI

**Files:**
- Modify: `app/(app)/solo/page.tsx`

**Step 1: Add state for new filters**

Add these state variables after the existing ones (around line 22):

```typescript
const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
const [matchMode, setMatchMode] = useState<"any" | "all">("any");
const [yearPreset, setYearPreset] = useState<string>("any");
const [customYearFrom, setCustomYearFrom] = useState<number>(1990);
const [customYearTo, setCustomYearTo] = useState<number>(new Date().getFullYear());
```

**Step 2: Add year preset definitions**

Add after the GENRES constant (around line 15):

```typescript
const YEAR_PRESETS: { label: string; value: string; from?: number; to?: number }[] = [
  { label: "Any", value: "any" },
  { label: "2020s", value: "2020s", from: 2020, to: 2029 },
  { label: "2010s", value: "2010s", from: 2010, to: 2019 },
  { label: "2000s", value: "2000s", from: 2000, to: 2009 },
  { label: "90s", value: "90s", from: 1990, to: 1999 },
  { label: "80s & older", value: "classic", from: undefined, to: 1989 },
  { label: "Custom", value: "custom" },
];
```

**Step 3: Add toggle genre handler**

Add after handleSurpriseMe (around line 35):

```typescript
const toggleGenre = (genreId: number) => {
  setSelectedGenres((prev) =>
    prev.includes(genreId)
      ? prev.filter((id) => id !== genreId)
      : [...prev, genreId]
  );
};

const handleStartBrowse = () => {
  if (selectedGenres.length === 0) return;

  const params = new URLSearchParams();
  params.set("source", "browse");
  params.set("genres", selectedGenres.join(","));
  params.set("match", matchMode);

  // Add year params based on preset
  if (yearPreset === "custom") {
    params.set("yearFrom", String(customYearFrom));
    params.set("yearTo", String(customYearTo));
  } else if (yearPreset !== "any") {
    const preset = YEAR_PRESETS.find((p) => p.value === yearPreset);
    if (preset?.from) params.set("yearFrom", String(preset.from));
    if (preset?.to) params.set("yearTo", String(preset.to));
  }

  router.push(`/solo/swipe?${params.toString()}`);
};
```

**Step 4: Commit partial progress**

```bash
git add "app/(app)/solo/page.tsx"
git commit -m "feat: add filter state and handlers for browse mode"
```

---

### Task 4: Update genre-select UI with new components

**Files:**
- Modify: `app/(app)/solo/page.tsx`

**Step 1: Replace the genre-select mode JSX**

Replace the entire `{mode === "genre-select" && (...)}` block (lines 157-176) with:

```tsx
{mode === "genre-select" && (
  <div className="space-y-6 pb-24">
    {/* Genre Selection */}
    <div>
      <p className="text-muted-foreground mb-3">Select genres</p>
      <div className="flex flex-wrap gap-2">
        {GENRES.map((genre) => (
          <Badge
            key={genre.id}
            variant={selectedGenres.includes(genre.id) ? "default" : "outline"}
            className="cursor-pointer transition-colors"
            onClick={() => toggleGenre(genre.id)}
          >
            {genre.name}
          </Badge>
        ))}
      </div>
    </div>

    {/* Match Mode Toggle */}
    {selectedGenres.length > 1 && (
      <div>
        <p className="text-muted-foreground mb-3">Match mode</p>
        <div className="inline-flex rounded-lg bg-muted p-1">
          <button
            onClick={() => setMatchMode("any")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              matchMode === "any"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Any genre
          </button>
          <button
            onClick={() => setMatchMode("all")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              matchMode === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All genres
          </button>
        </div>
      </div>
    )}

    {/* Year Presets */}
    <div>
      <p className="text-muted-foreground mb-3">Era</p>
      <div className="flex flex-wrap gap-2">
        {YEAR_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => setYearPreset(preset.value)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              yearPreset === preset.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Year Dropdowns */}
      {yearPreset === "custom" && (
        <div className="flex items-center gap-3 mt-3">
          <select
            value={customYearFrom}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setCustomYearFrom(val);
              if (val > customYearTo) setCustomYearTo(val);
            }}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm"
          >
            {Array.from({ length: 75 }, (_, i) => new Date().getFullYear() - i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <span className="text-muted-foreground">to</span>
          <select
            value={customYearTo}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setCustomYearTo(val);
              if (val < customYearFrom) setCustomYearFrom(val);
            }}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm"
          >
            {Array.from({ length: 75 }, (_, i) => new Date().getFullYear() - i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      )}
    </div>

    <Button variant="ghost" onClick={() => {
      setMode("menu");
      setSelectedGenres([]);
      setYearPreset("any");
    }}>
      Back to menu
    </Button>

    {/* Fixed Start Button */}
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
      <div className="max-w-lg mx-auto">
        <Button
          className="w-full"
          disabled={selectedGenres.length === 0}
          onClick={handleStartBrowse}
        >
          {selectedGenres.length === 0
            ? "Select at least one genre"
            : `Start Swiping (${selectedGenres.length} genre${selectedGenres.length > 1 ? "s" : ""})`}
        </Button>
      </div>
    </div>
  </div>
)}
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add "app/(app)/solo/page.tsx"
git commit -m "feat: add multi-genre, match toggle, and year preset UI"
```

---

### Task 5: Test end-to-end and deploy

**Step 1: Start dev server and test**

Run: `npm run dev`

Test these scenarios:
1. Select single genre → Start Swiping → Movies load
2. Select multiple genres with "Any" → Movies load (OR logic)
3. Select multiple genres with "All" → Movies load (AND logic)
4. Select genre + year preset (2020s) → Only recent movies
5. Select genre + custom year range → Correct year filtering
6. Legacy single-genre URL still works: `/solo/swipe?source=genre&genre=28`

**Step 2: Final commit and push**

```bash
git add -A
git commit -m "feat: complete solo browse filters with multi-genre and year selection"
git push origin main
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Update `discoverMovies` to support OR logic via `genreMatch` param |
| 2 | Update streaming endpoint to accept `genres`, `match`, `yearFrom`, `yearTo` |
| 3 | Add filter state and handlers to solo page |
| 4 | Build the new genre selection UI with toggle and year presets |
| 5 | Test end-to-end and deploy |
