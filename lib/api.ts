import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, SECURE_STORE_KEYS } from './constants';
import { Movie, Friend, Session, User } from '../types';

class APIError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await SecureStore.getItemAsync(SECURE_STORE_KEYS.SESSION_TOKEN);

  console.log(`[API] ${endpoint} - Token: ${token ? 'present' : 'missing'}`);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  console.log(`[API] ${endpoint} - Status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[API] ${endpoint} - Error: ${errorText}`);
    throw new APIError(`API error: ${response.statusText}`, response.status);
  }

  const data = await response.json();
  console.log(`[API] ${endpoint} - Response:`, JSON.stringify(data).slice(0, 200));
  return data;
}

interface WatchlistItem {
  id: string;
  movieId: number;
  addedAt: string;
  movie?: Movie;
}

interface DismissedItem {
  id: string;
  movieId: number;
  dismissedAt: string;
  movie?: Movie;
}

export interface MovieFilterParams {
  source?: 'browse' | 'similar' | 'random';
  genres?: string; // comma-separated genre IDs
  match?: 'any' | 'all';
  yearFrom?: number;
  yearTo?: number;
  movie?: string; // for "similar to" search
}

export const api = {
  // Solo mode - movies
  getMovies: (params?: MovieFilterParams) => {
    const searchParams = new URLSearchParams();
    if (params?.source) searchParams.set('source', params.source);
    if (params?.genres) searchParams.set('genres', params.genres);
    if (params?.match) searchParams.set('match', params.match);
    if (params?.yearFrom) searchParams.set('yearFrom', String(params.yearFrom));
    if (params?.yearTo) searchParams.set('yearTo', String(params.yearTo));
    if (params?.movie) searchParams.set('movie', params.movie);
    const query = searchParams.toString();
    return fetchAPI<{ movies: Movie[] }>(`/api/solo/movies${query ? `?${query}` : ''}`);
  },

  // Solo mode - watchlist
  likeMovie: (movieId: number) =>
    fetchAPI('/api/solo/list', {
      method: 'POST',
      body: JSON.stringify({ movieId }),
    }),
  getMyList: () => fetchAPI<{ watchlist: WatchlistItem[] }>('/api/solo/list'),
  removeFromList: (movieId: number) =>
    fetchAPI('/api/solo/list', {
      method: 'DELETE',
      body: JSON.stringify({ movieId }),
    }),

  // Solo mode - dismissed
  dismissMovie: (movieId: number) =>
    fetchAPI('/api/solo/dismissed', {
      method: 'POST',
      body: JSON.stringify({ movieId }),
    }),
  getDismissed: () => fetchAPI<{ dismissed: DismissedItem[] }>('/api/solo/dismissed'),
  undoDismiss: (movieId: number) =>
    fetchAPI('/api/solo/dismissed', {
      method: 'DELETE',
      body: JSON.stringify({ movieId }),
    }),
  restoreFromDismissed: async (movieId: number) => {
    // Remove from dismissed, add to watchlist
    await fetchAPI('/api/solo/dismissed', {
      method: 'DELETE',
      body: JSON.stringify({ movieId }),
    });
    return fetchAPI('/api/solo/list', {
      method: 'POST',
      body: JSON.stringify({ movieId }),
    });
  },

  // Friends
  getFriends: () => fetchAPI<{ friends: Friend[] }>('/api/friends'),
  searchUsers: (query: string) =>
    fetchAPI<{ users: User[] }>(`/api/friends/search?q=${encodeURIComponent(query)}`),
  addFriend: (userId: string) =>
    fetchAPI('/api/friends', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  // Sessions
  createSession: () => fetchAPI<Session>('/api/sessions', { method: 'POST' }),
  joinSession: (code: string) =>
    fetchAPI<Session>('/api/sessions/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  getSession: (id: string) => fetchAPI<Session>(`/api/sessions/${id}`),
};
