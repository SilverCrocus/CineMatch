# Cinematch Implementation Plan - Part 1: Foundation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the foundation for Cinematch - a mobile-friendly web app where friends swipe on movies together to find one everyone wants to watch.

**Architecture:** Next.js 14 App Router with server components, Supabase for Postgres + auth helpers, NextAuth for Google sign-in. Mobile-first responsive design with Tailwind CSS and Framer Motion for animations.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Framer Motion, Supabase (Postgres), NextAuth.js, TMDB API, OMDb API

---

## Phase 1: Project Setup

### Task 1.1: Initialize Next.js Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

**Step 1: Create Next.js app with TypeScript and Tailwind**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

Select these options if prompted:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: No
- App Router: Yes
- Import alias: @/*

**Step 2: Verify installation**

```bash
npm run dev
```

Expected: Server starts at http://localhost:3000, shows Next.js welcome page

**Step 3: Commit**

```bash
git add .
git commit -m "Initialize Next.js 14 project with TypeScript and Tailwind"
```

---

### Task 1.2: Install Core Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install production dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr next-auth framer-motion lucide-react clsx tailwind-merge
```

**Step 2: Install dev dependencies**

```bash
npm install -D @types/node prettier prettier-plugin-tailwindcss
```

**Step 3: Verify installation**

```bash
npm run dev
```

Expected: Server starts without errors

**Step 4: Commit**

```bash
git add .
git commit -m "Add core dependencies: Supabase, NextAuth, Framer Motion"
```

---

### Task 1.3: Configure Tailwind for Dark Mode & Custom Theme

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

**Step 1: Update Tailwind config**

Replace contents of `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
```

**Step 2: Update global CSS with dark theme**

Replace contents of `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 7%;
    --foreground: 0 0% 95%;
    --card: 0 0% 10%;
    --card-foreground: 0 0% 95%;
    --primary: 350 89% 60%;
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 15%;
    --secondary-foreground: 0 0% 95%;
    --muted: 0 0% 15%;
    --muted-foreground: 0 0% 65%;
    --accent: 270 70% 60%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84% 60%;
    --border: 0 0% 20%;
    --ring: 350 89% 60%;
    --radius: 0.75rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

/* Hide scrollbar but allow scrolling */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

**Step 3: Verify dark theme**

Update `app/page.tsx` temporarily:

```tsx
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary">Cinematch</h1>
        <p className="text-muted-foreground mt-2">Find movies together</p>
      </div>
    </main>
  );
}
```

Run `npm run dev` and verify dark background with coral text.

**Step 4: Commit**

```bash
git add .
git commit -m "Configure Tailwind with dark theme and custom colors"
```

---

### Task 1.4: Create Utility Functions

**Files:**
- Create: `lib/utils.ts`

**Step 1: Create utils file**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateRoomCode(length: number = 4): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "Add utility functions: cn, generateRoomCode, formatRuntime"
```

---

### Task 1.5: Set Up Project Structure

**Files:**
- Create: `lib/api/tmdb.ts` (placeholder)
- Create: `lib/api/omdb.ts` (placeholder)
- Create: `lib/parsers/index.ts` (placeholder)
- Create: `lib/db/index.ts` (placeholder)
- Create: `components/ui/.gitkeep`
- Create: `components/swipe/.gitkeep`
- Create: `components/session/.gitkeep`
- Create: `types/index.ts`

**Step 1: Create directory structure and placeholder files**

```bash
mkdir -p lib/api lib/parsers lib/db components/ui components/swipe components/session types
```

**Step 2: Create types file**

Create `types/index.ts`:

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  image: string | null;
  createdAt: Date;
}

export interface Movie {
  id: number;
  tmdbId: number;
  title: string;
  year: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  synopsis: string;
  runtime: number | null;
  tmdbRating: number | null;
  imdbRating: string | null;
  imdbId: string | null;
  streamingServices: string[];
}

export interface Session {
  id: string;
  code: string;
  hostId: string;
  status: "lobby" | "swiping" | "revealed";
  deck: number[];
  createdAt: Date;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string;
  nickname: string;
  completed: boolean;
  joinedAt: Date;
  user?: User;
}

export interface Swipe {
  id: string;
  sessionId: string;
  userId: string;
  movieId: number;
  liked: boolean;
}

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: "pending" | "accepted";
  createdAt: Date;
  friend?: User;
}

export interface WatchedMovie {
  id: string;
  sessionId: string;
  movieId: number;
  watchedBy: string[];
  watchedAt: Date;
  movie?: Movie;
}

export interface DeckSource {
  type: "filters" | "url" | "text";
  filters?: {
    genres?: number[];
    yearFrom?: number;
    yearTo?: number;
    streamingServices?: string[];
  };
  url?: string;
  textList?: string;
}
```

