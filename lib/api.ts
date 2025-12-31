import * as SecureStore from 'expo-secure-store';
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
// Falls back to regular API on React Native where streaming isn't supported
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

  let aborted = false;

  // Try streaming first, fall back to regular API if streaming isn't supported
  const fetchMovies = async () => {
    try {
      // First, try the streaming endpoint
      const streamUrl = `${API_BASE_URL}/api/solo/movies/stream${query ? `?${query}` : ''}`;
      console.log('[API Stream] Connecting to:', streamUrl);

      const response = await fetch(streamUrl, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'text/event-stream',
        },
      });

      if (!response.ok) {
        throw new Error(`Stream error: ${response.status}`);
      }

      // Check if streaming is supported (React Native doesn't support ReadableStream)
      const reader = response.body?.getReader();
      if (!reader) {
        console.log('[API] Streaming not supported, falling back to regular API');
        throw new Error('Streaming not supported');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (!aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (!data) continue;

            try {
              const parsed = JSON.parse(data);

              if (currentEvent === 'movie') {
                console.log('[API Stream] Movie received:', parsed.title);
                onMovie(parsed as Movie);
              } else if (currentEvent === 'rt:update') {
                console.log('[API Stream] RT update:', parsed.imdbId, parsed.rtCriticScore, parsed.rtAudienceScore);
                onRTUpdate(parsed as RTScoreUpdate);
              } else if (currentEvent === 'done') {
                console.log('[API Stream] Done:', parsed);
                onDone();
              } else if (currentEvent === 'error') {
                console.error('[API Stream] Error event:', parsed);
                onError(new Error(parsed.message || 'Stream error'));
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      reader.releaseLock();
    } catch (error) {
      // If streaming failed (not supported or error), fall back to regular API
      if (aborted) return;

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage === 'Streaming not supported' || errorMessage.includes('No reader')) {
        console.log('[API] Using fallback non-streaming API');
        try {
          const fallbackUrl = `${API_BASE_URL}/api/solo/movies${query ? `?${query}` : ''}`;
          const fallbackResponse = await fetch(fallbackUrl, {
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });

          if (!fallbackResponse.ok) {
            throw new Error(`API error: ${fallbackResponse.status}`);
          }

          const data = await fallbackResponse.json();
          const movies = data.movies || [];

          console.log(`[API Fallback] Received ${movies.length} movies`);

          // Emit each movie
          for (const movie of movies) {
            if (aborted) break;
            onMovie(movie);
          }

          if (!aborted) {
            onDone();
          }
        } catch (fallbackError) {
          if (!aborted) {
            console.error('[API Fallback] Error:', fallbackError);
            onError(fallbackError instanceof Error ? fallbackError : new Error('Failed to load movies'));
          }
        }
      } else {
        console.error('[API Stream] Error:', error);
        onError(error instanceof Error ? error : new Error('Stream failed'));
      }
    }
  };

  fetchMovies();

  // Return abort function
  return () => {
    aborted = true;
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
