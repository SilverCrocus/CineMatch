# Cinematch Implementation Plan - Part 2: Features & UI

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete Cinematch with URL parsers, session management, swiping, friends system, and all UI screens.

**Prerequisites:** Complete Part 1 (Foundation) first.

---

## Phase 5: URL Parsers

### Task 5.1: Create Parser Infrastructure

**Files:**
- Modify: `lib/parsers/index.ts`
- Create: `lib/parsers/types.ts`

**Step 1: Create parser types**

Create `lib/parsers/types.ts`:

```typescript
export interface ParsedMovieList {
  titles: string[];
  source: string;
  error?: string;
}

export interface MovieListParser {
  name: string;
  canParse: (url: string) => boolean;
  parse: (url: string) => Promise<ParsedMovieList>;
}
```

**Step 2: Update parser index**

Replace `lib/parsers/index.ts`:

```typescript
import type { ParsedMovieList, MovieListParser } from "./types";
import { rottenTomatoesParser } from "./rotten-tomatoes";
import { letterboxdParser } from "./letterboxd";
import { listChallengesParser } from "./list-challenges";
import { imdbParser } from "./imdb";
import { genericParser } from "./generic";

const parsers: MovieListParser[] = [
  rottenTomatoesParser,
  letterboxdParser,
  listChallengesParser,
  imdbParser,
  genericParser, // Fallback - must be last
];

export async function parseMovieListUrl(url: string): Promise<ParsedMovieList> {
  for (const parser of parsers) {
    if (parser.canParse(url)) {
      try {
        return await parser.parse(url);
      } catch (error) {
        console.error(`Parser ${parser.name} failed:`, error);
        continue;
      }
    }
  }

  return {
    titles: [],
    source: "unknown",
    error: "No parser could handle this URL",
  };
}

export function parseTextList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.match(/^\d+\.?\s*$/)) // Remove numbered list markers
    .map((line) => line.replace(/^\d+\.?\s*/, "")); // Remove leading numbers
}

export type { ParsedMovieList, MovieListParser };
```

**Step 3: Commit**

```bash
git add .
git commit -m "Add parser infrastructure for movie list URLs"
```

---

### Task 5.2: Create Rotten Tomatoes Parser

**Files:**
- Create: `lib/parsers/rotten-tomatoes.ts`

**Step 1: Implement RT parser**

Create `lib/parsers/rotten-tomatoes.ts`:

```typescript
import type { MovieListParser, ParsedMovieList } from "./types";

export const rottenTomatoesParser: MovieListParser = {
  name: "Rotten Tomatoes",

  canParse(url: string): boolean {
    return url.includes("rottentomatoes.com");
  },

  async parse(url: string): Promise<ParsedMovieList> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Cinematch/1.0)",
      },
    });

    if (!response.ok) {
      return {
        titles: [],
        source: "Rotten Tomatoes",
        error: `Failed to fetch: ${response.status}`,
      };
    }

    const html = await response.text();
    const titles: string[] = [];

    // Match movie titles from RT's browse pages
    // Pattern: data-title="Movie Title" or <span class="p--small">Movie Title</span>
    const titlePatterns = [
      /data-title="([^"]+)"/g,
      /<span[^>]*slot="title"[^>]*>([^<]+)<\/span>/g,
      /class="[^"]*movieTitle[^"]*"[^>]*>([^<]+)</g,
    ];

    for (const pattern of titlePatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const title = match[1].trim();
        if (title && !titles.includes(title)) {
          titles.push(title);
        }
      }
    }

    return {
      titles: titles.slice(0, 50), // Limit to 50 movies
      source: "Rotten Tomatoes",
    };
  },
};
```

**Step 2: Commit**

```bash
git add .
git commit -m "Add Rotten Tomatoes URL parser"
```

---

### Task 5.3: Create Letterboxd Parser

**Files:**
- Create: `lib/parsers/letterboxd.ts`

**Step 1: Implement Letterboxd parser**

Create `lib/parsers/letterboxd.ts`:

```typescript
import type { MovieListParser, ParsedMovieList } from "./types";

export const letterboxdParser: MovieListParser = {
  name: "Letterboxd",

  canParse(url: string): boolean {
    return url.includes("letterboxd.com");
  },

  async parse(url: string): Promise<ParsedMovieList> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Cinematch/1.0)",
      },
    });

    if (!response.ok) {
      return {
        titles: [],
        source: "Letterboxd",
        error: `Failed to fetch: ${response.status}`,
      };
    }

    const html = await response.text();
    const titles: string[] = [];

    // Letterboxd uses data-film-slug and alt text for posters
    const patterns = [
      /data-film-name="([^"]+)"/g,
      /alt="([^"]+)"[^>]*class="[^"]*image[^"]*"/g,
      /<h2[^>]*class="[^"]*headline-2[^"]*"[^>]*>([^<]+)<\/h2>/g,
      /data-original-title="([^"]+)"/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const title = match[1].trim();
        if (title && !titles.includes(title) && title.length > 1) {
          titles.push(title);
        }
      }
    }

    return {
      titles: titles.slice(0, 50),
      source: "Letterboxd",
    };
  },
};
```

**Step 2: Commit**

```bash
git add .
git commit -m "Add Letterboxd URL parser"
```

---

### Task 5.4: Create ListChallenges Parser

**Files:**
- Create: `lib/parsers/list-challenges.ts`

**Step 1: Implement ListChallenges parser**

Create `lib/parsers/list-challenges.ts`:

```typescript
import type { MovieListParser, ParsedMovieList } from "./types";

export const listChallengesParser: MovieListParser = {
  name: "ListChallenges",

  canParse(url: string): boolean {
    return url.includes("listchallenges.com");
  },

  async parse(url: string): Promise<ParsedMovieList> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Cinematch/1.0)",
      },
    });

    if (!response.ok) {
      return {
        titles: [],
        source: "ListChallenges",
        error: `Failed to fetch: ${response.status}`,
      };
    }

    const html = await response.text();
    const titles: string[] = [];

    // ListChallenges uses item-name class for titles
    const patterns = [
      /class="[^"]*item-name[^"]*"[^>]*>([^<]+)</g,
      /<h3[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h3>/g,
      /data-name="([^"]+)"/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const title = match[1].trim();
        if (title && !titles.includes(title)) {
          titles.push(title);
        }
      }
    }

    return {
      titles: titles.slice(0, 50),
      source: "ListChallenges",
    };
  },
};
```