**Step 3: Create placeholder files**

Create `lib/api/tmdb.ts`:
```typescript
// TMDB API client - to be implemented
export {};
```

Create `lib/api/omdb.ts`:
```typescript
// OMDb API client - to be implemented
export {};
```

Create `lib/parsers/index.ts`:
```typescript
// URL parsers for movie lists - to be implemented
export {};
```

Create `lib/db/index.ts`:
```typescript
// Database queries - to be implemented
export {};
```

Create `.gitkeep` files:
```bash
touch components/ui/.gitkeep components/swipe/.gitkeep components/session/.gitkeep
```

**Step 4: Commit**

```bash
git add .
git commit -m "Set up project structure with types and placeholders"
```

---

## Phase 2: Database Setup (Supabase)

### Task 2.1: Create Supabase Project & Configure Environment

**Files:**
- Create: `.env.local`
- Create: `.env.example`
- Modify: `.gitignore`

**Step 1: Create Supabase project**

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Name: "cinematch"
4. Generate a strong database password (save it!)
5. Region: Choose closest to your users
6. Click "Create new project"
7. Wait for project to be ready (~2 minutes)

**Step 2: Get API keys**

1. In Supabase dashboard, go to Settings > API
2. Copy "Project URL" and "anon public" key

**Step 3: Create environment files**

Create `.env.local`:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_a_random_32_char_string_here

# Google OAuth (to be added)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Movie APIs (to be added)
TMDB_API_KEY=
OMDB_API_KEY=
```

Create `.env.example`:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Movie APIs
TMDB_API_KEY=
OMDB_API_KEY=
```

**Step 4: Update .gitignore**

Ensure `.env.local` is in `.gitignore` (should already be there from create-next-app).

**Step 5: Commit**

```bash
git add .env.example .gitignore
git commit -m "Add environment configuration template"
```

---

### Task 2.2: Create Database Schema

**Files:**
- Create: `supabase/schema.sql`

**Step 1: Create schema file**

```bash
mkdir -p supabase
```

Create `supabase/schema.sql`:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends NextAuth accounts)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friendships
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Cached movies from TMDB/OMDb
CREATE TABLE cached_movies (
  id SERIAL PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL,
  imdb_id VARCHAR(20),
  title VARCHAR(500) NOT NULL,
  year INTEGER,
  poster_url TEXT,
  backdrop_url TEXT,
  genres TEXT[] DEFAULT '{}',
  synopsis TEXT,
  runtime INTEGER,
  tmdb_rating DECIMAL(3,1),
  imdb_rating VARCHAR(10),
  streaming_services TEXT[] DEFAULT '{}',
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(10) UNIQUE NOT NULL,
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'swiping', 'revealed')),
  deck INTEGER[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session participants
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname VARCHAR(100),
  completed BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Swipes
CREATE TABLE swipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL,
  liked BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id, movie_id)
);

-- Watched movies history
CREATE TABLE watched_movies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  movie_id INTEGER NOT NULL,
  watched_by UUID[] NOT NULL,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_sessions_code ON sessions(code);
CREATE INDEX idx_sessions_host_id ON sessions(host_id);
CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX idx_swipes_session_id ON swipes(session_id);
CREATE INDEX idx_swipes_user_id ON swipes(user_id);
CREATE INDEX idx_cached_movies_tmdb_id ON cached_movies(tmdb_id);
CREATE INDEX idx_watched_movies_watched_by ON watched_movies USING GIN(watched_by);
```

**Step 2: Run schema in Supabase**

1. Go to Supabase dashboard > SQL Editor
2. Paste the entire schema
3. Click "Run"
4. Verify tables are created in Table Editor

**Step 3: Commit**

```bash
git add .
git commit -m "Add database schema for Supabase"
```

---

### Task 2.3: Create Supabase Client

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`

**Step 1: Create browser client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 2: Create server client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  );
}
```

**Step 3: Create middleware helper**

Create `lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "Add Supabase client utilities for browser, server, and middleware"
```

---

## Phase 3: Authentication (NextAuth + Google)

### Task 3.1: Set Up Google OAuth Credentials

**Step 1: Create Google Cloud Project**

1. Go to https://console.cloud.google.com
2. Create new project: "Cinematch"
3. Go to APIs & Services > Credentials
4. Click "Configure Consent Screen"
   - User Type: External
   - App name: Cinematch
   - User support email: your email
   - Developer contact: your email
   - Save and continue through scopes (no changes needed)
   - Add test users if in development
5. Go to Credentials > Create Credentials > OAuth Client ID
   - Application type: Web application
   - Name: Cinematch Web
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret

**Step 2: Update environment variables**

Update `.env.local` with your Google credentials:
```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

