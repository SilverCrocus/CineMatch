"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, X, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { Movie } from "@/types";

function SoloSwipeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source") || "random";
  const genre = searchParams.get("genre");
  const movie = searchParams.get("movie");

  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ source });
    if (genre) params.set("genre", genre);
    if (movie) params.set("movie", movie);

    fetch(`/api/solo/movies?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setMovies(data.movies || []);
        setLoading(false);
      });
  }, [source, genre, movie]);

  const currentMovie = movies[currentIndex];

  const handleSwipe = useCallback(
    async (liked: boolean) => {
      if (!currentMovie) return;

      if (liked) {
        await fetch("/api/solo/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ movieId: currentMovie.tmdbId }),
        });
        setSavedCount((prev) => prev + 1);
      }

      setCurrentIndex((prev) => prev + 1);
    },
    [currentMovie]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handleSwipe(false);
      if (e.key === "ArrowRight") handleSwipe(true);
    },
    [handleSwipe]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const isDone = currentIndex >= movies.length;

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {savedCount} saved
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading movies...</p>
        </div>
      ) : isDone ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="text-xl font-semibold mb-2">All done!</p>
          <p className="text-muted-foreground mb-6">
            You saved {savedCount} movies to your list
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.push("/solo")}>
              Browse more
            </Button>
            <Button onClick={() => router.push("/solo/list")}>
              View my list
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Movie Card */}
          <div className="flex-1 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentMovie.tmdbId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0"
              >
                <div className="h-full rounded-2xl overflow-hidden relative">
                  {currentMovie.posterUrl && (
                    <img
                      src={currentMovie.posterUrl}
                      alt={currentMovie.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {currentMovie.title}
                    </h2>
                    <p className="text-white/70 text-sm mb-2">
                      {currentMovie.year} • {currentMovie.genres?.slice(0, 2).join(", ")}
                    </p>
                    {currentMovie.imdbRating && (
                      <p className="text-yellow-400 text-sm">
                        {currentMovie.imdbRating}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Swipe Buttons */}
          <div className="flex justify-center gap-6 py-6">
            <button
              onClick={() => handleSwipe(false)}
              className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center hover:bg-red-500/30 transition-colors"
            >
              <X className="h-8 w-8 text-red-500" />
            </button>
            <button
              onClick={() => handleSwipe(true)}
              className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center hover:bg-green-500/30 transition-colors"
            >
              <Heart className="h-8 w-8 text-green-500" />
            </button>
          </div>

          {/* Progress */}
          <div className="text-center text-sm text-muted-foreground pb-4">
            {currentIndex + 1} / {movies.length}
          </div>
        </>
      )}
    </main>
  );
}

export default function SoloSwipePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SoloSwipeContent />
    </Suspense>
  );
}