**Step 2: Commit**

```bash
git add .
git commit -m "Add ListChallenges URL parser"
```

---

### Task 5.5: Create IMDb Parser

**Files:**
- Create: `lib/parsers/imdb.ts`

**Step 1: Implement IMDb parser**

Create `lib/parsers/imdb.ts`:

```typescript
import type { MovieListParser, ParsedMovieList } from "./types";

export const imdbParser: MovieListParser = {
  name: "IMDb",

  canParse(url: string): boolean {
    return url.includes("imdb.com");
  },

  async parse(url: string): Promise<ParsedMovieList> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Cinematch/1.0)",
      },
    });

    if (!response.ok) {
      return {
        titles: [],
        source: "IMDb",
        error: `Failed to fetch: ${response.status}`,
      };
    }

    const html = await response.text();
    const titles: string[] = [];

    // IMDb list pages have various formats
    const patterns = [
      /<h3[^>]*class="[^"]*lister-item-header[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/g,
      /class="[^"]*titleColumn[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/g,
      /<img[^>]*alt="([^"]+)"[^>]*class="[^"]*loadlate[^"]*"/g,
      /data-title="([^"]+)"/g,
      /<a[^>]*href="\/title\/[^"]*"[^>]*>([^<]+)<\/a>/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        let title = match[1].trim();
        // Clean up IMDb-specific formatting
        title = title.replace(/\s*\(\d{4}\)\s*$/, ""); // Remove year
        if (title && !titles.includes(title) && title.length > 1) {
          titles.push(title);
        }
      }
    }

    return {
      titles: [...new Set(titles)].slice(0, 50), // Dedupe and limit
      source: "IMDb",
    };
  },
};
```

**Step 2: Commit**

```bash
git add .
git commit -m "Add IMDb URL parser"
```

---

### Task 5.6: Create Generic Fallback Parser

**Files:**
- Create: `lib/parsers/generic.ts`

**Step 1: Implement generic parser**

Create `lib/parsers/generic.ts`:

```typescript
import type { MovieListParser, ParsedMovieList } from "./types";

export const genericParser: MovieListParser = {
  name: "Generic",

  canParse(): boolean {
    return true; // Always matches as fallback
  },

  async parse(url: string): Promise<ParsedMovieList> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Cinematch/1.0)",
      },
    });

    if (!response.ok) {
      return {
        titles: [],
        source: "Generic",
        error: `Failed to fetch: ${response.status}`,
      };
    }

    const html = await response.text();

    // Remove script and style tags
    const cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

    // Extract text that looks like movie titles
    // Look for patterns: "Movie Title (YEAR)" or titles in lists
    const titles: string[] = [];

    // Pattern for "Movie Title (1999)" format
    const yearPattern = /([A-Z][^<\n]{2,50})\s*\((\d{4})\)/g;
    let match;
    while ((match = yearPattern.exec(cleanHtml)) !== null) {
      const title = match[1].trim();
      const year = parseInt(match[2]);
      if (year >= 1900 && year <= 2030 && !titles.includes(title)) {
        titles.push(title);
      }
    }

    // Pattern for numbered lists: "1. Movie Title"
    const listPattern = /^\s*\d+[\.\)]\s*([A-Z][^\n<]{2,50})/gm;
    while ((match = listPattern.exec(cleanHtml)) !== null) {
      const title = match[1].trim();
      if (!titles.includes(title)) {
        titles.push(title);
      }
    }

    return {
      titles: titles.slice(0, 50),
      source: "Generic",
    };
  },
};
```

**Step 2: Commit**

```bash
git add .
git commit -m "Add generic fallback URL parser"
```

---

## Phase 6: Session Management API

### Task 6.1: Create Session API - Create Session

**Files:**
- Create: `app/api/sessions/route.ts`

**Step 1: Create sessions API route**

```bash
mkdir -p app/api/sessions
```

Create `app/api/sessions/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generateRoomCode } from "@/lib/utils";
import { buildDeckFromFilters, buildDeckFromTitles } from "@/lib/services/movies";
import { parseMovieListUrl, parseTextList } from "@/lib/parsers";
import type { DeckSource } from "@/types";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: { source: DeckSource; deckSize?: number } = await request.json();
  const deckSize = body.deckSize || 25;

  let deck: number[] = [];

  try {
    switch (body.source.type) {
      case "filters":
        deck = await buildDeckFromFilters({
          ...body.source.filters,
          count: deckSize,
        });
        break;

      case "url":
        if (!body.source.url) {
          return NextResponse.json({ error: "URL required" }, { status: 400 });
        }
        const parsed = await parseMovieListUrl(body.source.url);
        if (parsed.error || parsed.titles.length === 0) {
          return NextResponse.json(
            { error: parsed.error || "No movies found at URL" },
            { status: 400 }
          );
        }
        deck = await buildDeckFromTitles(parsed.titles.slice(0, deckSize));
        break;

      case "text":
        if (!body.source.textList) {
          return NextResponse.json({ error: "Text list required" }, { status: 400 });
        }
        const titles = parseTextList(body.source.textList);
        if (titles.length === 0) {
          return NextResponse.json({ error: "No movies in list" }, { status: 400 });
        }
        deck = await buildDeckFromTitles(titles.slice(0, deckSize));
        break;

      default:
        return NextResponse.json({ error: "Invalid source type" }, { status: 400 });
    }

    if (deck.length === 0) {
      return NextResponse.json({ error: "Could not build movie deck" }, { status: 400 });
    }

    const supabase = await createClient();

    // Generate unique room code
    let code: string;
    let codeExists = true;
    while (codeExists) {
      code = generateRoomCode();
      const { data } = await supabase
        .from("sessions")
        .select("id")
        .eq("code", code)
        .single();
      codeExists = !!data;
    }

    // Create session
    const { data: newSession, error } = await supabase
      .from("sessions")
      .insert({
        code: code!,
        host_id: session.user.id,
        deck,
        status: "lobby",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating session:", error);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    // Add host as participant
    await supabase.from("session_participants").insert({
      session_id: newSession.id,
      user_id: session.user.id,
      nickname: session.user.name || "Host",
    });

    return NextResponse.json({
      id: newSession.id,
      code: newSession.code,
      deckSize: deck.length,
    });
  } catch (error) {
    console.error("Error in session creation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "Add session creation API endpoint"
```

