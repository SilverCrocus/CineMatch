import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { queryMany } from "@/lib/db";
import { getMoviesByIds } from "@/lib/services/movies";

interface WatchedRow {
  id: string;
  movie_id: number;
  watched_at: string;
  watched_by: string[];
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get watched movies where user was a participant
    const watched = await queryMany<WatchedRow>(
      `SELECT id, movie_id, watched_at, watched_by
       FROM watched_movies
       WHERE $1 = ANY(watched_by)
       ORDER BY watched_at DESC
       LIMIT 50`,
      [session.user.id]
    );

    if (watched.length === 0) {
      return NextResponse.json({ history: [] });
    }

    // Get movie details
    const movieIds = watched.map((w) => w.movie_id);
    const movies = await getMoviesByIds(movieIds);
    const movieMap = new Map(movies.map((m) => [m.tmdbId, m]));

    const history = watched.map((w) => ({
      id: w.id,
      movie: movieMap.get(w.movie_id),
      watchedAt: w.watched_at,
      watchedWith: w.watched_by.length,
    }));

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
