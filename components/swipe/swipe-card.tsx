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
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
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
      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-card shadow-2xl">
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
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <span className="text-muted-foreground">No poster</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

        {/* Like/Nope Indicators */}
        <motion.div
          className="absolute top-8 right-8 px-4 py-2 border-4 border-green-500 rounded-lg rotate-12"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-2xl font-bold text-green-500">LIKE</span>
        </motion.div>
        <motion.div
          className="absolute top-8 left-8 px-4 py-2 border-4 border-red-500 rounded-lg -rotate-12"
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-2xl font-bold text-red-500">NOPE</span>
        </motion.div>

        {/* Movie Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
          {/* Title & Year */}
          <div>
            <h2 className="text-2xl font-bold text-white">{movie.title}</h2>
            <p className="text-white/70">{movie.year}</p>
          </div>

          {/* Ratings */}
          <div className="flex items-center gap-4">
            {movie.imdbRating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="text-white text-sm">{movie.imdbRating}</span>
              </div>
            )}
            {movie.rtCriticScore && (
              <div className="flex items-center gap-1">
                <span className="text-red-500 text-xs font-bold">RT</span>
                <span className="text-white text-sm">{movie.rtCriticScore}</span>
              </div>
            )}
            {movie.runtime && (
              <div className="flex items-center gap-1 text-white/70">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{formatRuntime(movie.runtime)}</span>
              </div>
            )}
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-2">
            {movie.genres.slice(0, 3).map((genre) => (
              <Badge key={genre} variant="secondary" className="bg-white/20 text-white">
                {genre}
              </Badge>
            ))}
          </div>

          {/* Synopsis */}
          <p className="text-white/80 text-sm line-clamp-3">{movie.synopsis}</p>

          {/* Streaming */}
          {movie.streamingServices.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-xs">Available on:</span>
              <span className="text-white text-xs">
                {movie.streamingServices.slice(0, 3).join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
