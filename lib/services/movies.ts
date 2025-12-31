import { query, queryOne } from "@/lib/db";
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
import { getOMDbRatings } from "@/lib/api/omdb";
import { getRTRatings, streamRTBatch } from "@/lib/api/rottentomatoes";
import type { Movie } from "@/types";

interface MovieFilters {
  genres?: number[];
  yearFrom?: number;
  yearTo?: number;
  limit?: number;
  excludeIds?: Set<number>; // TMDB IDs to skip
}

interface CachedMovieRow {
  id: string;
  tmdb_id: number;
  imdb_id: string | null;
  title: string;
  year: number;
  poster_url: string | null;
  backdrop_url: string | null;
  genres: string[];
  synopsis: string;
  runtime: number | null;
  tmdb_rating: number | null;
  imdb_rating: string | null;
  rt_critic_score: string | null;
  rt_audience_score: string | null;
  rt_url: string | null;
  streaming_services: string[];
  cached_at: string;
}

interface EnrichedRatings {
  imdbRating: string | null;
  rtCriticScore: string | null;
  rtAudienceScore: string | null;
  rtUrl: string | null;
}

async function enrichMovieWithRatings(
  imdbId: string | null
): Promise<EnrichedRatings> {
  if (!imdbId) {
    return { imdbRating: null, rtCriticScore: null, rtAudienceScore: null, rtUrl: null };
  }

  // Fetch from both APIs in parallel
  const [omdbRatings, rtRatings] = await Promise.all([
    getOMDbRatings(imdbId).catch((error) => {
      console.error(`Failed to fetch OMDb ratings for ${imdbId}:`, error);
      return { imdbRating: null, rtCriticScore: null };
    }),
    getRTRatings(imdbId).catch((error) => {
      console.error(`Failed to fetch RT ratings for ${imdbId}:`, error);
      return { criticScore: null, audienceScore: null, rtUrl: null };
    }),
  ]);

  return {
    imdbRating: omdbRatings.imdbRating,
    // Prefer RT API scores over OMDb (more reliable)
    rtCriticScore: rtRatings.criticScore || omdbRatings.rtCriticScore,
    rtAudienceScore: rtRatings.audienceScore,
    rtUrl: rtRatings.rtUrl,
  };
}

/**
 * Fetch basic movie data from TMDB without ratings enrichment.
 * Used for batch processing where ratings are fetched separately.
 */
async function tmdbToMovieBasic(tmdbId: number): Promise<Movie | null> {
  try {
    const [details, providers] = await Promise.all([
      getMovieDetails(tmdbId),
      getWatchProviders(tmdbId),
    ]);

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
      tmdbRating: details.vote_average || null,
      imdbRating: null,
      rtCriticScore: null,
      rtAudienceScore: null,
      rtUrl: null,
      streamingServices: providers,
    };
  } catch (error) {
    console.error(`Failed to fetch movie details for TMDB ID ${tmdbId}:`, error);
    return null;
  }
}

/**
 * Full tmdbToMovie with ratings - used for individual movie fetches (cache miss)
 */
async function tmdbToMovie(tmdbId: number): Promise<Movie | null> {
  try {
    const [details, providers] = await Promise.all([
      getMovieDetails(tmdbId),
      getWatchProviders(tmdbId),
    ]);

    const ratings = await enrichMovieWithRatings(details.imdb_id);

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
      tmdbRating: details.vote_average || null,
      imdbRating: ratings.imdbRating,
      rtCriticScore: ratings.rtCriticScore,
      rtAudienceScore: ratings.rtAudienceScore,
      rtUrl: ratings.rtUrl,
      streamingServices: providers,
    };
  } catch (error) {
    console.error(`Failed to fetch movie details for TMDB ID ${tmdbId}:`, error);
    return null;
  }
}

/**
 * Batch enrich movies with ratings from OMDb and RT.
 * Much faster than enriching one at a time.
 */
