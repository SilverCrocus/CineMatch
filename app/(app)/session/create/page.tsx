"use client";

import { useState } from "react";
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
    </main>
  );
}
