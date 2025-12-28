"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Movie } from "@/types";

function getIMDbUrl(imdbId: string): string {
  return `https://www.imdb.com/title/${imdbId}`;
}

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
        <div className="grid grid-cols-2 gap-3">
          {watchlist.map((item) => (
            <Card key={item.id} className="overflow-hidden relative">
              {/* Clickable poster area */}
              <a
                href={item.movie?.imdbId ? getIMDbUrl(item.movie.imdbId) : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {item.movie?.posterUrl ? (
                  <img
                    src={item.movie.posterUrl}
                    alt={item.movie.title}
                    className="w-full aspect-[2/3] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-xs">No poster</span>
                  </div>
                )}
                {/* Always visible gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
              </a>

              {/* Always visible info */}
              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                <p className="text-white text-sm font-medium truncate">
                  {item.movie?.title}
                </p>
                <p className="text-white/60 text-xs mb-1.5">
                  {item.movie?.year}
                </p>

                {/* Scores - always visible */}
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  {item.movie?.imdbRating && (
                    <span className="text-yellow-400 text-xs bg-black/40 px-1.5 py-0.5 rounded">
                      ⭐ {item.movie.imdbRating}
                    </span>
                  )}
                  {item.movie?.rtCriticScore && (
                    <span className="text-red-400 text-xs bg-black/40 px-1.5 py-0.5 rounded">
                      🍅 {item.movie.rtCriticScore}
                    </span>
                  )}
                  {item.movie?.rtAudienceScore && (
                    <span className="text-orange-400 text-xs bg-black/40 px-1.5 py-0.5 rounded">
                      🍿 {item.movie.rtAudienceScore}
                    </span>
                  )}
                </div>

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemove(item.movieId);
                  }}
                  className="text-red-400 text-xs flex items-center gap-1 hover:text-red-300 bg-black/40 px-2 py-1 rounded"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>

              {/* External link indicator */}
              {item.movie?.imdbId && (
                <div className="absolute top-2 right-2 bg-black/50 p-1 rounded">
                  <ExternalLink className="h-3 w-3 text-white/70" />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
