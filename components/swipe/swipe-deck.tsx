"use client";

import { useState, useRef } from "react";
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

  // Track swipe direction for exit animation
  const swipeDirectionRef = useRef<"left" | "right" | null>(null);

  const handleSwipe = (liked: boolean) => {
    const movie = movies[currentIndex];
    if (movie) {
      onSwipe(movie.tmdbId, liked);
    }

    // Set direction for exit animation
    swipeDirectionRef.current = liked ? "right" : "left";

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    if (nextIndex >= movies.length) {
      onComplete();
    }
  };

  const progress = Math.min(currentIndex, movies.length);

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
      {/* Card Stack */}
      <div className="flex-1 relative mx-4 my-4">
        <AnimatePresence mode="popLayout">
          {movies.slice(currentIndex, currentIndex + 2).reverse().map((movie, i) => (
            <SwipeCard
              key={movie.tmdbId}
              movie={movie}
              onSwipe={handleSwipe}
              isTop={i === (currentIndex + 1 < movies.length ? 1 : 0)}
              exitDirection={swipeDirectionRef.current}
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

      {/* Progress */}
      <div className="text-center text-sm text-muted-foreground pb-4">
        {progress + 1} / {movies.length}
      </div>
    </div>
  );
}
