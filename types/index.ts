export interface User {
  id: string;
  email: string;
  name: string;
  image: string | null;
  createdAt: Date;
}

export interface Movie {
  id: string;
  tmdbId: number;
  imdbId: string | null;
  title: string;
  year: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  synopsis: string;
  runtime: number | null;
  imdbRating: string | null;
  rtCriticScore: string | null;
  streamingServices: string[];
}

export interface CachedMovie {
  id?: string;
  tmdbId: number;
  imdbId: string | null;
  title: string;
  year: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  synopsis: string;
  runtime: number | null;
  imdbRating: string | null;
  rtCriticScore: string | null;
  streamingServices: string[];
  cachedAt?: string;
}

export interface Session {
  id: string;
  code: string;
  hostId: string;
  status: "lobby" | "swiping" | "revealed";
  deck: number[];
  createdAt: Date;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string;
  nickname: string;
  completed: boolean;
  joinedAt: Date;
  user?: User;
}

export interface Swipe {
  id: string;
  sessionId: string;
  userId: string;
  movieId: number;
  liked: boolean;
}

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: "pending" | "accepted";
  createdAt: Date;
  friend?: User;
}

export interface WatchedMovie {
  id: string;
  sessionId: string;
  movieId: number;
  watchedBy: string[];
  watchedAt: Date;
  movie?: Movie;
}

export interface DeckSource {
  type: "filters" | "url" | "text";
  filters?: {
    genres?: number[];
    yearFrom?: number;
    yearTo?: number;
    streamingServices?: string[];
  };
  url?: string;
  textList?: string;
}