---

### Task 6.2: Create Session API - Get & Join Session

**Files:**
- Create: `app/api/sessions/[id]/route.ts`
- Create: `app/api/sessions/join/route.ts`

**Step 1: Create get session route**

```bash
mkdir -p app/api/sessions/\[id\]
```

Create `app/api/sessions/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMoviesByIds } from "@/lib/services/movies";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // Get session with participants
  const { data: sessionData, error } = await supabase
    .from("sessions")
    .select(`
      *,
      session_participants (
        id,
        user_id,
        nickname,
        completed,
        users (
          id,
          name,
          image
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error || !sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Check if user is participant
  const isParticipant = sessionData.session_participants.some(
    (p: { user_id: string }) => p.user_id === session.user.id
  );

  if (!isParticipant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Get movies for the deck
  const movies = await getMoviesByIds(sessionData.deck);

  // Get user's swipes if swiping
  let userSwipes: Record<number, boolean> = {};
  if (sessionData.status !== "lobby") {
    const { data: swipes } = await supabase
      .from("swipes")
      .select("movie_id, liked")
      .eq("session_id", id)
      .eq("user_id", session.user.id);

    if (swipes) {
      userSwipes = Object.fromEntries(
        swipes.map((s) => [s.movie_id, s.liked])
      );
    }
  }

  return NextResponse.json({
    id: sessionData.id,
    code: sessionData.code,
    status: sessionData.status,
    hostId: sessionData.host_id,
    participants: sessionData.session_participants.map((p: any) => ({
      id: p.id,
      odorId: p.user_id,
      nickname: p.nickname,
      completed: p.completed,
      user: p.users,
    })),
    movies,
    userSwipes,
    isHost: sessionData.host_id === session.user.id,
  });
}
```

**Step 2: Create join session route**

```bash
mkdir -p app/api/sessions/join
```

Create `app/api/sessions/join/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await request.json();

  if (!code) {
    return NextResponse.json({ error: "Room code required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Find session by code
  const { data: sessionData, error } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("code", code.toUpperCase())
    .single();

  if (error || !sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (sessionData.status !== "lobby") {
    return NextResponse.json(
      { error: "Session already started" },
      { status: 400 }
    );
  }

  // Check if already participant
  const { data: existing } = await supabase
    .from("session_participants")
    .select("id")
    .eq("session_id", sessionData.id)
    .eq("user_id", session.user.id)
    .single();

  if (existing) {
    return NextResponse.json({ sessionId: sessionData.id });
  }

  // Add as participant
  const { error: joinError } = await supabase
    .from("session_participants")
    .insert({
      session_id: sessionData.id,
      user_id: session.user.id,
      nickname: session.user.name || "Guest",
    });

  if (joinError) {
    console.error("Error joining session:", joinError);
    return NextResponse.json({ error: "Failed to join" }, { status: 500 });
  }

  return NextResponse.json({ sessionId: sessionData.id });
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "Add session get and join API endpoints"
```

---

### Task 6.3: Create Session API - Start, Swipe, Reveal

**Files:**
- Create: `app/api/sessions/[id]/start/route.ts`
- Create: `app/api/sessions/[id]/swipe/route.ts`
- Create: `app/api/sessions/[id]/reveal/route.ts`

**Step 1: Create start session route**

```bash
mkdir -p app/api/sessions/\[id\]/start
```

Create `app/api/sessions/[id]/start/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // Verify user is host
  const { data: sessionData } = await supabase
    .from("sessions")
    .select("host_id, status")
    .eq("id", id)
    .single();

  if (!sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (sessionData.host_id !== session.user.id) {
    return NextResponse.json({ error: "Only host can start" }, { status: 403 });
  }

  if (sessionData.status !== "lobby") {
    return NextResponse.json({ error: "Session already started" }, { status: 400 });
  }

  // Update status to swiping
  const { error } = await supabase
    .from("sessions")
    .update({ status: "swiping" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to start" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

**Step 2: Create swipe route**

```bash
mkdir -p app/api/sessions/\[id\]/swipe
```

Create `app/api/sessions/[id]/swipe/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { movieId, liked } = await request.json();

  if (typeof movieId !== "number" || typeof liked !== "boolean") {
    return NextResponse.json({ error: "Invalid swipe data" }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify session is in swiping state
  const { data: sessionData } = await supabase
    .from("sessions")
    .select("status, deck")
    .eq("id", id)
    .single();

  if (!sessionData || sessionData.status !== "swiping") {
    return NextResponse.json({ error: "Session not in swiping state" }, { status: 400 });
  }

  // Record swipe
  const { error } = await supabase.from("swipes").upsert(
    {
      session_id: id,
      user_id: session.user.id,
      movie_id: movieId,
      liked,
    },
    {
      onConflict: "session_id,user_id,movie_id",
    }
  );

  if (error) {
    console.error("Error recording swipe:", error);
    return NextResponse.json({ error: "Failed to record swipe" }, { status: 500 });
  }

  // Check if user completed all swipes
  const { count: swipeCount } = await supabase
    .from("swipes")
    .select("*", { count: "exact", head: true })
    .eq("session_id", id)
    .eq("user_id", session.user.id);

  if (swipeCount === sessionData.deck.length) {
    // Mark participant as completed
    await supabase
      .from("session_participants")
      .update({ completed: true })
      .eq("session_id", id)
      .eq("user_id", session.user.id);
  }

  return NextResponse.json({ success: true });
}
```

**Step 3: Create reveal route**

```bash
mkdir -p app/api/sessions/\[id\]/reveal
```

Create `app/api/sessions/[id]/reveal/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMoviesByIds } from "@/lib/services/movies";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // Update session status
  await supabase
    .from("sessions")
    .update({ status: "revealed" })
    .eq("id", id);

  return NextResponse.json({ success: true });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // Get session and participants
  const { data: sessionData } = await supabase
    .from("sessions")
    .select(`
      deck,
      session_participants (user_id)
    `)
    .eq("id", id)
    .single();

  if (!sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const participantIds = sessionData.session_participants.map(
    (p: { user_id: string }) => p.user_id
  );

  // Get all swipes for this session
  const { data: allSwipes } = await supabase
    .from("swipes")
    .select("movie_id, user_id, liked")
    .eq("session_id", id);

  if (!allSwipes) {
    return NextResponse.json({ matches: [] });
  }

  // Find movies everyone liked
  const movieLikes = new Map<number, Set<string>>();
  for (const swipe of allSwipes) {
    if (swipe.liked) {
      if (!movieLikes.has(swipe.movie_id)) {
        movieLikes.set(swipe.movie_id, new Set());
      }
      movieLikes.get(swipe.movie_id)!.add(swipe.user_id);
    }
  }

  const matchedIds: number[] = [];
  for (const [movieId, likers] of movieLikes) {
    if (participantIds.every((pid: string) => likers.has(pid))) {
      matchedIds.push(movieId);
    }
  }

  // Get movie details for matches
  const matches = await getMoviesByIds(matchedIds);

  return NextResponse.json({ matches });
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "Add session start, swipe, and reveal API endpoints"
```

---

### Task 6.4: Create Session API - Select Movie to Watch

**Files:**
- Create: `app/api/sessions/[id]/select/route.ts`

**Step 1: Create select movie route**

```bash
mkdir -p app/api/sessions/\[id\]/select
```

Create `app/api/sessions/[id]/select/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { movieId } = await request.json();

  if (typeof movieId !== "number") {
    return NextResponse.json({ error: "Invalid movie ID" }, { status: 400 });
  }

  const supabase = await createClient();

  // Get participants
  const { data: participants } = await supabase
    .from("session_participants")
    .select("user_id")
    .eq("session_id", id);

  if (!participants) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const watchedBy = participants.map((p) => p.user_id);

  // Record watched movie
  const { error } = await supabase.from("watched_movies").insert({
    session_id: id,
    movie_id: movieId,
    watched_by: watchedBy,
  });

  if (error) {
    console.error("Error recording watched movie:", error);
    return NextResponse.json({ error: "Failed to record" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "Add select movie to watch API endpoint"
```

---

## Phase 7: Friends System API

### Task 7.1: Create Friends API

**Files:**
- Create: `app/api/friends/route.ts`
- Create: `app/api/friends/[id]/route.ts`
- Create: `app/api/friends/search/route.ts`

**Step 1: Create friends list and request routes**

```bash
mkdir -p app/api/friends
```

Create `app/api/friends/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// GET - List friends and pending requests
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Get accepted friends (both directions)
  const { data: friendships } = await supabase
    .from("friendships")
    .select(`
      id,
      status,
      user_id,
      friend_id,
      created_at
    `)
    .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
    .eq("status", "accepted");

  // Get friend user details
  const friendIds = new Set<string>();
  friendships?.forEach((f) => {
    if (f.user_id === session.user.id) {
      friendIds.add(f.friend_id);
    } else {
      friendIds.add(f.user_id);
    }
  });

  const { data: friendUsers } = await supabase
    .from("users")
    .select("id, name, email, image")
    .in("id", Array.from(friendIds));

  // Get pending requests sent TO this user
  const { data: pendingRequests } = await supabase
    .from("friendships")
    .select(`
      id,
      user_id,
      created_at
    `)
    .eq("friend_id", session.user.id)
    .eq("status", "pending");

  // Get requester details
  const requesterIds = pendingRequests?.map((r) => r.user_id) || [];
  const { data: requesters } = await supabase
    .from("users")
    .select("id, name, email, image")
    .in("id", requesterIds);

  const requestsWithUsers = pendingRequests?.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    user: requesters?.find((u) => u.id === r.user_id),
  }));

  return NextResponse.json({
    friends: friendUsers || [],
    pendingRequests: requestsWithUsers || [],
  });
}

// POST - Send friend request
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { friendId } = await request.json();

  if (!friendId || friendId === session.user.id) {
    return NextResponse.json({ error: "Invalid friend ID" }, { status: 400 });
  }

  const supabase = await createClient();

  // Check if friendship already exists
  const { data: existing } = await supabase
    .from("friendships")
    .select("id")
    .or(
      `and(user_id.eq.${session.user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${session.user.id})`
    )
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Friendship already exists" },
      { status: 400 }
    );
  }

  // Create friend request
  const { error } = await supabase.from("friendships").insert({
    user_id: session.user.id,
    friend_id: friendId,
    status: "pending",
  });

  if (error) {
    console.error("Error creating friend request:", error);
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

**Step 2: Create accept/reject friend routes**

```bash
mkdir -p app/api/friends/\[id\]
```

Create `app/api/friends/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// PATCH - Accept friend request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // Verify this request is for the current user
  const { data: friendship } = await supabase
    .from("friendships")
    .select("*")
    .eq("id", id)
    .eq("friend_id", session.user.id)
    .eq("status", "pending")
    .single();

  if (!friendship) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // Accept the request
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to accept" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE - Reject request or remove friend
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // Delete the friendship (works for both pending and accepted)
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", id)
    .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`);

  if (error) {
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

**Step 3: Create user search route**

```bash
mkdir -p app/api/friends/search
```

Create `app/api/friends/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const supabase = await createClient();

  // Search by email or name
  const { data: users } = await supabase
    .from("users")
    .select("id, name, email, image")
    .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
    .neq("id", session.user.id)
    .limit(10);

  return NextResponse.json({ users: users || [] });
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "Add friends API: list, request, accept, reject, search"
```

---

## Phase 8: UI Components

### Task 8.1: Create Card Component

**Files:**
- Create: `components/ui/card.tsx`

**Step 1: Create Card component**

Create `components/ui/card.tsx`:

```typescript
import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-lg",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-xl font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

**Step 2: Commit**

```bash
git add .
git commit -m "Add Card UI component"
```

---

### Task 8.2: Create Input and Badge Components

**Files:**
- Create: `components/ui/input.tsx`
- Create: `components/ui/badge.tsx`

**Step 1: Create Input component**

Create `components/ui/input.tsx`:

```typescript
import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
```

**Step 2: Create Badge component**

Create `components/ui/badge.tsx`:

```typescript
import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        {
          "bg-primary text-primary-foreground": variant === "default",
          "bg-secondary text-secondary-foreground": variant === "secondary",
          "border border-border text-foreground": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
```

**Step 3: Commit**

```bash
git add .
git commit -m "Add Input and Badge UI components"
```

---

### Task 8.3: Create Avatar Component

**Files:**
- Create: `components/ui/avatar.tsx`

**Step 1: Create Avatar component**

Create `components/ui/avatar.tsx`:

```typescript
"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  alt: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ src, alt, fallback, size = "md", className }: AvatarProps) {
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  if (!src || error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium",
          sizeClasses[size],
          className
        )}
      >
        {fallback.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-full overflow-hidden", sizeClasses[size], className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "Add Avatar UI component"
```

---

### Task 8.4: Create Swipe Card Component

**Files:**
- Create: `components/swipe/swipe-card.tsx`

**Step 1: Create SwipeCard component**

Create `components/swipe/swipe-card.tsx`:

```typescript
"use client";

import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import Image from "next/image";
import { Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRuntime } from "@/lib/utils";
import type { Movie } from "@/types";

interface SwipeCardProps {
  movie: Movie;
  onSwipe: (liked: boolean) => void;
  isTop: boolean;
}

export function SwipeCard({ movie, onSwipe, isTop }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  function handleDragEnd(_: any, info: PanInfo) {
    if (info.offset.x > 100) {
      onSwipe(true);
    } else if (info.offset.x < -100) {
      onSwipe(false);
    }
  }

  return (
    <motion.div
      className="absolute w-full h-full cursor-grab active:cursor-grabbing"
      style={{ x, rotate, opacity }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
    >
      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-card shadow-2xl">
        {/* Movie Poster */}
        {movie.posterUrl ? (
          <Image
            src={movie.posterUrl}
            alt={movie.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <span className="text-muted-foreground">No poster</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

        {/* Like/Nope Indicators */}
        <motion.div
          className="absolute top-8 right-8 px-4 py-2 border-4 border-green-500 rounded-lg rotate-12"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-2xl font-bold text-green-500">LIKE</span>
        </motion.div>
        <motion.div
          className="absolute top-8 left-8 px-4 py-2 border-4 border-red-500 rounded-lg -rotate-12"
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-2xl font-bold text-red-500">NOPE</span>
        </motion.div>

        {/* Movie Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
          {/* Title & Year */}
          <div>
            <h2 className="text-2xl font-bold text-white">{movie.title}</h2>
            <p className="text-white/70">{movie.year}</p>
          </div>

          {/* Ratings */}
          <div className="flex items-center gap-4">
            {movie.tmdbRating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="text-white text-sm">{movie.tmdbRating.toFixed(1)}</span>
              </div>
            )}
            {movie.imdbRating && (
              <div className="flex items-center gap-1">
                <span className="text-yellow-500 text-xs font-bold">IMDb</span>
                <span className="text-white text-sm">{movie.imdbRating}</span>
              </div>
            )}
            {movie.runtime && (
              <div className="flex items-center gap-1 text-white/70">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{formatRuntime(movie.runtime)}</span>
              </div>
            )}
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-2">
            {movie.genres.slice(0, 3).map((genre) => (
              <Badge key={genre} variant="secondary" className="bg-white/20 text-white">
                {genre}
              </Badge>
            ))}
          </div>

          {/* Synopsis */}
          <p className="text-white/80 text-sm line-clamp-3">{movie.synopsis}</p>

          {/* Streaming */}
          {movie.streamingServices.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-xs">Available on:</span>
              <span className="text-white text-xs">
                {movie.streamingServices.slice(0, 3).join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "Add SwipeCard component with gesture support"
```

---

### Task 8.5: Create Swipe Deck Component

**Files:**
- Create: `components/swipe/swipe-deck.tsx`

**Step 1: Create SwipeDeck component**

Create `components/swipe/swipe-deck.tsx`:

```typescript
"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { SwipeCard } from "./swipe-card";
import { Button } from "@/components/ui/button";
import type { Movie } from "@/types";

interface SwipeDeckProps {
  movies: Movie[];
  onSwipe: (movieId: number, liked: boolean) => void;
  onComplete: () => void;
  initialSwipes?: Record<number, boolean>;
}

export function SwipeDeck({ movies, onSwipe, onComplete, initialSwipes = {} }: SwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    // Start from first unswiped movie
    const swipedIds = Object.keys(initialSwipes).map(Number);
    const firstUnswiped = movies.findIndex((m) => !swipedIds.includes(m.tmdbId));
    return firstUnswiped === -1 ? movies.length : firstUnswiped;
  });

  const handleSwipe = (liked: boolean) => {
    const movie = movies[currentIndex];
    if (movie) {
      onSwipe(movie.tmdbId, liked);
    }

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    if (nextIndex >= movies.length) {
      onComplete();
    }
  };

  const progress = Math.min(currentIndex, movies.length);
  const remaining = movies.length - progress;

  if (currentIndex >= movies.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h2 className="text-2xl font-bold mb-2">All done!</h2>
        <p className="text-muted-foreground">Waiting for others to finish...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <div className="px-4 py-2">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>{progress} / {movies.length}</span>
          <span>{remaining} left</span>
        </div>
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(progress / movies.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card Stack */}
      <div className="flex-1 relative mx-4 my-4">
        <AnimatePresence>
          {movies.slice(currentIndex, currentIndex + 2).reverse().map((movie, i) => (
            <SwipeCard
              key={movie.tmdbId}
              movie={movie}
              onSwipe={handleSwipe}
              isTop={i === (currentIndex + 1 < movies.length ? 1 : 0)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-8 p-4">
        <Button
          variant="outline"
          size="icon"
          className="h-16 w-16 rounded-full border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
          onClick={() => handleSwipe(false)}
        >
          <ThumbsDown className="h-8 w-8" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-16 w-16 rounded-full border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
          onClick={() => handleSwipe(true)}
        >
          <ThumbsUp className="h-8 w-8" />
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "Add SwipeDeck component with progress tracking"
```

---

## Phase 9: App Screens

### Task 9.1: Create Dashboard Page

**Files:**
- Create: `app/(app)/dashboard/page.tsx`
- Create: `app/(app)/layout.tsx`

**Step 1: Create app layout with auth protection**

```bash
mkdir -p app/\(app\)/dashboard
```

Create `app/(app)/layout.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <>{children}</>;
}
```

**Step 2: Create dashboard page**

Create `app/(app)/dashboard/page.tsx`:

```typescript
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Users, History, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoinSession = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);

    try {
      const res = await fetch("/api/sessions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/session/${data.sessionId}`);
      } else {
        alert(data.error || "Failed to join session");
      }
    } catch (error) {
      alert("Failed to join session");
    } finally {
      setJoining(false);
    }
  };

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Avatar
            src={session?.user?.image}
            alt={session?.user?.name || "User"}
            fallback={session?.user?.name?.charAt(0) || "U"}
            size="lg"
          />
          <div>
            <p className="font-medium">{session?.user?.name}</p>
            <p className="text-sm text-muted-foreground">Welcome back!</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => signOut()}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        {/* Create Session */}
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              New Session
            </CardTitle>
            <CardDescription>
              Create a movie night session and invite friends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => router.push("/session/create")}
            >
              Create Session
            </Button>
          </CardContent>
        </Card>

        {/* Join Session */}
        <Card>
          <CardHeader>
            <CardTitle>Join Session</CardTitle>
            <CardDescription>Enter a room code to join</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Enter code (e.g., X7K2)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleJoinSession}
              disabled={joining || !joinCode.trim()}
            >
              {joining ? "Joining..." : "Join"}
            </Button>
          </CardContent>
        </Card>

        {/* Navigation Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={() => router.push("/friends")}
          >
            <CardContent className="flex flex-col items-center justify-center py-6">
              <Users className="h-8 w-8 text-primary mb-2" />
              <span className="font-medium">Friends</span>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={() => router.push("/history")}
          >
            <CardContent className="flex flex-col items-center justify-center py-6">
              <History className="h-8 w-8 text-primary mb-2" />
              <span className="font-medium">History</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
```

**Step 3: Update home page to redirect**

Replace `app/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "Add dashboard page with session join functionality"
```

---

### Task 9.2: Create Session Creation Page

**Files:**
- Create: `app/(app)/session/create/page.tsx`

**Step 1: Create session creation page**

```bash
mkdir -p app/\(app\)/session/create
```

Create `app/(app)/session/create/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Filter, Link, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GENRE_MAP } from "@/lib/api/tmdb";

type Tab = "filters" | "url" | "text";

const GENRES = Object.entries(GENRE_MAP).map(([id, name]) => ({
  id: parseInt(id),
  name,
}));

export default function CreateSessionPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("filters");
  const [loading, setLoading] = useState(false);

  // Filters state
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");

  // URL state
  const [url, setUrl] = useState("");

  // Text state
  const [textList, setTextList] = useState("");

  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    setLoading(true);

    try {
      let source: any = { type: activeTab };

      if (activeTab === "filters") {
        source.filters = {
          genres: selectedGenres.length > 0 ? selectedGenres : undefined,
          yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
          yearTo: yearTo ? parseInt(yearTo) : undefined,
        };
      } else if (activeTab === "url") {
        if (!url.trim()) {
          alert("Please enter a URL");
          setLoading(false);
          return;
        }
        source.url = url.trim();
      } else if (activeTab === "text") {
        if (!textList.trim()) {
          alert("Please enter movie titles");
          setLoading(false);
          return;
        }
        source.textList = textList.trim();
      }

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(`/session/${data.id}`);
      } else {
        alert(data.error || "Failed to create session");
      }
    } catch (error) {
      alert("Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Create Session</h1>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 mb-6">
        {[
          { id: "filters" as Tab, icon: Filter, label: "Filters" },
          { id: "url" as Tab, icon: Link, label: "URL" },
          { id: "text" as Tab, icon: FileText, label: "List" },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "secondary"}
            className="flex-1"
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          {activeTab === "filters" && (
            <div className="space-y-6">
              {/* Genres */}
              <div>
                <h3 className="font-medium mb-3">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((genre) => (
                    <Badge
                      key={genre.id}
                      variant={selectedGenres.includes(genre.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleGenre(genre.id)}
                    >
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Year Range */}
              <div>
                <h3 className="font-medium mb-3">Year Range</h3>
                <div className="flex gap-4">
                  <Input
                    type="number"
                    placeholder="From"
                    value={yearFrom}
                    onChange={(e) => setYearFrom(e.target.value)}
                    min={1900}
                    max={2025}
                  />
                  <Input
                    type="number"
                    placeholder="To"
                    value={yearTo}
                    onChange={(e) => setYearTo(e.target.value)}
                    min={1900}
                    max={2025}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "url" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Paste a URL from Rotten Tomatoes, Letterboxd, ListChallenges, or IMDb
              </p>
              <Input
                placeholder="https://letterboxd.com/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          )}

          {activeTab === "text" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter movie titles, one per line or comma-separated
              </p>
              <textarea
                className="w-full h-40 rounded-lg border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="The Shawshank Redemption&#10;Pulp Fiction&#10;The Dark Knight"
                value={textList}
                onChange={(e) => setTextList(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Button */}
      <Button className="w-full" size="lg" onClick={handleCreate} disabled={loading}>
        {loading ? "Creating..." : "Create Session"}
      </Button>
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "Add session creation page with filters, URL, and text input"
```

---

### Task 9.3: Create Session Lobby/Swipe/Reveal Page

**Files:**
- Create: `app/(app)/session/[id]/page.tsx`

**Step 1: Create session page**

```bash
mkdir -p app/\(app\)/session/\[id\]
```

Create `app/(app)/session/[id]/page.tsx`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Copy, Check, Play, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { SwipeDeck } from "@/components/swipe/swipe-deck";
import type { Movie } from "@/types";

interface SessionData {
  id: string;
  code: string;
  status: "lobby" | "swiping" | "revealed";
  hostId: string;
  participants: {
    id: string;
    odorId: string;
    nickname: string;
    completed: boolean;
    user: { id: string; name: string; image: string };
  }[];
  movies: Movie[];
  userSwipes: Record<number, boolean>;
  isHost: boolean;
}

interface MatchedMovie extends Movie {}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const { data: authSession } = useSession();
  const [session, setSession] = useState<SessionData | null>(null);
  const [matches, setMatches] = useState<MatchedMovie[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<number | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchSession();
    // Poll for updates
    const interval = setInterval(fetchSession, 3000);
    return () => clearInterval(interval);
  }, [fetchSession]);

  const copyCode = () => {
    if (session) {
      navigator.clipboard.writeText(session.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startSession = async () => {
    await fetch(`/api/sessions/${params.id}/start`, { method: "POST" });
    fetchSession();
  };

  const handleSwipe = async (movieId: number, liked: boolean) => {
    await fetch(`/api/sessions/${params.id}/swipe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId, liked }),
    });
  };

  const handleComplete = async () => {
    // Fetch matches
    const res = await fetch(`/api/sessions/${params.id}/reveal`);
    if (res.ok) {
      const data = await res.json();
      setMatches(data.matches);
    }
    fetchSession();
  };

  const selectMovie = async (movieId: number) => {
    await fetch(`/api/sessions/${params.id}/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId }),
    });
    setSelectedMovie(movieId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Session not found</p>
      </div>
    );
  }

  // LOBBY VIEW
  if (session.status === "lobby") {
    return (
      <main className="min-h-screen p-4 max-w-lg mx-auto">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-2">Session Lobby</h1>
          <p className="text-muted-foreground mb-6">
            Share the code with friends to join
          </p>

          {/* Room Code */}
          <Card className="mb-8">
            <CardContent className="py-8">
              <div className="text-4xl font-mono font-bold tracking-widest mb-4">
                {session.code}
              </div>
              <Button variant="secondary" onClick={copyCode}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" /> Copy Code
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Participants */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Users className="h-5 w-5" />
              <span>{session.participants.length} joined</span>
            </div>
            <div className="flex justify-center gap-2 flex-wrap">
              {session.participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2 bg-secondary rounded-full px-3 py-1">
                  <Avatar
                    src={p.user?.image}
                    alt={p.nickname}
                    fallback={p.nickname.charAt(0)}
                    size="sm"
                  />
                  <span className="text-sm">{p.nickname}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Start Button (Host Only) */}
          {session.isHost && (
            <Button size="lg" onClick={startSession} className="w-full">
              <Play className="h-5 w-5 mr-2" />
              Start Swiping ({session.movies.length} movies)
            </Button>
          )}

          {!session.isHost && (
            <p className="text-muted-foreground">
              Waiting for host to start...
            </p>
          )}
        </div>
      </main>
    );
  }

  // SWIPING VIEW
  if (session.status === "swiping") {
    const userParticipant = session.participants.find(
      (p) => p.user?.id === authSession?.user?.id
    );
    const isCompleted = userParticipant?.completed;

    if (isCompleted) {
      // Check if everyone is done
      const allCompleted = session.participants.every((p) => p.completed);

      if (allCompleted) {
        // Trigger reveal
        handleComplete();
      }

      return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4">
          <h2 className="text-2xl font-bold mb-4">All done!</h2>
          <p className="text-muted-foreground mb-8">Waiting for others...</p>
          <div className="space-y-2">
            {session.participants.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <Avatar
                  src={p.user?.image}
                  alt={p.nickname}
                  fallback={p.nickname.charAt(0)}
                  size="sm"
                />
                <span>{p.nickname}</span>
                {p.completed ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground animate-pulse" />
                )}
              </div>
            ))}
          </div>
        </main>
      );
    }

    return (
      <main className="h-screen flex flex-col">
        <SwipeDeck
          movies={session.movies}
          onSwipe={handleSwipe}
          onComplete={handleComplete}
          initialSwipes={session.userSwipes}
        />
      </main>
    );
  }

  // REVEALED VIEW
  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="text-center py-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">
            {matches.length > 0 ? "You matched!" : "No matches"}
          </h1>
          <p className="text-muted-foreground">
            {matches.length > 0
              ? `${matches.length} movie${matches.length > 1 ? "s" : ""} everyone liked`
              : "Try again with different filters"}
          </p>
        </motion.div>

        {matches.length > 0 && (
          <div className="space-y-4">
            <AnimatePresence>
              {matches.map((movie, i) => (
                <motion.div
                  key={movie.tmdbId}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card
                    className={`cursor-pointer transition-all ${
                      selectedMovie === movie.tmdbId
                        ? "ring-2 ring-primary"
                        : "hover:bg-secondary/50"
                    }`}
                    onClick={() => selectMovie(movie.tmdbId)}
                  >
                    <CardContent className="flex items-center gap-4 py-4">
                      {movie.posterUrl && (
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="h-24 w-16 object-cover rounded"
                        />
                      )}
                      <div className="text-left flex-1">
                        <h3 className="font-semibold">{movie.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {movie.year} • {movie.genres.slice(0, 2).join(", ")}
                        </p>
                        {movie.tmdbRating && (
                          <p className="text-sm">⭐ {movie.tmdbRating.toFixed(1)}</p>
                        )}
                      </div>
                      {selectedMovie === movie.tmdbId && (
                        <Check className="h-6 w-6 text-primary" />
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <Button
          variant="secondary"
          className="mt-8"
          onClick={() => router.push("/dashboard")}
        >
          Back to Dashboard
        </Button>
      </div>
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "Add session page with lobby, swiping, and reveal views"
```

---

### Task 9.4: Create Friends Page

**Files:**
- Create: `app/(app)/friends/page.tsx`

**Step 1: Create friends page**

```bash
mkdir -p app/\(app\)/friends
```

Create `app/(app)/friends/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, UserPlus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";

interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface FriendRequest {
  id: string;
  user: User;
  createdAt: string;
}

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchFriends = async () => {
    const res = await fetch("/api/friends");
    if (res.ok) {
      const data = await res.json();
      setFriends(data.friends);
      setRequests(data.pendingRequests);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const searchUsers = async () => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const res = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery)}`);
    if (res.ok) {
      const data = await res.json();
      setSearchResults(data.users);
    }
    setSearching(false);
  };

  useEffect(() => {
    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const sendRequest = async (friendId: string) => {
    await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId }),
    });
    setSearchResults((prev) => prev.filter((u) => u.id !== friendId));
  };

  const acceptRequest = async (requestId: string) => {
    await fetch(`/api/friends/${requestId}`, { method: "PATCH" });
    fetchFriends();
  };

  const rejectRequest = async (requestId: string) => {
    await fetch(`/api/friends/${requestId}`, { method: "DELETE" });
    fetchFriends();
  };

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Friends</h1>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Search Results
          </h2>
          <div className="space-y-2">
            {searchResults.map((user) => (
              <Card key={user.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={user.image}
                      alt={user.name}
                      fallback={user.name.charAt(0)}
                    />
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => sendRequest(user.id)}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {requests.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Friend Requests ({requests.length})
          </h2>
          <div className="space-y-2">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={request.user?.image}
                      alt={request.user?.name || "User"}
                      fallback={request.user?.name?.charAt(0) || "?"}
                    />
                    <div>
                      <p className="font-medium">{request.user?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => acceptRequest(request.id)}
                    >
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => rejectRequest(request.id)}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Your Friends ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No friends yet. Search to add some!
          </p>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => (
              <Card key={friend.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <Avatar
                    src={friend.image}
                    alt={friend.name}
                    fallback={friend.name.charAt(0)}
                  />
                  <div>
                    <p className="font-medium">{friend.name}</p>
                    <p className="text-sm text-muted-foreground">{friend.email}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "Add friends page with search and request management"
```

---

### Task 9.5: Create History Page

**Files:**
- Create: `app/(app)/history/page.tsx`
- Create: `app/api/history/route.ts`

**Step 1: Create history API**

```bash
mkdir -p app/api/history
```

Create `app/api/history/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMoviesByIds } from "@/lib/services/movies";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Get watched movies where user was a participant
  const { data: watched } = await supabase
    .from("watched_movies")
    .select("*")
    .contains("watched_by", [session.user.id])
    .order("watched_at", { ascending: false })
    .limit(50);

  if (!watched || watched.length === 0) {
    return NextResponse.json({ history: [] });
  }

  // Get movie details
  const movieIds = watched.map((w) => w.movie_id);
  const movies = await getMoviesByIds(movieIds);
  const movieMap = new Map(movies.map((m) => [m.tmdbId, m]));

  const history = watched.map((w) => ({
    id: w.id,
    movie: movieMap.get(w.movie_id),
    watchedAt: w.watched_at,
    watchedWith: w.watched_by.length,
  }));

  return NextResponse.json({ history });
}
```

**Step 2: Create history page**

```bash
mkdir -p app/\(app\)/history
```

Create `app/(app)/history/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Movie } from "@/types";

interface HistoryItem {
  id: string;
  movie: Movie;
  watchedAt: string;
  watchedWith: number;
}

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => {
        setHistory(data.history || []);
        setLoading(false);
      });
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Watch History</h1>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : history.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">No watch history yet</p>
          <Button onClick={() => router.push("/session/create")}>
            Start a Session
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex gap-4 py-4">
                {item.movie?.posterUrl && (
                  <img
                    src={item.movie.posterUrl}
                    alt={item.movie.title}
                    className="h-28 w-20 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold">{item.movie?.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {item.movie?.year} • {item.movie?.genres?.slice(0, 2).join(", ")}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(item.watchedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {item.watchedWith}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "Add watch history page and API"
```

---

## Phase 10: PWA & Final Polish

### Task 10.1: Add PWA Manifest

**Files:**
- Create: `public/manifest.json`
- Create: `public/icons/icon-192.png` (placeholder)
- Create: `public/icons/icon-512.png` (placeholder)

**Step 1: Create manifest**

```bash
mkdir -p public/icons
```

Create `public/manifest.json`:

```json
{
  "name": "Cinematch",
  "short_name": "Cinematch",
  "description": "Find movies to watch together with friends",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#111111",
  "theme_color": "#111111",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Step 2: Create placeholder icons**

For now, create simple placeholder icons (you'll replace with real icons later):

```bash
# Create a simple 192x192 placeholder (you'd replace this with actual icon)
echo "Placeholder for 192x192 icon" > public/icons/icon-192.png
echo "Placeholder for 512x512 icon" > public/icons/icon-512.png
```

**Note:** Replace these with actual PNG icons before production.

**Step 3: Commit**

```bash
git add .
git commit -m "Add PWA manifest for mobile home screen support"
```

---

### Task 10.2: Add Next.js Config for Images

**Files:**
- Modify: `next.config.ts`

**Step 1: Update Next.js config**

Replace `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
```

**Step 2: Commit**

```bash
git add .
git commit -m "Configure Next.js for TMDB and Google profile images"
```

---

### Task 10.3: Final Verification

**Step 1: Verify all files exist**

```bash
# Check project structure
find . -type f -name "*.ts" -o -name "*.tsx" | head -50
```

**Step 2: Run type check**

```bash
npm run build
```

Expected: Build completes without errors

**Step 3: Test locally**

```bash
npm run dev
```

Expected: App runs at localhost:3000

**Step 4: Final commit**

```bash
git add .
git commit -m "Complete Cinematch MVP implementation"
```

---

## Summary

### What's Built

1. **Authentication** - Google sign-in via NextAuth
2. **Movie Data** - TMDB + OMDb integration with caching
3. **URL Parsers** - RT, Letterboxd, ListChallenges, IMDb, generic fallback
4. **Session System** - Create, join, lobby, swiping, reveal
5. **Swipe UI** - Gesture-based card swiping with animations
6. **Friends** - Add, accept, reject friend requests
7. **History** - Track movies watched together
8. **PWA** - Mobile home screen support

### Environment Variables Needed

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
TMDB_API_KEY=
OMDB_API_KEY=
```

### To Deploy

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Future Enhancements (Post-MVP)

- Real-time updates with Supabase Realtime
- Push notifications
- Friend invite to specific sessions
- User stats and insights
- More list parsers
- Actual PWA icons
