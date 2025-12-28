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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new APIError(`API error: ${response.statusText}`, response.status);
  }

  return response.json();
}

export const api = {
  // Solo mode
  getMovies: () => fetchAPI<{ movies: Movie[] }>('/api/solo/movies'),
  likeMovie: (movieId: number) =>
    fetchAPI('/api/solo/list', {
      method: 'POST',
      body: JSON.stringify({ movieId }),
    }),
  dismissMovie: (movieId: number) =>
    fetchAPI('/api/solo/dismissed', {
      method: 'POST',
      body: JSON.stringify({ movieId }),
    }),
  getMyList: () => fetchAPI<{ movies: Movie[] }>('/api/solo/list'),

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
