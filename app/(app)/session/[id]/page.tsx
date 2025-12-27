"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Copy, Check, Play, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { SwipeDeck } from "@/components/swipe/swipe-deck";
import type { Movie } from "@/types";

interface SessionData {
  id: string;
  code: string;
  status: "lobby" | "swiping" | "revealed";
  hostId: string;
  participants: {
    id: string;
    userId: string;
    nickname: string;
    completed: boolean;
    user: { id: string; name: string; image: string };
  }[];
  movies: Movie[];
  userSwipes: Record<number, boolean>;
  isHost: boolean;
}

interface MatchedMovie extends Movie {}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const { data: authSession } = useSession();
  const [session, setSession] = useState<SessionData | null>(null);
  const [matches, setMatches] = useState<MatchedMovie[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<number | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchSession();
    // Poll for updates
    const interval = setInterval(fetchSession, 3000);
    return () => clearInterval(interval);
  }, [fetchSession]);

  const copyCode = () => {
    if (session) {
      navigator.clipboard.writeText(session.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startSession = async () => {
    await fetch(`/api/sessions/${params.id}/start`, { method: "POST" });
    fetchSession();
  };

  const handleSwipe = async (movieId: number, liked: boolean) => {
    await fetch(`/api/sessions/${params.id}/swipe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId, liked }),
    });
  };

  const handleComplete = async () => {
    // User finished swiping - just refresh to update completed status
    fetchSession();
  };

  const revealMatches = useCallback(async () => {
    // First update status to revealed
    await fetch(`/api/sessions/${params.id}/reveal`, { method: "POST" });
    // Then fetch matches
    const res = await fetch(`/api/sessions/${params.id}/reveal`);
    if (res.ok) {
      const data = await res.json();
      setMatches(data.matches);
    }
    fetchSession();
  }, [params.id, fetchSession]);

  const selectMovie = async (movieId: number) => {
    await fetch(`/api/sessions/${params.id}/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId }),
    });
    setSelectedMovie(movieId);
  };

  // Calculate completion status (must be before early returns for hooks rules)
  const userParticipant = session?.participants.find(
    (p) => p.user?.id === authSession?.user?.id
  );
  const isCompleted = userParticipant?.completed ?? false;
  const allCompleted = session?.participants.every((p) => p.completed) ?? false;

  // Auto-reveal when everyone is done
  useEffect(() => {
    if (session?.status === "swiping" && allCompleted && isCompleted) {
      revealMatches();
    }
  }, [session?.status, allCompleted, isCompleted, revealMatches]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-bounce">🎬</div>
          <p className="text-lg text-muted-foreground animate-pulse">
            Loading your session...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Session not found</p>
      </div>
    );
  }

  // LOBBY VIEW
  if (session.status === "lobby") {
    return (
      <main className="min-h-screen p-4 max-w-lg mx-auto">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-2">Session Lobby</h1>
          <p className="text-muted-foreground mb-6">
            Share the code with friends to join
          </p>

          {/* Room Code */}
          <Card className="mb-8">
            <CardContent className="py-8">
              <div className="text-4xl font-mono font-bold tracking-widest mb-4">
                {session.code}
              </div>
              <Button variant="secondary" onClick={copyCode}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" /> Copy Code
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Participants */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Users className="h-5 w-5" />
              <span>{session.participants.length} joined</span>
            </div>
            <div className="flex justify-center gap-2 flex-wrap">
              {session.participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2 bg-secondary rounded-full px-3 py-1">
                  <Avatar
                    src={p.user?.image}
                    alt={p.nickname}
                    fallback={p.nickname.charAt(0)}
                    size="sm"
                  />
                  <span className="text-sm">{p.nickname}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Start Button (Host Only) */}
          {session.isHost && (
            <Button size="lg" onClick={startSession} className="w-full">
              <Play className="h-5 w-5 mr-2" />
              Start Swiping ({session.movies.length} movies)
            </Button>
          )}

          {!session.isHost && (
            <p className="text-muted-foreground">
              Waiting for host to start...
            </p>
          )}
        </div>
      </main>
    );
  }

  // SWIPING VIEW
  if (session.status === "swiping") {
    if (isCompleted) {
      return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4">
          <h2 className="text-2xl font-bold mb-4">All done!</h2>
          <p className="text-muted-foreground mb-8">
            {allCompleted ? "Revealing matches..." : "Waiting for others..."}
          </p>
          <div className="space-y-2">
            {session.participants.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <Avatar
                  src={p.user?.image}
                  alt={p.nickname}
                  fallback={p.nickname.charAt(0)}
                  size="sm"
                />
                <span>{p.nickname}</span>
                {p.completed ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground animate-pulse" />
                )}
              </div>
            ))}
          </div>
        </main>
      );
    }

    return (
      <main className="h-screen flex flex-col">
        <SwipeDeck
          movies={session.movies}
          onSwipe={handleSwipe}
          onComplete={handleComplete}
          initialSwipes={session.userSwipes}
        />
      </main>
    );
  }

  // REVEALED VIEW
  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="text-center py-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">
            {matches.length > 0 ? "You matched!" : "No matches"}
          </h1>
          <p className="text-muted-foreground">
            {matches.length > 0
              ? `${matches.length} movie${matches.length > 1 ? "s" : ""} everyone liked`
              : "Try again with different filters"}
          </p>
        </motion.div>

        {matches.length > 0 && (
          <div className="space-y-4">
            <AnimatePresence>
              {matches.map((movie, i) => (
                <motion.div
                  key={movie.tmdbId}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card
                    className={`cursor-pointer transition-all ${
                      selectedMovie === movie.tmdbId
                        ? "ring-2 ring-primary"
                        : "hover:bg-secondary/50"
                    }`}
                    onClick={() => selectMovie(movie.tmdbId)}
                  >
                    <CardContent className="flex items-center gap-4 py-4">
                      {movie.posterUrl && (
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="h-24 w-16 object-cover rounded"
                        />
                      )}
                      <div className="text-left flex-1">
                        <h3 className="font-semibold">{movie.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {movie.year} • {movie.genres.slice(0, 2).join(", ")}
                        </p>
                        {movie.imdbRating && (
                          <p className="text-sm">⭐ {movie.imdbRating}</p>
                        )}
                      </div>
                      {selectedMovie === movie.tmdbId && (
                        <Check className="h-6 w-6 text-primary" />
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <Button
          variant="secondary"
          className="mt-8"
          onClick={() => router.push("/dashboard")}
        >
          Back to Dashboard
        </Button>
      </div>
    </main>
  );
}
