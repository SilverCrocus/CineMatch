"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Filter, Link, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GENRE_MAP } from "@/lib/api/tmdb";

type Tab = "filters" | "url" | "text";

const GENRES = Object.entries(GENRE_MAP).map(([id, name]) => ({
  id: parseInt(id),
  name,
}));

// Fun loading messages for URL parsing
const LOADING_MESSAGES = [
  "🎬 Scanning the movie list...",
  "🍿 Popping some popcorn while we work...",
  "🎥 Rolling the film reel...",
  "🌟 Gathering the stars...",
  "📽️ Rewinding to find the classics...",
  "🎞️ Processing frames of greatness...",
  "🎭 Assembling the cast...",
  "🏆 Picking the award winners...",
  "🎪 Setting up the cinema...",
  "🎯 Curating your selection...",
];

export default function CreateSessionPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("filters");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

  // Filters state
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");

  // URL state
  const [url, setUrl] = useState("");

  // Text state
  const [textList, setTextList] = useState("");

  // Cycle through loading messages
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingMessage((prev) => {
        const currentIndex = LOADING_MESSAGES.indexOf(prev);
        const nextIndex = (currentIndex + 1) % LOADING_MESSAGES.length;
        return LOADING_MESSAGES[nextIndex];
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    setLoading(true);
    setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);

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
                Paste any URL with a movie list — our AI will extract the titles
              </p>
              <Input
                placeholder="https://rottentomatoes.com/... or any movie list URL"
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
                placeholder={"The Shawshank Redemption\nPulp Fiction\nThe Dark Knight"}
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

      {/* Full-screen loading overlay for URL parsing */}
      {loading && activeTab === "url" && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="text-center space-y-6">
            <div className="text-6xl animate-bounce">🎬</div>
            <div className="space-y-2">
              <p className="text-xl font-medium">{loadingMessage}</p>
              <p className="text-sm text-muted-foreground">
                Our AI is extracting movies from the page
              </p>
            </div>
            <div className="flex justify-center gap-1">
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
