# Cinematch UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Cinematch from a basic dark UI to a premium "Cinematic Bento" design with Midnight Premium palette, glass overlays, and theatrical animations.

**Architecture:** Mobile-first redesign touching global styles, all UI components, and 5 main screens (Login, Dashboard, Swipe, Lobby, Reveal). Uses existing Next.js + Tailwind v4 stack with Framer Motion for animations.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Framer Motion, Syne + Outfit fonts (Google Fonts)

---

## Task 1: Update Global Styles & Color Palette

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Step 1: Update the color palette in globals.css**

Replace the entire `@theme` block in `app/globals.css` with the Midnight Premium palette:

```css
@import "tailwindcss";

/* Midnight Premium Theme */
@theme {
  /* Background colors */
  --color-background: #0a0e1a;
  --color-foreground: #f0f2f7;
  --color-card: #131927;
  --color-card-hover: #1a2236;
  --color-card-foreground: #f0f2f7;
  --color-elevated: #1e2640;

  /* Primary - Silver accent */
  --color-primary: #c4cee4;
  --color-primary-foreground: #0a0e1a;

  /* Secondary */
  --color-secondary: #1e2640;
  --color-secondary-foreground: #f0f2f7;

  /* Muted */
  --color-muted: #1e2640;
  --color-muted-foreground: #5a6a8a;

  /* Accent */
  --color-accent: #94a3c2;
  --color-accent-foreground: #0a0e1a;

  /* Text hierarchy */
  --color-text-primary: #f0f2f7;
  --color-text-secondary: #94a3c2;
  --color-text-muted: #5a6a8a;

  /* Borders & effects */
  --color-border: rgba(148, 163, 194, 0.12);
  --color-border-medium: rgba(148, 163, 194, 0.2);
  --color-ring: #c4cee4;
  --color-glow: rgba(196, 206, 228, 0.15);

  /* Glass effect */
  --color-glass: rgba(10, 14, 26, 0.75);
  --color-glass-border: rgba(255, 255, 255, 0.08);

  /* Destructive */
  --color-destructive: #e85d75;

  /* Border radius */
  --radius-lg: 1rem;
  --radius-md: 0.75rem;
  --radius-sm: 0.5rem;
  --radius-xl: 1.25rem;
  --radius-2xl: 1.5rem;

  /* Fonts */
  --font-sans: var(--font-outfit), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-syne), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
}

/* Base styles */
* {
  border-color: var(--color-border);
}

body {
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans);
}

/* Hide scrollbar but allow scrolling */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Glass effect utility */
.glass {
  background: var(--color-glass);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: 1px solid var(--color-glass-border);
}

/* Glow effect utility */
.glow {
  box-shadow: 0 0 60px rgba(196, 206, 228, 0.15);
}
```

**Step 2: Add Syne and Outfit fonts to layout.tsx**

Update `app/layout.tsx` to import and configure the new fonts:

```tsx
import type { Metadata } from "next";
import { Outfit, Syne } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cinematch",
  description: "Find movies together",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${syne.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Step 3: Verify the app still runs**

Run: `npm run dev`
Expected: App starts without errors, background should now be darker (#0a0e1a)

**Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: update to Midnight Premium color palette and add Syne/Outfit fonts"
```

---

## Task 2: Update Button Component

**Files:**
- Modify: `components/ui/button.tsx`

**Step 1: Update the button component with new styles**

Replace the entire `components/ui/button.tsx`:

