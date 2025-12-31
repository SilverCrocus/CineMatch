import { NextRequest, NextResponse } from "next/server";
import { queryMany } from "@/lib/db";
import { getAuthUser } from "@/lib/mobile-auth";
import {
  buildDeckFromFilters,
  searchMoviesByTitle,
} from "@/lib/services/movies";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);

  console.log("[API movies] User:", user?.id || "no user");

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const genre = searchParams.get("genre");
  const movie = searchParams.get("movie");

  console.log("[API movies] Params:", { source, genre, movie });

  try {
    // Get user's existing watchlist AND dismissed to exclude
    const [watchlist, dismissed] = await Promise.all([
      queryMany<{ movie_id: number }>(
        "SELECT movie_id FROM solo_watchlist WHERE user_id = $1",
        [user.id]
      ),
      queryMany<{ movie_id: number }>(
        "SELECT movie_id FROM solo_dismissed WHERE user_id = $1",
        [user.id]
      ),
    ]);
    const existingIds = new Set([
      ...watchlist.map((e) => e.movie_id),
      ...dismissed.map((e) => e.movie_id),
    ]);
    console.log("[API movies] Excluding", existingIds.size, "watched/dismissed movies");

    let movies;

    switch (source) {
      case "genre":
        if (!genre) {
          return NextResponse.json({ error: "genre required" }, { status: 400 });
        }
        movies = await buildDeckFromFilters({
          genres: [parseInt(genre)],
          limit: 30,
          excludeIds: existingIds,
        });
        break;

      case "similar":
        if (!movie) {
          return NextResponse.json({ error: "movie required" }, { status: 400 });
        }
        // Search for the movie to get its genres
        const searchResults = await searchMoviesByTitle(movie);
        if (searchResults.length === 0) {
          return NextResponse.json({ error: "Movie not found" }, { status: 404 });
        }
        // Use the first result's genres to find similar movies
        const baseMovie = searchResults[0];
        const genreIds = baseMovie.genres
          ? Object.entries({
              28: "Action",
              12: "Adventure",
              16: "Animation",
              35: "Comedy",
              80: "Crime",
              99: "Documentary",
              18: "Drama",
              10751: "Family",
              14: "Fantasy",
              36: "History",
              27: "Horror",
              10402: "Music",
              9648: "Mystery",
              10749: "Romance",
              878: "Sci-Fi",
              53: "Thriller",
              10752: "War",
              37: "Western",
            })
              .filter(([, name]) => baseMovie.genres.includes(name))
              .map(([id]) => parseInt(id))
          : [];

        movies = await buildDeckFromFilters({
          genres: genreIds.length > 0 ? genreIds.slice(0, 2) : undefined,
          limit: 30,
          excludeIds: existingIds,
        });
        break;

      case "random":
      default:
        movies = await buildDeckFromFilters({ limit: 30, excludeIds: existingIds });
        break;
    }

    console.log("[API movies] Got", movies.length, "movies from buildDeckFromFilters");

    // Double-check filter (should already be excluded, but just in case)
    const filtered = movies.filter((m) => !existingIds.has(m.tmdbId));

    console.log("[API movies] Returning", filtered.length, "movies");

    return NextResponse.json({ movies: filtered });
  } catch (error) {
    console.error("Error fetching movies:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
