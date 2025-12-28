"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, X, Heart, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { Movie } from "@/types";

// Build Rotten Tomatoes search URL as fallback when rtUrl is not available
function buildRTSearchUrl(title: string): string {
  return `https://www.rottentomatoes.com/search?search=${encodeURIComponent(title)}`;
}

// Get the best RT URL - prefer direct URL from API, fallback to search
function getRTUrl(movie: Movie): string {
  return movie.rtUrl || buildRTSearchUrl(movie.title);
}

function SoloSwipeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source") || "random";
  const genre = searchParams.get("genre");
  const movieParam = searchParams.get("movie");

  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const moviesRef = useRef<Movie[]>([]);

  useEffect(() => {
    const params = new URLSearchParams({ source });
    if (genre) params.set("genre", genre);
    if (movieParam) params.set("movie", movieParam);

    // Use SSE streaming endpoint
    const eventSource = new EventSource(`/api/solo/movies/stream?${params}`);

    eventSource.addEventListener("movie", (event) => {
      const movie: Movie = JSON.parse(event.data);
      moviesRef.current = [...moviesRef.current, movie];
      setMovies([...moviesRef.current]);
      setLoading(false); // Stop loading as soon as first movie arrives
    });

    eventSource.addEventListener("rt:update", (event) => {
      const rtData = JSON.parse(event.data);
      // Update the movie with RT data
      moviesRef.current = moviesRef.current.map((m) =>
        m.imdbId === rtData.imdbId
          ? {
              ...m,
              rtCriticScore: rtData.rtCriticScore || m.rtCriticScore,
              rtAudienceScore: rtData.rtAudienceScore,
              rtUrl: rtData.rtUrl,
            }
          : m
      );
      setMovies([...moviesRef.current]);
    });

    eventSource.addEventListener("done", () => {
      eventSource.close();
    });

    eventSource.addEventListener("error", () => {
      eventSource.close();
      // If no movies loaded, show error state
      if (moviesRef.current.length === 0) {
        setLoading(false);
      }
    });

    return () => {
      eventSource.close();
      moviesRef.current = [];
    };
  }, [source, genre, movieParam]);

  const currentMovie = movies[currentIndex];

  // Reset expanded state when movie changes
  useEffect(() => {
    setExpanded(false);
  }, [currentIndex]);

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
      if (e.key === " " || e.key === "Enter") setExpanded((prev) => !prev);
    },
    [handleSwipe]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const isDone = currentIndex >= movies.length;

  const handleCardClick = () => {
    setExpanded((prev) => !prev);
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't toggle expanded when clicking links
  };

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
                className="absolute inset-0 cursor-pointer"
                onClick={handleCardClick}
              >
                <div className="h-full rounded-2xl overflow-hidden relative">
                  {currentMovie.posterUrl && (
                    <img
                      src={currentMovie.posterUrl}
                      alt={currentMovie.title}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Gradient Overlay - darker when expanded */}
                  <motion.div
                    className="absolute inset-0"
                    animate={{
                      background: expanded
                        ? "linear-gradient(to top, rgba(0,0,0,0.95) 60%, rgba(0,0,0,0.7) 100%)"
                        : "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)"
                    }}
                    transition={{ duration: 0.3 }}
                  />

                  {/* Tap for synopsis hint */}
                  <motion.div
                    className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full"
                    animate={{ opacity: expanded ? 0 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="text-white/60 text-xs">Tap for synopsis</span>
                  </motion.div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    {/* Synopsis - shown when expanded */}
                    <motion.div
                      className="mb-4 max-h-48 overflow-y-auto"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{
                        opacity: expanded ? 1 : 0,
                        y: expanded ? 0 : 20
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="text-white/90 text-sm leading-relaxed">
                        {currentMovie.synopsis || "No synopsis available."}
                      </p>
                    </motion.div>

                    {/* Title & Meta */}
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {currentMovie.title}
                    </h2>
                    <p className="text-white/70 text-sm mb-3">
                      {currentMovie.year} {currentMovie.runtime && `• ${currentMovie.runtime} min`} • {currentMovie.genres?.slice(0, 2).join(", ")}
                    </p>

                    {/* Links Row */}
                    <div className="flex items-center gap-3">
                      {/* IMDB Link */}
                      {currentMovie.imdbId && (
                        <a
                          href={`https://www.imdb.com/title/${currentMovie.imdbId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleLinkClick}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-full transition-colors"
                        >
                          <ExternalLink className="w-3 h-3 text-yellow-400" />
                          <span className="text-yellow-400 text-xs font-medium">
                            IMDB {currentMovie.imdbRating || ""}
                          </span>
                        </a>
                      )}

                      {/* RT Critic Score/Link */}
                      {currentMovie.rtCriticScore && (
                        <a
                          href={getRTUrl(currentMovie)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleLinkClick}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-full transition-colors"
                        >
                          <span className="text-sm">🍅</span>
                          <span className="text-red-400 text-xs font-medium">
                            {currentMovie.rtCriticScore}
                          </span>
                        </a>
                      )}

                      {/* RT Audience Score */}
                      {currentMovie.rtAudienceScore && (
                        <a
                          href={getRTUrl(currentMovie)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleLinkClick}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 rounded-full transition-colors"
                        >
                          <span className="text-sm">🍿</span>
                          <span className="text-orange-400 text-xs font-medium">
                            {currentMovie.rtAudienceScore}
                          </span>
                        </a>
                      )}

                      {/* Fallback if no RT score but we want to show something */}
                      {!currentMovie.rtCriticScore && !currentMovie.imdbId && currentMovie.imdbRating && (
                        <span className="text-yellow-400 text-sm font-medium">
                          ⭐ {currentMovie.imdbRating}
                        </span>
                      )}
                    </div>
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