**Step 3: No commit needed** (credentials are in .env.local which is gitignored)

---

### Task 3.2: Configure NextAuth

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`

**Step 1: Create auth configuration**

Create `lib/auth.ts`:

```typescript
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@/lib/supabase/server";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const supabase = await createClient();

        // Upsert user in our database
        const { error } = await supabase
          .from("users")
          .upsert(
            {
              email: user.email!,
              name: user.name,
              image: user.image,
            },
            {
              onConflict: "email",
            }
          )
          .select()
          .single();

        if (error) {
          console.error("Error upserting user:", error);
          return false;
        }
      }
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const supabase = await createClient();
        const { data: dbUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", session.user.email)
          .single();

        if (dbUser) {
          session.user.id = dbUser.id;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
```

**Step 2: Create NextAuth API route**

Create directory and file:
```bash
mkdir -p app/api/auth/\[...nextauth\]
```

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

**Step 3: Extend NextAuth types**

Create `types/next-auth.d.ts`:

```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "Configure NextAuth with Google provider"
```

---

### Task 3.3: Create Auth Provider & Session Wrapper

**Files:**
- Create: `components/providers/auth-provider.tsx`
- Create: `components/providers/index.tsx`
- Modify: `app/layout.tsx`

**Step 1: Create auth provider**

```bash
mkdir -p components/providers
```

Create `components/providers/auth-provider.tsx`:

```typescript
"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

**Step 2: Create providers wrapper**

Create `components/providers/index.tsx`:

```typescript
"use client";

import { ReactNode } from "react";
import { AuthProvider } from "./auth-provider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
```

**Step 3: Update root layout**

Replace `app/layout.tsx`:

```typescript
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cinematch - Find Movies Together",
  description: "Swipe on movies with friends to find one everyone wants to watch",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "Add auth provider and update root layout"
```

---

### Task 3.4: Create Login Page

**Files:**
- Create: `app/login/page.tsx`
- Create: `components/ui/button.tsx`

**Step 1: Create Button component**

Create `components/ui/button.tsx`:

```typescript
import { forwardRef, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-primary text-primary-foreground hover:bg-primary/90":
              variant === "default",
            "bg-secondary text-secondary-foreground hover:bg-secondary/80":
              variant === "secondary",
            "border border-border bg-transparent hover:bg-secondary":
              variant === "outline",
            "hover:bg-secondary": variant === "ghost",
          },
          {
            "h-10 px-4 py-2": size === "default",
            "h-9 px-3 text-sm": size === "sm",
            "h-12 px-8 text-lg": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
```

**Step 2: Create login page**

Create `app/login/page.tsx`:

```typescript
"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Logo */}
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-primary">Cinematch</h1>
          <p className="text-muted-foreground">Find movies together</p>
        </div>

        {/* Description */}
        <div className="space-y-4 py-8">
          <p className="text-lg">
            Swipe on movies with friends and find one everyone wants to watch.
          </p>
        </div>

        {/* Sign in button */}
        <Button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          size="lg"
          className="w-full gap-3"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        {/* Footer */}
        <p className="text-sm text-muted-foreground">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </main>
  );
}
```

**Step 3: Verify login page**

Run `npm run dev` and navigate to http://localhost:3000/login

Expected: See login page with Google sign-in button

**Step 4: Commit**

```bash
git add .
git commit -m "Add login page with Google sign-in"
```

---

## Phase 4: Movie APIs (TMDB + OMDb)

### Task 4.1: Get API Keys

**Step 1: Get TMDB API Key**

1. Go to https://www.themoviedb.org and create account
2. Go to Settings > API
3. Request an API key (choose "Developer")
4. Fill out the form
5. Copy the "API Read Access Token" (v4 auth)

**Step 2: Get OMDb API Key**

1. Go to https://www.omdbapi.com/apikey.aspx
2. Select "Free" tier (1,000 daily limit)
3. Enter email and submit
4. Check email and activate key
5. Copy the API key

**Step 3: Update environment variables**

Update `.env.local`:
```
TMDB_API_KEY=your_tmdb_read_access_token
OMDB_API_KEY=your_omdb_api_key
```

---

### Task 4.2: Create TMDB API Client

**Files:**
- Modify: `lib/api/tmdb.ts`

**Step 1: Implement TMDB client**

Replace `lib/api/tmdb.ts`:

```typescript
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface TMDBMovie {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  overview: string;
  vote_average: number;
  runtime?: number;
}

interface TMDBMovieDetails extends TMDBMovie {
  imdb_id: string | null;
  runtime: number;
  genres: { id: number; name: string }[];
}

interface TMDBDiscoverResponse {
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

interface TMDBWatchProviders {
  results: {
    US?: {
      flatrate?: { provider_name: string }[];
      rent?: { provider_name: string }[];
      buy?: { provider_name: string }[];
    };
  };
}

const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

async function tmdbFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }

  return response.json();
}

export async function discoverMovies(filters: {
  genres?: number[];
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
    params.with_genres = filters.genres.join(",");
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

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails> {
  return tmdbFetch<TMDBMovieDetails>(`/movie/${tmdbId}`);
}

export async function getWatchProviders(tmdbId: number): Promise<string[]> {
  const data = await tmdbFetch<TMDBWatchProviders>(`/movie/${tmdbId}/watch/providers`);
  const usProviders = data.results?.US;

  if (!usProviders) return [];

  const providers = new Set<string>();
  usProviders.flatrate?.forEach((p) => providers.add(p.provider_name));

  return Array.from(providers);
}

export async function searchMovies(query: string): Promise<TMDBMovie[]> {
  const data = await tmdbFetch<TMDBDiscoverResponse>("/search/movie", {
    query,
    include_adult: "false",
  });
  return data.results;
}

export function getPosterUrl(path: string | null, size: "w185" | "w342" | "w500" | "original" = "w342"): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getBackdropUrl(path: string | null, size: "w780" | "w1280" | "original" = "w780"): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getGenreNames(genreIds: number[]): string[] {
  return genreIds.map((id) => GENRE_MAP[id]).filter(Boolean);
}

export function getYear(releaseDate: string): number {
  return new Date(releaseDate).getFullYear();
}

export { GENRE_MAP };
```

**Step 2: Commit**

```bash
git add .
git commit -m "Implement TMDB API client with discover, search, and details"
```

---

### Task 4.3: Create OMDb API Client

**Files:**
- Modify: `lib/api/omdb.ts`

**Step 1: Implement OMDb client**

Replace `lib/api/omdb.ts`:

```typescript
const OMDB_BASE_URL = "https://www.omdbapi.com";

interface OMDbMovie {
  Title: string;
  Year: string;
  imdbID: string;
  imdbRating: string;
  Ratings: {
    Source: string;
    Value: string;
  }[];
  Response: "True" | "False";
  Error?: string;
}

export interface OMDbRatings {
  imdbRating: string | null;
  rtCriticScore: string | null;
}

export async function getOMDbRatings(imdbId: string): Promise<OMDbRatings> {
  const url = new URL(OMDB_BASE_URL);
  url.searchParams.append("apikey", process.env.OMDB_API_KEY!);
  url.searchParams.append("i", imdbId);

  const response = await fetch(url.toString(), {
    next: { revalidate: 86400 }, // Cache for 24 hours
  });

  if (!response.ok) {
    throw new Error(`OMDb API error: ${response.status}`);
  }

  const data: OMDbMovie = await response.json();

  if (data.Response === "False") {
    return { imdbRating: null, rtCriticScore: null };
  }

  // Find Rotten Tomatoes rating
  const rtRating = data.Ratings?.find(
    (r) => r.Source === "Rotten Tomatoes"
  )?.Value;

  return {
    imdbRating: data.imdbRating !== "N/A" ? data.imdbRating : null,
    rtCriticScore: rtRating || null,
  };
}

export async function searchOMDb(title: string, year?: number): Promise<string | null> {
  const url = new URL(OMDB_BASE_URL);
  url.searchParams.append("apikey", process.env.OMDB_API_KEY!);
  url.searchParams.append("t", title);
  if (year) {
    url.searchParams.append("y", String(year));
  }

  const response = await fetch(url.toString(), {
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    return null;
  }

  const data: OMDbMovie = await response.json();

  if (data.Response === "False") {
    return null;
  }

  return data.imdbID;
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "Implement OMDb API client for IMDb and RT ratings"
```

---

### Task 4.4: Create Movie Service (Combines TMDB + OMDb)

**Files:**
- Create: `lib/services/movies.ts`

**Step 1: Create movie service**

```bash
mkdir -p lib/services
```

Create `lib/services/movies.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import {
  discoverMovies,
  getMovieDetails,
  getWatchProviders,
  searchMovies,
  getPosterUrl,
  getBackdropUrl,
  getGenreNames,
  getYear,
} from "@/lib/api/tmdb";
import { getOMDbRatings } from "@/lib/api/omdb";
import type { Movie } from "@/types";

export async function getOrFetchMovie(tmdbId: number): Promise<Movie | null> {
  const supabase = await createClient();

  // Check cache first
  const { data: cached } = await supabase
    .from("cached_movies")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .single();

  if (cached) {
    return {
      id: cached.id,
      tmdbId: cached.tmdb_id,
      title: cached.title,
      year: cached.year,
      posterUrl: cached.poster_url,
      backdropUrl: cached.backdrop_url,
      genres: cached.genres || [],
      synopsis: cached.synopsis || "",
      runtime: cached.runtime,
      tmdbRating: cached.tmdb_rating,
      imdbRating: cached.imdb_rating,
      imdbId: cached.imdb_id,
      streamingServices: cached.streaming_services || [],
    };
  }

  // Fetch from TMDB
  try {
    const details = await getMovieDetails(tmdbId);
    const providers = await getWatchProviders(tmdbId);

    // Get OMDb ratings if we have IMDB ID
    let omdbRatings = { imdbRating: null, rtCriticScore: null };
    if (details.imdb_id) {
      omdbRatings = await getOMDbRatings(details.imdb_id);
    }

    const movie: Omit<Movie, "id"> = {
      tmdbId: details.id,
      title: details.title,
      year: getYear(details.release_date),
      posterUrl: getPosterUrl(details.poster_path),
      backdropUrl: getBackdropUrl(details.backdrop_path),
      genres: details.genres.map((g) => g.name),
      synopsis: details.overview,
      runtime: details.runtime,
      tmdbRating: details.vote_average,
      imdbRating: omdbRatings.imdbRating,
      imdbId: details.imdb_id,
      streamingServices: providers,
    };

    // Cache the movie
    const { data: inserted, error } = await supabase
      .from("cached_movies")
      .insert({
        tmdb_id: movie.tmdbId,
        imdb_id: movie.imdbId,
        title: movie.title,
        year: movie.year,
        poster_url: movie.posterUrl,
        backdrop_url: movie.backdropUrl,
        genres: movie.genres,
        synopsis: movie.synopsis,
        runtime: movie.runtime,
        tmdb_rating: movie.tmdbRating,
        imdb_rating: movie.imdbRating,
        streaming_services: movie.streamingServices,
      })
      .select()
      .single();

    if (error) {
      console.error("Error caching movie:", error);
      return { ...movie, id: 0 };
    }

    return { ...movie, id: inserted.id };
  } catch (error) {
    console.error("Error fetching movie:", error);
    return null;
  }
}

export async function buildDeckFromFilters(filters: {
  genres?: number[];
  yearFrom?: number;
  yearTo?: number;
  count?: number;
}): Promise<number[]> {
  const count = filters.count || 25;
  const tmdbIds: number[] = [];
  let page = 1;

  while (tmdbIds.length < count && page <= 5) {
    const { movies } = await discoverMovies({ ...filters, page });

    for (const movie of movies) {
      if (tmdbIds.length >= count) break;
      tmdbIds.push(movie.id);
    }

    page++;
  }

  // Pre-fetch and cache all movies
  await Promise.all(tmdbIds.map((id) => getOrFetchMovie(id)));

  return tmdbIds;
}

export async function buildDeckFromTitles(titles: string[]): Promise<number[]> {
  const tmdbIds: number[] = [];

  for (const title of titles) {
    const results = await searchMovies(title);
    if (results.length > 0) {
      tmdbIds.push(results[0].id);
    }
  }

  // Pre-fetch and cache all movies
  await Promise.all(tmdbIds.map((id) => getOrFetchMovie(id)));

  return tmdbIds;
}

export async function getMoviesByIds(tmdbIds: number[]): Promise<Movie[]> {
  const movies = await Promise.all(tmdbIds.map((id) => getOrFetchMovie(id)));
  return movies.filter((m): m is Movie => m !== null);
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "Add movie service combining TMDB and OMDb with caching"
```

---

## End of Part 1

This completes the foundation:
- Project setup with Next.js, Tailwind, dark theme
- Database schema in Supabase
- Authentication with Google sign-in
- Movie data fetching from TMDB + OMDb with caching

**Continue to Part 2** for:
- URL parsers (RT, Letterboxd, ListChallenges, IMDb)
- Session management APIs
- Swipe mechanics
- Friends system
- All UI components and screens
