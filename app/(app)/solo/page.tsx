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
