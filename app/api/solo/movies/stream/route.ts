import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, queryMany } from "@/lib/db";
import {
  discoverMovies,
  getMovieDetails,
  getWatchProviders,
  getPosterUrl,
  getBackdropUrl,
  getYear,
  searchMovies,
} from "@/lib/api/tmdb";
import { getOMDbRatings } from "@/lib/api/omdb";
import { streamRTBatch } from "@/lib/api/rottentomatoes";
import type { Movie } from "@/types";

export const dynamic = "force-dynamic";

// Fetch movie without RT data (fast path)
async function fetchMovieFast(tmdbId: number): Promise<Movie | null> {
  try {
    const [details, providers] = await Promise.all([
      getMovieDetails(tmdbId),
      getWatchProviders(tmdbId),
    ]);

    // Get OMDb ratings (fast, includes some RT data)
    const omdbRatings = details.imdb_id
      ? await getOMDbRatings(details.imdb_id).catch(() => ({
          imdbRating: null,
          rtCriticScore: null,
        }))
      : { imdbRating: null, rtCriticScore: null };

    return {
      id: `tmdb-${tmdbId}`,
      tmdbId,
      imdbId: details.imdb_id,
      title: details.title,
      year: getYear(details.release_date),
      posterUrl: getPosterUrl(details.poster_path, "w500"),
      backdropUrl: getBackdropUrl(details.backdrop_path, "w1280"),
      genres: details.genres.map((g) => g.name),
      synopsis: details.overview,
      runtime: details.runtime,
      imdbRating: omdbRatings.imdbRating,
      rtCriticScore: omdbRatings.rtCriticScore,
      rtAudienceScore: null, // Will be filled by RT batch
      rtUrl: null, // Will be filled by RT batch
      streamingServices: providers,
    };
  } catch (error) {
    console.error(`Failed to fetch movie ${tmdbId}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") || "random";
  const genre = searchParams.get("genre");
  const movie = searchParams.get("movie");

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Get user's watchlist AND dismissed movies to exclude
        const [watchlist, dismissed] = await Promise.all([
          queryMany<{ movie_id: number }>(
            "SELECT movie_id FROM solo_watchlist WHERE user_id = $1",
            [session.user.id]
          ),
          queryMany<{ movie_id: number }>(
            "SELECT movie_id FROM solo_dismissed WHERE user_id = $1",
            [session.user.id]
          ),
        ]);
        const existingIds = new Set([
          ...watchlist.map((e) => e.movie_id),
          ...dismissed.map((e) => e.movie_id),
        ]);

        // Get TMDB movie IDs based on source
        let tmdbIds: number[] = [];

        if (source === "genre" && genre) {
          const { movies: tmdbMovies } = await discoverMovies({
            genres: [parseInt(genre)],
            page: 1,
          });
          tmdbIds = tmdbMovies.map((m) => m.id);
        } else if (source === "similar" && movie) {
          const searchResults = await searchMovies(movie);
          if (searchResults.length > 0) {
            const baseMovie = searchResults[0];
            const genreMap: Record<number, string> = {
              28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
              80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
              14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
              9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 53: "Thriller",
              10752: "War", 37: "Western",
            };
            const genreIds = Object.entries(genreMap)
              .filter(([, name]) => baseMovie.genre_ids?.some((id) => genreMap[id] === name))
              .map(([id]) => parseInt(id))
              .slice(0, 2);

            const { movies: tmdbMovies } = await discoverMovies({
              genres: genreIds.length > 0 ? genreIds : undefined,
              page: 1,
            });
            tmdbIds = tmdbMovies.map((m) => m.id);
          }
        } else {
          // Random/surprise me
          const { movies: tmdbMovies } = await discoverMovies({ page: 1 });
          tmdbIds = tmdbMovies.map((m) => m.id);
        }

        // Filter out existing watchlist items and limit to 30
        tmdbIds = tmdbIds.filter((id) => !existingIds.has(id)).slice(0, 30);

        // Phase 1: Stream movies as they're fetched (TMDB + OMDb, no RT)
        const movies: Movie[] = [];
        const imdbIds: string[] = [];

        // Fetch in parallel batches of 5
        for (let i = 0; i < tmdbIds.length; i += 5) {
          const batch = tmdbIds.slice(i, i + 5);
          const results = await Promise.all(batch.map(fetchMovieFast));

          for (const movie of results) {
            if (movie) {
              movies.push(movie);
              if (movie.imdbId) {
                imdbIds.push(movie.imdbId);
              }
              sendEvent("movie", movie);
            }
          }
        }

        // Phase 2: Stream RT data from batch API
        if (imdbIds.length > 0) {
          console.log(`[RT Batch] Starting batch fetch for ${imdbIds.length} movies`);
          let rtCount = 0;
          for await (const rtData of streamRTBatch(imdbIds)) {
            rtCount++;
            console.log(`[RT Batch] Received ${rtCount}: ${rtData.imdbId} - critic: ${rtData.criticScore}, audience: ${rtData.audienceScore}`);
            if (!rtData.error) {
              sendEvent("rt:update", {
                imdbId: rtData.imdbId,
                rtCriticScore: rtData.criticScore,
                rtAudienceScore: rtData.audienceScore,
                rtUrl: rtData.rtUrl,
              });

              // Update cache in background (don't await)
              const movieToUpdate = movies.find((m) => m.imdbId === rtData.imdbId);
              if (movieToUpdate) {
                query(
                  `UPDATE cached_movies
                   SET rt_critic_score = $1, rt_audience_score = $2, rt_url = $3, cached_at = NOW()
                   WHERE tmdb_id = $4`,
                  [rtData.criticScore, rtData.audienceScore, rtData.rtUrl, movieToUpdate.tmdbId]
                ).catch(() => {}); // Ignore cache update errors
              }
            }
          }
          console.log(`[RT Batch] Completed. Received ${rtCount} RT updates`);
        }

        // Done
        sendEvent("done", { total: movies.length, withImdb: imdbIds.length });
        controller.close();
      } catch (error) {
        console.error("Stream error:", error);
        sendEvent("error", { message: "Stream failed" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