```tsx
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
          // Base styles
          "inline-flex items-center justify-center whitespace-nowrap font-display font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          // Variants
          {
            // Primary - silver accent
            "bg-primary text-primary-foreground rounded-xl shadow-[0_4px_16px_rgba(196,206,228,0.25)] hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(196,206,228,0.35)]":
              variant === "default",
            // Secondary - elevated surface
            "bg-elevated text-foreground rounded-xl hover:bg-card-hover":
              variant === "secondary",
            // Outline
            "border border-border-medium bg-transparent rounded-xl hover:bg-secondary":
              variant === "outline",
            // Ghost
            "hover:bg-secondary rounded-lg": variant === "ghost",
          },
          // Sizes
          {
            "h-12 px-6 text-base": size === "default",
            "h-10 px-4 text-sm": size === "sm",
            "h-14 px-8 text-lg": size === "lg",
            "h-10 w-10 rounded-lg": size === "icon",
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

**Step 2: Verify buttons render correctly**

Run: `npm run dev`
Navigate to login page, verify the "Continue with Google" button has the new silver style.

**Step 3: Commit**

```bash
git add components/ui/button.tsx
git commit -m "feat: update Button component with Midnight Premium styling"
```

---

## Task 3: Update Card Component with Borderless Depth

**Files:**
- Modify: `components/ui/card.tsx`

**Step 1: Update the card component**

Replace the entire `components/ui/card.tsx`:

```tsx
import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "hero" | "interactive";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base - borderless with depth
          "rounded-2xl bg-gradient-to-br from-card to-[#101625] shadow-[0_4px_12px_rgba(0,0,0,0.3),0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-300",
          // Variants
          {
            "": variant === "default",
            // Hero card - larger with glow
            "from-[#1a2847] via-card to-[#1a1f35] relative overflow-hidden":
              variant === "hero",
            // Interactive - lifts on tap
            "cursor-pointer active:scale-[0.98] hover:bg-card-hover hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(0,0,0,0.4),0_4px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]":
              variant === "interactive",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("font-display font-bold text-lg leading-none tracking-tight", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-text-secondary", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
```

**Step 2: Commit**

```bash
git add components/ui/card.tsx
git commit -m "feat: update Card component with borderless depth styling"
```

---

## Task 4: Update Input Component

**Files:**
- Modify: `components/ui/input.tsx`

**Step 1: Update the input component**

Replace the entire `components/ui/input.tsx`:

```tsx
import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl bg-elevated border border-border px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
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

**Step 2: Commit**

```bash
git add components/ui/input.tsx
git commit -m "feat: update Input component with new styling"
```

---

## Task 5: Create Logo Component

**Files:**
- Create: `components/ui/logo.tsx`

**Step 1: Create the logo component**

Create `components/ui/logo.tsx`:

```tsx
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "default" | "lg";
  className?: string;
  showGlow?: boolean;
}

export function Logo({ size = "default", className, showGlow = false }: LogoProps) {
  const sizes = {
    sm: { width: 120, height: 60 },
    default: { width: 200, height: 100 },
    lg: { width: 280, height: 140 },
  };

  const { width, height } = sizes[size];

  return (
    <div className={cn("relative", className)}>
      {showGlow && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse,rgba(196,206,228,0.15)_0%,transparent_70%)] blur-xl pointer-events-none"
          aria-hidden="true"
        />
      )}
      <Image
        src="/logo.png"
        alt="Cinematch"
        width={width}
        height={height}
        className="relative z-10"
        priority
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/ui/logo.tsx
git commit -m "feat: create Logo component with optional glow effect"
```

---

## Task 6: Redesign Login Page

**Files:**
- Modify: `app/login/page.tsx`

**Step 1: Update the login page**

Replace the entire `app/login/page.tsx`:

```tsx
"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(196,206,228,0.08)_0%,transparent_70%)] pointer-events-none"
        aria-hidden="true"
      />

      <div className="w-full max-w-sm space-y-8 text-center relative z-10">
        {/* Logo */}
        <div className="space-y-4">
          <Logo size="lg" showGlow className="mx-auto" />
          <p className="text-text-secondary text-lg">Find movies together</p>
        </div>

        {/* Sign in button */}
        <div className="pt-8">
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
        </div>

        {/* Footer */}
        <p className="text-sm text-muted-foreground pt-4">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </main>
  );
}
```

**Step 2: Verify the login page**

Run: `npm run dev`
Navigate to `/login`, verify the new design with logo, glow effect, and styled button.

**Step 3: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: redesign login page with new branding"
```

---

## Task 7: Redesign Dashboard with Bento Layout

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

**Step 1: Update the dashboard page**

Replace the entire `app/(app)/dashboard/page.tsx`:

```tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Users, History, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <main className="min-h-screen p-5 max-w-lg mx-auto">
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
            <p className="font-display font-semibold text-lg">{session?.user?.name}</p>
            <p className="text-sm text-muted-foreground">Welcome back!</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => signOut()}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Hero Card - Create Session */}
        <Card variant="hero" className="col-span-2 p-7">
          {/* Glow effect */}
          <div
            className="absolute -top-1/2 -right-1/4 w-[250px] h-[250px] bg-[radial-gradient(circle,rgba(196,206,228,0.1)_0%,transparent_70%)] pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-[0_4px_16px_rgba(196,206,228,0.2)]">
              <Plus className="h-7 w-7 text-primary-foreground" />
            </div>
            <h2 className="font-display font-bold text-xl mb-2">New Session</h2>
            <p className="text-text-secondary mb-5">
              Create a movie night and invite friends
            </p>
            <Button
              className="w-full"
              onClick={() => router.push("/session/create")}
            >
              Create Session
            </Button>
          </div>
        </Card>

        {/* Join Session Card */}
        <Card className="col-span-2 p-5">
          <h3 className="font-display font-semibold mb-1">Join Session</h3>
          <p className="text-sm text-text-secondary mb-4">Enter a room code to join</p>
          <div className="flex gap-3">
            <Input
              placeholder="Code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="font-mono tracking-widest uppercase"
            />
            <Button
              variant="secondary"
              onClick={handleJoinSession}
              disabled={joining || !joinCode.trim()}
              className="px-6"
            >
              {joining ? "..." : "Join"}
            </Button>
          </div>
        </Card>

        {/* Friends Card */}
        <Card
          variant="interactive"
          className="p-6 flex flex-col items-center text-center"
          onClick={() => router.push("/friends")}
        >
          <div className="w-12 h-12 rounded-xl bg-glow flex items-center justify-center mb-3">
            <Users className="h-6 w-6 text-accent" />
          </div>
          <span className="font-display font-semibold">Friends</span>
          <span className="text-sm text-muted-foreground">12 online</span>
        </Card>

        {/* History Card */}
        <Card
          variant="interactive"
          className="p-6 flex flex-col items-center text-center"
          onClick={() => router.push("/history")}
        >
          <div className="w-12 h-12 rounded-xl bg-glow flex items-center justify-center mb-3">
            <History className="h-6 w-6 text-accent" />
          </div>
          <span className="font-display font-semibold">History</span>
          <span className="text-sm text-muted-foreground">8 sessions</span>
        </Card>
      </div>
    </main>
  );
}
```

**Step 2: Verify the dashboard**

Run: `npm run dev`
Log in and verify the bento grid layout with hero card, join section, and smaller tiles.

**Step 3: Commit**

```bash
git add app/(app)/dashboard/page.tsx
git commit -m "feat: redesign dashboard with bento grid layout"
```

---

## Task 8: Redesign Swipe Card with Glass Overlay

**Files:**
- Modify: `components/swipe/swipe-card.tsx`

**Step 1: Update the swipe card component**

Replace the entire `components/swipe/swipe-card.tsx`:

```tsx
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
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
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
      <div className="relative w-full h-full rounded-3xl overflow-hidden bg-card shadow-[0_24px_48px_rgba(0,0,0,0.5)]">
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
          <div className="w-full h-full bg-gradient-to-b from-[#1e3a5f] to-[#0d1f33] flex items-center justify-center">
            <span className="text-6xl opacity-30">🎬</span>
          </div>
        )}

        {/* Like/Nope Indicators */}
        <motion.div
          className="absolute top-8 right-8 px-5 py-2 border-4 border-[#5de890] rounded-xl rotate-12 bg-black/20"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-2xl font-display font-bold text-[#5de890]">LIKE</span>
        </motion.div>
        <motion.div
          className="absolute top-8 left-8 px-5 py-2 border-4 border-[#e85d75] rounded-xl -rotate-12 bg-black/20"
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-2xl font-display font-bold text-[#e85d75]">NOPE</span>
        </motion.div>

        {/* Glass Overlay Panel */}
        <div className="absolute bottom-0 left-0 right-0 p-6 glass">
          {/* Title & Year */}
          <div className="mb-3">
            <h2 className="text-2xl font-display font-bold text-white">{movie.title}</h2>
            <p className="text-white/60">{movie.year}</p>
          </div>

          {/* Ratings & Runtime */}
          <div className="flex items-center gap-5 mb-3">
            {movie.imdbRating && (
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="text-white text-sm font-medium">{movie.imdbRating}</span>
              </div>
            )}
            {movie.rtCriticScore && (
              <div className="flex items-center gap-1.5">
                <span className="text-red-500 text-xs font-bold">🍅</span>
                <span className="text-white text-sm">{movie.rtCriticScore}</span>
              </div>
            )}
            {movie.runtime && (
              <div className="flex items-center gap-1.5 text-white/60">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{formatRuntime(movie.runtime)}</span>
              </div>
            )}
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-2 mb-3">
            {movie.genres.slice(0, 3).map((genre) => (
              <Badge
                key={genre}
                variant="secondary"
                className="bg-white/10 text-white/80 border-0"
              >
                {genre}
              </Badge>
            ))}
          </div>

          {/* Synopsis */}
          <p className="text-white/70 text-sm line-clamp-2 leading-relaxed">
            {movie.synopsis}
          </p>

          {/* Streaming Services */}
          {movie.streamingServices.length > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
              <span className="text-white/40 text-xs">Available on:</span>
              <span className="text-white/70 text-xs">
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
git add components/swipe/swipe-card.tsx
git commit -m "feat: redesign swipe card with glass overlay panel"
```

---

## Task 9: Redesign Session Lobby

**Files:**
- Modify: `app/(app)/session/[id]/page.tsx` (lobby section only)

**Step 1: Update the lobby view in the session page**

This is a partial update. Find the `// LOBBY VIEW` section in `app/(app)/session/[id]/page.tsx` and replace it with:

```tsx
  // LOBBY VIEW
  if (session.status === "lobby") {
    return (
      <main className="min-h-screen p-5 max-w-lg mx-auto">
        <div className="text-center pt-8">
          <h1 className="text-2xl font-display font-bold mb-2">Session Lobby</h1>
          <p className="text-text-secondary mb-8">
            Share the code with friends to join
          </p>

          {/* Room Code Card */}
          <Card className="mb-8 p-8">
            <div className="text-4xl font-mono font-bold tracking-[0.2em] mb-5 bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">
              {session.code}
            </div>
            <Button variant="secondary" onClick={copyCode} className="gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy Code
                </>
              )}
            </Button>
          </Card>

          {/* Participants */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4 text-text-secondary">
              <Users className="h-5 w-5" />
              <span>{session.participants.length} joined</span>
            </div>
            <div className="flex justify-center gap-2 flex-wrap">
              {session.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 bg-card rounded-full pl-1 pr-4 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                >
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
          {session.isHost ? (
            <Button size="lg" onClick={startSession} className="w-full gap-2">
              <Play className="h-5 w-5" />
              Start Swiping ({session.movies.length} movies)
            </Button>
          ) : (
            <p className="text-muted-foreground">
              Waiting for host to start...
            </p>
          )}
        </div>
      </main>
    );
  }
```

**Step 2: Commit**

```bash
git add app/(app)/session/[id]/page.tsx
git commit -m "feat: redesign session lobby with new styling"
```

---

## Task 10: Redesign Match Reveal Screen

**Files:**
- Modify: `app/(app)/session/[id]/page.tsx` (revealed section only)

**Step 1: Update the revealed view in the session page**

Find the `// REVEALED VIEW` section and replace it with:

```tsx
  // REVEALED VIEW
  return (
    <main className="min-h-screen p-5 max-w-lg mx-auto">
      <div className="text-center pt-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="mb-8"
        >
          <div className="text-5xl mb-4">
            {matches.length > 0 ? "🎉" : "😢"}
          </div>
          <h1 className="text-3xl font-display font-bold mb-2 bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">
            {matches.length > 0 ? "You matched!" : "No matches"}
          </h1>
          <p className="text-text-secondary">
            {matches.length > 0
              ? `${matches.length} movie${matches.length > 1 ? "s" : ""} everyone liked`
              : "Try again with different filters"}
          </p>
        </motion.div>

        {matches.length > 0 && (
          <div className="space-y-3 mb-8">
            <AnimatePresence>
              {matches.map((movie, i) => (
                <motion.div
                  key={movie.tmdbId}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1, type: "spring" }}
                >
                  <Card
                    variant="interactive"
                    className={`flex items-center gap-4 p-4 ${
                      selectedMovie === movie.tmdbId
                        ? "ring-2 ring-primary shadow-[0_0_20px_rgba(196,206,228,0.2)]"
                        : ""
                    }`}
                    onClick={() => selectMovie(movie.tmdbId)}
                  >
                    {movie.posterUrl && (
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="h-20 w-14 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    <div className="text-left flex-1 min-w-0">
                      <h3 className="font-display font-semibold truncate">{movie.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {movie.year} • {movie.genres.slice(0, 2).join(", ")}
                      </p>
                      {movie.imdbRating && (
                        <p className="text-sm text-text-secondary mt-1">⭐ {movie.imdbRating}</p>
                      )}
                    </div>
                    {selectedMovie === movie.tmdbId && (
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => router.push("/dashboard")}
        >
          Back to Dashboard
        </Button>
      </div>
    </main>
  );
```

**Step 2: Commit**

```bash
git add app/(app)/session/[id]/page.tsx
git commit -m "feat: redesign match reveal screen with animations"
```

---

## Task 11: Update Badge Component

**Files:**
- Modify: `components/ui/badge.tsx`

**Step 1: Update the badge component**

Replace the entire `components/ui/badge.tsx`:

```tsx
import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline";
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
          {
            "bg-primary text-primary-foreground": variant === "default",
            "bg-secondary text-secondary-foreground": variant === "secondary",
            "border border-border bg-transparent": variant === "outline",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
```

**Step 2: Commit**

```bash
git add components/ui/badge.tsx
git commit -m "feat: update Badge component styling"
```

---

## Task 12: Update Avatar Component

**Files:**
- Modify: `components/ui/avatar.tsx`

**Step 1: Update the avatar component**

Replace the entire `components/ui/avatar.tsx`:

```tsx
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
  const sizes = {
    sm: "w-7 h-7 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden flex-shrink-0",
        sizes[size],
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={48}
          height={48}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-display font-bold text-primary-foreground">
          {fallback}
        </span>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/ui/avatar.tsx
git commit -m "feat: update Avatar component with gradient styling"
```

---

## Task 13: Final Testing & Cleanup

**Step 1: Run the development server**

```bash
npm run dev
```

**Step 2: Manual testing checklist**

Test each screen on mobile viewport (375px width):
- [ ] Login page: Logo displays with glow, button works
- [ ] Dashboard: Bento grid layout, all cards clickable
- [ ] Join session: Input and button aligned properly
- [ ] Session lobby: Code displays, copy works, participants show
- [ ] Swipe screen: Glass overlay visible, swipe gestures work
- [ ] Match reveal: Animations play, cards selectable

**Step 3: Run lint check**

```bash
npm run lint
```

Fix any lint errors if present.

**Step 4: Run build**

```bash
npm run build
```

Ensure build completes without errors.

**Step 5: Final commit**

```bash
git add .
git commit -m "chore: final cleanup and lint fixes"
```

---

## Summary

This plan transforms Cinematch with:
- **Midnight Premium palette** — Deep navy/charcoal with silver accents
- **Syne + Outfit typography** — Bold display headings, clean body text
- **Borderless depth cards** — Shadow-based depth, no visible borders
- **Glass overlay swipe cards** — Frosted panel over movie posters
- **Bento grid dashboard** — Mixed hierarchy with hero card
- **Theatrical animations** — Spring physics, staggered reveals

Total: 13 tasks, ~45 minutes to implement
