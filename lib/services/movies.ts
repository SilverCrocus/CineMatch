import { createClient } from "@/lib/supabase/server";
import {
  discoverMovies,
  getMovieDetails,
  getWatchProviders,
  getPosterUrl,
  getBackdropUrl,
  getGenreNames,
  getYear,
  searchMovies,
} from "@/lib/api/tmdb";
import { getOMDbRatings, searchOMDb } from "@/lib/api/omdb";
import type { Movie, CachedMovie } from "@/types";

interface MovieFilters {
  genres?: number[];
  yearFrom?: number;
  yearTo?: number;
  limit?: number;
}

async function enrichMovieWithRatings(
  tmdbId: number,
  imdbId: string | null
): Promise<{ imdbRating: string | null; rtCriticScore: string | null }> {
  if (!imdbId) {
    return { imdbRating: null, rtCriticScore: null };
  }

  try {
    return await getOMDbRatings(imdbId);
  } catch (error) {
    console.error(`Failed to fetch OMDb ratings for ${imdbId}:`, error);
    return { imdbRating: null, rtCriticScore: null };
  }
}

async function tmdbToMovie(tmdbId: number): Promise<Movie | null> {
  try {
    const [details, providers] = await Promise.all([
      getMovieDetails(tmdbId),
      getWatchProviders(tmdbId),
    ]);

    const ratings = await enrichMovieWithRatings(tmdbId, details.imdb_id);

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
      imdbRating: ratings.imdbRating,
      rtCriticScore: ratings.rtCriticScore,
      streamingServices: providers,
    };
  } catch (error) {
    console.error(`Failed to fetch movie details for TMDB ID ${tmdbId}:`, error);
    return null;
  }
}

export async function getOrFetchMovie(tmdbId: number): Promise<Movie | null> {
  const supabase = await createClient();

  // Check cache first
  const { data: cached } = await supabase
    .from("cached_movies")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .single();

  if (cached) {
    // Check if cache is still valid (24 hours)
    const cacheAge = Date.now() - new Date(cached.cached_at).getTime();
    const cacheValid = cacheAge < 24 * 60 * 60 * 1000;

    if (cacheValid) {
      return {
        id: cached.id,
        tmdbId: cached.tmdb_id,
        imdbId: cached.imdb_id,
        title: cached.title,
        year: cached.year,
        posterUrl: cached.poster_url,
        backdropUrl: cached.backdrop_url,
        genres: cached.genres,
        synopsis: cached.synopsis,
        runtime: cached.runtime,
        imdbRating: cached.imdb_rating,
        rtCriticScore: cached.rt_critic_score,
        streamingServices: cached.streaming_services,
      };
    }
  }

  // Fetch fresh data
  const movie = await tmdbToMovie(tmdbId);

  if (!movie) return null;

  // Cache the result
  const cacheData: Omit<CachedMovie, "id" | "cachedAt"> = {
    tmdbId: movie.tmdbId,
    imdbId: movie.imdbId,
    title: movie.title,
    year: movie.year,
    posterUrl: movie.posterUrl,
    backdropUrl: movie.backdropUrl,
    genres: movie.genres,
    synopsis: movie.synopsis,
    runtime: movie.runtime,
    imdbRating: movie.imdbRating,
    rtCriticScore: movie.rtCriticScore,
    streamingServices: movie.streamingServices,
  };

  await supabase.from("cached_movies").upsert(
    {
      tmdb_id: cacheData.tmdbId,
      imdb_id: cacheData.imdbId,
      title: cacheData.title,
      year: cacheData.year,
      poster_url: cacheData.posterUrl,
      backdrop_url: cacheData.backdropUrl,
      genres: cacheData.genres,
      synopsis: cacheData.synopsis,
      runtime: cacheData.runtime,
      imdb_rating: cacheData.imdbRating,
      rt_critic_score: cacheData.rtCriticScore,
      streaming_services: cacheData.streamingServices,
      cached_at: new Date().toISOString(),
    },
    { onConflict: "tmdb_id" }
  );

  return movie;
}

export async function buildDeckFromFilters(
  filters: MovieFilters
): Promise<Movie[]> {
  const limit = filters.limit || 20;
  const movies: Movie[] = [];
  let page = 1;

  while (movies.length < limit && page <= 5) {
    const { movies: tmdbMovies, totalPages } = await discoverMovies({
      genres: filters.genres,
      yearFrom: filters.yearFrom,
      yearTo: filters.yearTo,
      page,
    });

    // Fetch full details for each movie in parallel (batch of 5)
    for (let i = 0; i < tmdbMovies.length && movies.length < limit; i += 5) {
      const batch = tmdbMovies.slice(i, i + 5);
      const results = await Promise.all(
        batch.map((m) => getOrFetchMovie(m.id))
      );
      movies.push(...results.filter((m): m is Movie => m !== null));
    }

    if (page >= totalPages) break;
    page++;
  }

  return movies.slice(0, limit);
}

export async function buildDeckFromTitles(
  titles: { title: string; year?: number }[]
): Promise<Movie[]> {
  const movies: Movie[] = [];

  for (const { title, year } of titles) {
    try {
      // Search TMDB first
      const searchResults = await searchMovies(title);

      // Find best match (prefer exact title + year match)
      let bestMatch = searchResults.find((m) => {
        const matchesTitle = m.title.toLowerCase() === title.toLowerCase();
        const matchesYear = year
          ? getYear(m.release_date) === year
          : true;
        return matchesTitle && matchesYear;
      });

      // Fallback to first result if no exact match
      if (!bestMatch && searchResults.length > 0) {
        bestMatch = searchResults[0];
      }

      if (bestMatch) {
        const movie = await getOrFetchMovie(bestMatch.id);
        if (movie) {
          movies.push(movie);
        }
      }
    } catch (error) {
      console.error(`Failed to find movie: ${title}`, error);
    }
  }

  return movies;
}

export async function getMoviesByIds(tmdbIds: number[]): Promise<Movie[]> {
  const movies = await Promise.all(tmdbIds.map(getOrFetchMovie));
  return movies.filter((m): m is Movie => m !== null);
}

export async function searchMoviesByTitle(query: string): Promise<Movie[]> {
  const results = await searchMovies(query);

  // Only return basic info for search results (no full enrichment)
  return results.slice(0, 10).map((m) => ({
    id: `tmdb-${m.id}`,
    tmdbId: m.id,
    imdbId: null,
    title: m.title,
    year: getYear(m.release_date),
    posterUrl: getPosterUrl(m.poster_path, "w185"),
    backdropUrl: null,
    genres: getGenreNames(m.genre_ids),
    synopsis: m.overview,
    runtime: null,
    imdbRating: null,
    rtCriticScore: null,
    streamingServices: [],
  }));
}
