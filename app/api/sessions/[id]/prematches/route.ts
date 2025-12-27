import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { queryMany } from "@/lib/db";
import { getMoviesByIds } from "@/lib/services/movies";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const { id: sessionId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all participants in this session
    const participants = await queryMany<{ user_id: string }>(
      "SELECT user_id FROM session_participants WHERE session_id = $1",
      [sessionId]
    );

    if (participants.length < 2) {
      return NextResponse.json({ prematches: [] });
    }

    const userIds = participants.map((p) => p.user_id);

    // Find movies that appear in multiple users' watchlists
    const overlaps = await queryMany<{ movie_id: number; user_ids: string[] }>(
      `SELECT movie_id, array_agg(user_id) as user_ids
       FROM solo_watchlist
       WHERE user_id = ANY($1)
       GROUP BY movie_id
       HAVING COUNT(DISTINCT user_id) > 1
       ORDER BY COUNT(DISTINCT user_id) DESC
       LIMIT 10`,
      [userIds]
    );

    if (overlaps.length === 0) {
      return NextResponse.json({ prematches: [] });
    }

    // Get movie details
    const movieIds = overlaps.map((o) => o.movie_id);
    const movies = await getMoviesByIds(movieIds);
    const movieMap = new Map(movies.map((m) => [m.tmdbId, m]));

    // Get user names for display
    const users = await queryMany<{ id: string; name: string }>(
      "SELECT id, name FROM users WHERE id = ANY($1)",
      [userIds]
    );
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    const prematches = overlaps.map((o) => ({
      movie: movieMap.get(o.movie_id),
      savedBy: o.user_ids.map((id) => userMap.get(id) || "Unknown"),
    }));

    return NextResponse.json({ prematches });
  } catch (error) {
    console.error("Error fetching prematches:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
