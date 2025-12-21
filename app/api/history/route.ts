import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMoviesByIds } from "@/lib/services/movies";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Get watched movies where user was a participant
  const { data: watched } = await supabase
    .from("watched_movies")
    .select("*")
    .contains("watched_by", [session.user.id])
    .order("watched_at", { ascending: false })
    .limit(50);

  if (!watched || watched.length === 0) {
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
}
