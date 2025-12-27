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
          <span className="text-2xl font-[family-name:var(--font-syne)] font-bold text-[#5de890]">LIKE</span>
        </motion.div>
        <motion.div
          className="absolute top-8 left-8 px-5 py-2 border-4 border-[#e85d75] rounded-xl -rotate-12 bg-black/20"
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-2xl font-[family-name:var(--font-syne)] font-bold text-[#e85d75]">NOPE</span>
        </motion.div>

        {/* Glass Overlay Panel */}
        <div className="absolute bottom-0 left-0 right-0 p-6 glass">
          {/* Title & Year */}
          <div className="mb-3">
            <h2 className="text-2xl font-[family-name:var(--font-syne)] font-bold text-white">{movie.title}</h2>
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
