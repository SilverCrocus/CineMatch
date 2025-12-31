import { NextRequest, NextResponse } from "next/server";
import { query, queryMany } from "@/lib/db";
import { getAuthUser } from "@/lib/mobile-auth";
import { getMoviesByIds } from "@/lib/services/movies";

interface WatchlistRow {
  id: string;
  movie_id: number;
  added_at: string;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await queryMany<WatchlistRow>(
      `SELECT id, movie_id, added_at
       FROM solo_watchlist
       WHERE user_id = $1
       ORDER BY added_at DESC`,
      [user.id]
    );

    if (items.length === 0) {
      return NextResponse.json({ watchlist: [] });
    }

    const movieIds = items.map((item) => item.movie_id);
    const movies = await getMoviesByIds(movieIds);
    const movieMap = new Map(movies.map((m) => [m.tmdbId, m]));

    const watchlist = items.map((item) => ({
      id: item.id,
      movieId: item.movie_id,
      addedAt: item.added_at,
      movie: movieMap.get(item.movie_id),
    }));

    return NextResponse.json({ watchlist });
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { movieId } = await request.json();

    if (!movieId || typeof movieId !== "number") {
      return NextResponse.json({ error: "movieId required" }, { status: 400 });
    }

    await query(
      `INSERT INTO solo_watchlist (user_id, movie_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, movie_id) DO NOTHING`,
      [user.id, movieId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { movieId } = await request.json();

    if (!movieId || typeof movieId !== "number") {
      return NextResponse.json({ error: "movieId required" }, { status: 400 });
    }

    await query(
      `DELETE FROM solo_watchlist
       WHERE user_id = $1 AND movie_id = $2`,
      [user.id, movieId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
