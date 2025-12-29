export interface Movie {
  id: number;
  tmdbId: number;
  imdbId: string | null;
  title: string;
  year: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  synopsis: string;
  runtime: number | null;
  imdbRating: string | null;
  rtCriticScore: string | null;
  rtAudienceScore: string | null;
  rtUrl: string | null;
  streamingServices: string[];
  // Legacy fields for backward compatibility
  poster_path?: string | null;
  release_date?: string;
  overview?: string;
  vote_average?: number;
  genre_ids?: number[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

// Session type is now defined in lib/api.ts with full participant and movie data

export interface Friend {
  id: string;
  name: string;
  email: string;
  image?: string;
  status: 'pending' | 'accepted';
}