async function enrichMoviesWithRatingsBatch(movies: Movie[]): Promise<Movie[]> {
  // Filter movies that have imdbIds for rating lookup
  const moviesWithImdb = movies.filter((m) => m.imdbId);
  const imdbIds = moviesWithImdb.map((m) => m.imdbId!);

  if (imdbIds.length === 0) {
    return movies;
  }

  // Create a map for quick lookup
  const ratingsMap = new Map<string, EnrichedRatings>();

  // Initialize with empty ratings
  for (const imdbId of imdbIds) {
    ratingsMap.set(imdbId, {
      imdbRating: null,
      rtCriticScore: null,
      rtAudienceScore: null,
      rtUrl: null,
    });
  }

  // Fetch OMDb ratings in parallel batches of 5
  const omdbBatchSize = 5;
  const omdbPromises: Promise<void>[] = [];

  for (let i = 0; i < imdbIds.length; i += omdbBatchSize) {
    const batch = imdbIds.slice(i, i + omdbBatchSize);
    const batchPromise = Promise.all(
      batch.map(async (imdbId) => {
        try {
          const omdbRatings = await getOMDbRatings(imdbId);
          const existing = ratingsMap.get(imdbId)!;
          existing.imdbRating = omdbRatings.imdbRating;
          // OMDb RT score is fallback only - don't overwrite if RT API already set it
          if (!existing.rtCriticScore && omdbRatings.rtCriticScore) {
            existing.rtCriticScore = omdbRatings.rtCriticScore;
          }
        } catch (error) {
          console.error(`Failed to fetch OMDb ratings for ${imdbId}:`, error);
        }
      })
    ).then(() => {});
    omdbPromises.push(batchPromise);
  }

  // Fetch RT ratings using streaming batch endpoint (runs in parallel with OMDb)
  const rtPromise = (async () => {
    try {
      for await (const result of streamRTBatch(imdbIds)) {
        if (!result.error) {
          const existing = ratingsMap.get(result.imdbId);
          if (existing) {
            // RT API scores take priority over OMDb
            if (result.criticScore) existing.rtCriticScore = result.criticScore;
            existing.rtAudienceScore = result.audienceScore;
            existing.rtUrl = result.rtUrl;
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch RT batch ratings:", error);
    }
  })();

  // Wait for all rating fetches to complete
  await Promise.all([...omdbPromises, rtPromise]);

  // Apply ratings to movies
  return movies.map((movie) => {
    if (!movie.imdbId) return movie;

    const ratings = ratingsMap.get(movie.imdbId);
    if (!ratings) return movie;

    return {
      ...movie,
      imdbRating: ratings.imdbRating,
      rtCriticScore: ratings.rtCriticScore,
      rtAudienceScore: ratings.rtAudienceScore,
      rtUrl: ratings.rtUrl,
    };
  });
}

/**
 * Cache a movie to the database
 */
async function cacheMovie(movie: Movie): Promise<void> {
  await query(
    `INSERT INTO cached_movies (tmdb_id, imdb_id, title, year, poster_url, backdrop_url, genres, synopsis, runtime, tmdb_rating, imdb_rating, rt_critic_score, rt_audience_score, rt_url, streaming_services, cached_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
     ON CONFLICT (tmdb_id)
     DO UPDATE SET imdb_id = $2, title = $3, year = $4, poster_url = $5, backdrop_url = $6, genres = $7, synopsis = $8, runtime = $9, tmdb_rating = $10, imdb_rating = $11, rt_critic_score = $12, rt_audience_score = $13, rt_url = $14, streaming_services = $15, cached_at = NOW()`,
    [
      movie.tmdbId,
      movie.imdbId,
      movie.title,
      movie.year,
      movie.posterUrl,
      movie.backdropUrl,
      movie.genres,
      movie.synopsis,
      movie.runtime,
      movie.tmdbRating,
      movie.imdbRating,
      movie.rtCriticScore,
      movie.rtAudienceScore,
      movie.rtUrl,
      movie.streamingServices,
    ]
  );
}

/**
 * Check cache for a movie. Returns the movie if found and valid, null otherwise.
 */
async function getMovieFromCache(tmdbId: number): Promise<Movie | null> {
  const cached = await queryOne<CachedMovieRow>(
    "SELECT * FROM cached_movies WHERE tmdb_id = $1",
    [tmdbId]
  );

  if (cached) {
    const cacheAge = Date.now() - new Date(cached.cached_at).getTime();

    // Use shorter TTL if RT scores are missing (might be API failure)
    // 24 hours for complete RT data, 2 minutes if RT missing (aggressive retry)
    const hasRTScores = cached.rt_critic_score || cached.rt_audience_score;
    const cacheTTL = hasRTScores ? 24 * 60 * 60 * 1000 : 2 * 60 * 1000;
    const cacheValid = cacheAge < cacheTTL;

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
        tmdbRating: cached.tmdb_rating,
        imdbRating: cached.imdb_rating,
        rtCriticScore: cached.rt_critic_score,
        rtAudienceScore: cached.rt_audience_score,
        rtUrl: cached.rt_url,
        streamingServices: cached.streaming_services,
      };
    }
  }

  return null;
}

export async function getOrFetchMovie(tmdbId: number): Promise<Movie | null> {
  // Check cache first
  const cached = await getMovieFromCache(tmdbId);
  if (cached) return cached;

  // Fetch fresh data with ratings
  const movie = await tmdbToMovie(tmdbId);

  if (!movie) return null;

  // Cache the result
  await cacheMovie(movie);

  return movie;
}

export async function buildDeckFromFilters(
  filters: MovieFilters
): Promise<Movie[]> {
  const limit = filters.limit || 20;
  const excludeIds = filters.excludeIds || new Set<number>();
  let page = 1;
  const maxPages = 10; // Search more pages to find enough non-excluded movies

  // Phase 1: Collect all candidate TMDB IDs
  const candidateTmdbIds: number[] = [];

  while (candidateTmdbIds.length < limit * 2 && page <= maxPages) {
    const { movies: tmdbMovies, totalPages } = await discoverMovies({
      genres: filters.genres,
      yearFrom: filters.yearFrom,
      yearTo: filters.yearTo,
      page,
    });

    // Filter out excluded movies
    const filtered = tmdbMovies.filter((m) => !excludeIds.has(m.id));
    candidateTmdbIds.push(...filtered.map((m) => m.id));

    if (page >= totalPages) break;
    page++;
  }

  // Take only what we need (with some buffer for failures)
  const tmdbIdsToFetch = candidateTmdbIds.slice(0, Math.min(limit + 10, candidateTmdbIds.length));

  // Phase 2: Check cache for all candidates in parallel
  const cacheResults = await Promise.all(
    tmdbIdsToFetch.map(async (tmdbId) => ({
      tmdbId,
      cached: await getMovieFromCache(tmdbId),
    }))
  );

  const cachedMovies: Movie[] = [];
  const uncachedTmdbIds: number[] = [];

  for (const { tmdbId, cached } of cacheResults) {
    if (cached) {
      cachedMovies.push(cached);
    } else {
      uncachedTmdbIds.push(tmdbId);
    }
  }

  // If we have enough cached movies, return early
  if (cachedMovies.length >= limit) {
    return cachedMovies.slice(0, limit);
  }

  // Phase 3: Fetch basic TMDB data for uncached movies in parallel (batches of 10)
  const basicMovies: Movie[] = [];
  const tmdbBatchSize = 10;

  for (let i = 0; i < uncachedTmdbIds.length; i += tmdbBatchSize) {
    const batch = uncachedTmdbIds.slice(i, i + tmdbBatchSize);
    const results = await Promise.all(batch.map((id) => tmdbToMovieBasic(id)));
    basicMovies.push(...results.filter((m): m is Movie => m !== null));

    // Check if we have enough movies now
    if (cachedMovies.length + basicMovies.length >= limit) {
      break;
    }
  }

  // Phase 4: Batch enrich uncached movies with ratings
  const enrichedMovies = await enrichMoviesWithRatingsBatch(basicMovies);

  // Phase 5: Cache the enriched movies (fire and forget for speed)
  Promise.all(enrichedMovies.map((movie) => cacheMovie(movie))).catch((error) => {
    console.error("Failed to cache movies:", error);
  });

  // Combine cached + newly enriched movies
  const allMovies = [...cachedMovies, ...enrichedMovies];

  return allMovies.slice(0, limit);
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

export async function searchMoviesByTitle(searchQuery: string): Promise<Movie[]> {
  const results = await searchMovies(searchQuery);

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
    tmdbRating: m.vote_average || null,
    imdbRating: null,
    rtCriticScore: null,
    rtAudienceScore: null,
    rtUrl: null,
    streamingServices: [],
  }));
}
