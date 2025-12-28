const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface TMDBMovie {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  overview: string;
  vote_average: number;
  runtime?: number;
}

interface TMDBMovieDetails extends TMDBMovie {
  imdb_id: string | null;
  runtime: number;
  genres: { id: number; name: string }[];
}

interface TMDBDiscoverResponse {
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

interface TMDBWatchProviders {
  results: {
    US?: {
      flatrate?: { provider_name: string }[];
      rent?: { provider_name: string }[];
      buy?: { provider_name: string }[];
    };
  };
}

const GENRE_MAP: Record<number, string> = {
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
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

async function tmdbFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.append("api_key", process.env.TMDB_API_KEY || "");
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
    },
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }

  return response.json();
}

export async function discoverMovies(filters: {
  genres?: number[];
  genreMatch?: "any" | "all";
  yearFrom?: number;
  yearTo?: number;
  page?: number;
}): Promise<{ movies: TMDBMovie[]; totalPages: number }> {
  const params: Record<string, string> = {
    sort_by: "popularity.desc",
    include_adult: "false",
    include_video: "false",
    page: String(filters.page || 1),
  };

  if (filters.genres?.length) {
    // TMDB: comma = AND, pipe = OR
    const separator = filters.genreMatch === "all" ? "," : "|";
    params.with_genres = filters.genres.join(separator);
  }
  if (filters.yearFrom) {
    params["primary_release_date.gte"] = `${filters.yearFrom}-01-01`;
  }
  if (filters.yearTo) {
    params["primary_release_date.lte"] = `${filters.yearTo}-12-31`;
  }

  const data = await tmdbFetch<TMDBDiscoverResponse>("/discover/movie", params);
  return {
    movies: data.results,
    totalPages: data.total_pages,
  };
}

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails> {
  return tmdbFetch<TMDBMovieDetails>(`/movie/${tmdbId}`);
}

export async function getWatchProviders(tmdbId: number): Promise<string[]> {
  const data = await tmdbFetch<TMDBWatchProviders>(`/movie/${tmdbId}/watch/providers`);
  const usProviders = data.results?.US;

  if (!usProviders) return [];

  const providers = new Set<string>();
  usProviders.flatrate?.forEach((p) => providers.add(p.provider_name));

  return Array.from(providers);
}

export async function searchMovies(query: string): Promise<TMDBMovie[]> {
  const data = await tmdbFetch<TMDBDiscoverResponse>("/search/movie", {
    query,
    include_adult: "false",
  });
  return data.results;
}

export function getPosterUrl(path: string | null, size: "w185" | "w342" | "w500" | "original" = "w342"): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getBackdropUrl(path: string | null, size: "w780" | "w1280" | "original" = "w780"): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getGenreNames(genreIds: number[]): string[] {
  return genreIds.map((id) => GENRE_MAP[id]).filter(Boolean);
}

export function getYear(releaseDate: string): number | null {
  if (!releaseDate) return null;
  const year = new Date(releaseDate).getFullYear();
  return isNaN(year) ? null : year;
}

export { GENRE_MAP };
