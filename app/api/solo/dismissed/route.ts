import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, queryMany } from "@/lib/db";
import { getMoviesByIds } from "@/lib/services/movies";

interface DismissedRow {
  id: string;
  movie_id: number;
  dismissed_at: string;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await queryMany<DismissedRow>(
      `SELECT id, movie_id, dismissed_at
       FROM solo_dismissed
       WHERE user_id = $1
       ORDER BY dismissed_at DESC`,
      [session.user.id]
    );

    if (items.length === 0) {
      return NextResponse.json({ dismissed: [] });
    }

    const movieIds = items.map((item) => item.movie_id);
    const movies = await getMoviesByIds(movieIds);
    const movieMap = new Map(movies.map((m) => [m.tmdbId, m]));

    const dismissed = items.map((item) => ({
      id: item.id,
      movieId: item.movie_id,
      dismissedAt: item.dismissed_at,
      movie: movieMap.get(item.movie_id),
    }));

    return NextResponse.json({ dismissed });
  } catch (error) {
    console.error("Error fetching dismissed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { movieId } = await request.json();

    if (!movieId || typeof movieId !== "number") {
      return NextResponse.json({ error: "movieId required" }, { status: 400 });
    }

    await query(
      `INSERT INTO solo_dismissed (user_id, movie_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, movie_id) DO NOTHING`,
      [session.user.id, movieId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding to dismissed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { movieId } = await request.json();

    if (!movieId || typeof movieId !== "number") {
      return NextResponse.json({ error: "movieId required" }, { status: 400 });
    }

    await query(
      `DELETE FROM solo_dismissed
       WHERE user_id = $1 AND movie_id = $2`,
      [session.user.id, movieId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing from dismissed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
