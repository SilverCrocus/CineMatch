# Solo Mode Browse Filters Design

## Overview

Enhance the existing "By Genre" screen to support multi-genre selection, AND/OR logic, and year range filtering. Keep the simple flow for users who want quick genre picks, but add power for those who want more control.

## Design Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Where filters live | Enhance existing genre screen | Progressive disclosure - simple by default |
| Filters included | Year range + multiple genres | Rating filter unnecessary (already filtered at 65% RT) |
| Year picker style | Preset decades + custom option | Quick for most users, precise when needed |
| Multi-genre logic | Both AND & OR with toggle | Maximum flexibility |
| Default logic | OR (any genre) | Safer - AND can return too few results |
| Layout | All filters on one screen | Simple, everything visible at a glance |

## Screen Layout

**Top to bottom:**

1. **Header** - "Pick a Genre" with back button
2. **Genre chips** - Multi-select badges (tap to toggle, selected = highlighted)
3. **Match toggle** - Pill toggle: "Any genre" | "All genres" (defaults to "Any")
4. **Year section** - Label "Era" with preset buttons:
   - "Any" (default)
   - "2020s"
   - "2010s"
   - "2000s"
   - "90s"
   - "80s & older"
   - "Custom" (reveals From/To dropdowns)
5. **Start button** - Fixed bottom, disabled until genre selected

## URL Parameters

```
/solo/swipe?source=browse&genres=28,35&match=any&yearFrom=2010&yearTo=2019
```

- `genres` - comma-separated genre IDs (required)
- `match` - "any" or "all" (defaults to "any")
- `yearFrom` / `yearTo` - optional year bounds

## Backend Changes

**`/api/solo/movies/stream` updates:**

1. Accept `genres` param (comma-separated IDs) instead of single `genre`
2. Add `match` param to control TMDB query:
   - `match=any` → TMDB `with_genres=28|35` (pipe = OR)
   - `match=all` → TMDB `with_genres=28,35` (comma = AND)
3. Add `yearFrom`/`yearTo` params (already supported by `discoverMovies`)

## UI Components

**Genre chips:**
- Existing `Badge` component
- Selected: filled primary background, white text
- Unselected: outline style
- Flex-wrap grid layout

**Match toggle:**
- Segmented control below genres
- Subtle styling, not prominent
- Two options: "Any genre" | "All genres"

**Year presets:**
- Horizontal row of small buttons
- Single-select (only one active)
- "Custom" reveals two year dropdowns (1950 to current year)

**Start button:**
- Sticky bottom position
- Shows "Start Swiping" when valid
- Disabled with "Select at least one genre" when empty

## Edge Cases

- **No results:** Swipe page handles empty gracefully with "All done!"
- **Invalid year range:** Auto-swap if From > To
- **Mobile overflow:** Natural scroll with sticky bottom button

## Not Included

- Saving filter preferences
- Rating threshold customization
- Streaming service filters
