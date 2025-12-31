import * as SecureStore from 'expo-secure-store';
import EventSource from 'react-native-sse';
import { API_BASE_URL, SECURE_STORE_KEYS } from './constants';
import { Movie, Friend, User } from '../types';

// Session types
export interface SessionSource {
  type: 'filters' | 'url' | 'text';
  filters?: {
    genres?: number[];
    yearFrom?: number;
    yearTo?: number;
  };
  url?: string;
  textList?: string;
}

export interface SessionParticipant {
  id: string;
  odUserId: string;
  nickname: string;
  completed: boolean;
  user: { id: string; name: string; image: string };
}

export interface Session {
  id: string;
  code: string;
  status: 'lobby' | 'swiping' | 'revealed';
  hostId: string;
  participants: SessionParticipant[];
  movies: Movie[];
  userSwipes: Record<number, boolean>;
  isHost: boolean;
}

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

// RT score update from streaming API
export interface RTScoreUpdate {
  imdbId: string;
  rtCriticScore: string | null;
  rtAudienceScore: string | null;
  rtUrl: string | null;
}

// Streaming movies API - returns movies progressively with RT scores streamed separately
// Uses react-native-sse EventSource for proper SSE support on React Native
export async function streamMovies(
  params: MovieFilterParams | undefined,
  onMovie: (movie: Movie) => void,
  onRTUpdate: (update: RTScoreUpdate) => void,
  onDone: () => void,
  onError: (error: Error) => void
): Promise<() => void> {
  const token = await SecureStore.getItemAsync(SECURE_STORE_KEYS.SESSION_TOKEN);

  const searchParams = new URLSearchParams();
  if (params?.source) searchParams.set('source', params.source);
  if (params?.genres) searchParams.set('genres', params.genres);
  if (params?.match) searchParams.set('match', params.match);
  if (params?.yearFrom) searchParams.set('yearFrom', String(params.yearFrom));
  if (params?.yearTo) searchParams.set('yearTo', String(params.yearTo));
  if (params?.movie) searchParams.set('movie', params.movie);
  const query = searchParams.toString();

  const streamUrl = `${API_BASE_URL}/api/solo/movies/stream${query ? `?${query}` : ''}`;
  console.log('[API Stream] Connecting to:', streamUrl);

  // Create EventSource with auth header
  const es = new EventSource(streamUrl, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // Handle movie events
  es.addEventListener('movie', (event) => {
    try {
      const data = event.data;
      if (data) {
        const parsed = JSON.parse(data);
        console.log('[API Stream] Movie received:', parsed.title);
        onMovie(parsed as Movie);
      }
    } catch (e) {
      console.error('[API Stream] Failed to parse movie:', e);
    }
  });

  // Handle RT score updates
  es.addEventListener('rt:update', (event) => {
    try {
      const data = event.data;
      if (data) {
        const parsed = JSON.parse(data);
        console.log('[API Stream] RT update:', parsed.imdbId, parsed.rtCriticScore, parsed.rtAudienceScore);
        onRTUpdate(parsed as RTScoreUpdate);
      }
    } catch (e) {
      console.error('[API Stream] Failed to parse RT update:', e);
    }
  });

  // Handle done event
  es.addEventListener('done', (event) => {
    try {
      const data = event.data;
      console.log('[API Stream] Done:', data);
      es.close();
      onDone();
    } catch (e) {
      console.error('[API Stream] Failed to parse done:', e);
      es.close();
      onDone();
    }
  });

  // Handle server errors
  es.addEventListener('error', (event) => {
    const errorData = event.data;
    console.error('[API Stream] Server error:', errorData);
    es.close();
    try {
      const parsed = JSON.parse(errorData || '{}');
      onError(new Error(parsed.message || 'Stream error'));
    } catch {
      onError(new Error('Stream error'));
    }
  });

  // Handle connection errors
  es.addEventListener('open', () => {
    console.log('[API Stream] Connection opened');
  });

  // Handle EventSource errors (connection issues)
  const originalOnError = es.onerror;
  es.onerror = (error) => {
    console.error('[API Stream] Connection error:', error);
    es.close();
    onError(new Error('Failed to connect to stream'));
    if (originalOnError) originalOnError(error);
  };

  // Return abort function
  return () => {
    console.log('[API Stream] Aborting stream');
    es.close();
  };
}

export const api = {
  // Solo mode - movies (non-streaming fallback)
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
  getFriends: () =>
    fetchAPI<{
      friends: User[];
      pendingRequests: Array<{
        id: string;
        createdAt: string;
        user: User;
      }>;
    }>('/api/friends'),
  searchUsers: (query: string) =>
    fetchAPI<{ users: User[] }>(`/api/friends/search?q=${encodeURIComponent(query)}`),
  sendFriendRequest: (friendId: string) =>
    fetchAPI<{ success: boolean }>('/api/friends', {
      method: 'POST',
      body: JSON.stringify({ friendId }),
    }),
  acceptFriendRequest: (requestId: string) =>
    fetchAPI<{ success: boolean }>(`/api/friends/${requestId}`, {
      method: 'PATCH',
    }),
  rejectFriendRequest: (requestId: string) =>
    fetchAPI<{ success: boolean }>(`/api/friends/${requestId}`, {
      method: 'DELETE',
    }),

  // Sessions
  createSession: (source: SessionSource) =>
    fetchAPI<{ id: string; code: string }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ source }),
    }),

  joinSession: (code: string) =>
    fetchAPI<{ sessionId: string }>('/api/sessions/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  getSession: (sessionId: string): Promise<Session> =>
    fetchAPI<Session>(`/api/sessions/${sessionId}`),

  startSession: (sessionId: string) =>
    fetchAPI(`/api/sessions/${sessionId}/start`, {
      method: 'POST',
    }),

  swipeInSession: (sessionId: string, movieId: number, liked: boolean) =>
    fetchAPI(`/api/sessions/${sessionId}/swipe`, {
      method: 'POST',
      body: JSON.stringify({ movieId, liked }),
    }),

  revealMatches: async (sessionId: string) => {
    await fetchAPI(`/api/sessions/${sessionId}/reveal`, { method: 'POST' });
    return fetchAPI<{ matches: Movie[] }>(`/api/sessions/${sessionId}/reveal`);
  },

  getPrematches: async (sessionId: string) => {
    const response = await fetchAPI<{ prematches: Array<{ movie: Movie }> }>(
      `/api/sessions/${sessionId}/prematches`
    );
    return { movies: response.prematches.map((p) => p.movie).filter(Boolean) };
  },

  selectMovie: (sessionId: string, movieId: number) =>
    fetchAPI(`/api/sessions/${sessionId}/select`, {
      method: 'POST',
      body: JSON.stringify({ movieId }),
    }),
};
