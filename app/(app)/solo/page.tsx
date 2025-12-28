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

const YEAR_PRESETS: { label: string; value: string; from?: number; to?: number }[] = [
  { label: "Any", value: "any" },
  { label: "2020s", value: "2020s", from: 2020, to: 2029 },
  { label: "2010s", value: "2010s", from: 2010, to: 2019 },
  { label: "2000s", value: "2000s", from: 2000, to: 2009 },
  { label: "90s", value: "90s", from: 1990, to: 1999 },
  { label: "80s & older", value: "classic", from: undefined, to: 1989 },
  { label: "Custom", value: "custom" },
];

type Mode = "menu" | "similar-search" | "genre-select";

export default function SoloModePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("menu");
  const [searchQuery, setSearchQuery] = useState("");

  // New filter state
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [matchMode, setMatchMode] = useState<"any" | "all">("any");
  const [yearPreset, setYearPreset] = useState<string>("any");
  const [customYearFrom, setCustomYearFrom] = useState<number>(1990);
  const [customYearTo, setCustomYearTo] = useState<number>(new Date().getFullYear());

  const handleSimilarSearch = () => {
    if (!searchQuery.trim()) return;
    router.push(`/solo/swipe?source=similar&movie=${encodeURIComponent(searchQuery)}`);
  };

  const handleSurpriseMe = () => {
    router.push("/solo/swipe?source=random");
  };

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

  const handleBackToMenu = () => {
    setMode("menu");
    setSelectedGenres([]);
    setYearPreset("any");
    setMatchMode("any");
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
          {mode === "genre-select" && "Browse Movies"}
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

          <Button variant="ghost" onClick={handleBackToMenu}>
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
    </main>
  );
}
