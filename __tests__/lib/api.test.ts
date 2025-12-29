import * as SecureStore from 'expo-secure-store';
import { api, fetchAPI } from '../../lib/api';

// Use mocked values
const API_BASE_URL = 'http://localhost:3000';

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('fetchAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add Authorization header when token exists', async () => {
    const mockToken = 'test-token-123';
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    } as Response);

    await fetchAPI('/api/test');

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/test`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockToken}`,
        }),
      })
    );
  });

  it('should not add Authorization header when no token', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    } as Response);

    await fetchAPI('/api/test');

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/test`,
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      })
    );
  });

  it('should throw APIError on non-ok response', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () => Promise.resolve('Unauthorized'),
    } as Response);

    await expect(fetchAPI('/api/test')).rejects.toThrow('API error: Unauthorized');
  });

  it('should parse JSON response', async () => {
    const mockData = { movies: [{ id: 1, title: 'Test Movie' }] };
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await fetchAPI('/api/test');

    expect(result).toEqual(mockData);
  });
});

describe('api.getMovies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-token');
  });

  it('should fetch movies without params', async () => {
    const mockMovies = { movies: [{ id: 1, title: 'Movie 1' }] };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMovies),
    } as Response);

    const result = await api.getMovies();

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/solo/movies`,
      expect.any(Object)
    );
    expect(result).toEqual(mockMovies);
  });

  it('should include source param when provided', async () => {
    const mockMovies = { movies: [] };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMovies),
    } as Response);

    await api.getMovies({ source: 'browse' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('source=browse'),
      expect.any(Object)
    );
  });

  it('should include genres param when provided', async () => {
    const mockMovies = { movies: [] };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMovies),
    } as Response);

    await api.getMovies({ source: 'browse', genres: '28' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('genres=28'),
      expect.any(Object)
    );
  });
});

describe('api.likeMovie', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-token');
  });

  it('should POST to /api/solo/list with movieId', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response);

    await api.likeMovie(12345);

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/solo/list`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ movieId: 12345 }),
      })
    );
  });
});

describe('api.dismissMovie', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-token');
  });

  it('should POST to /api/solo/dismissed with movieId', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response);

    await api.dismissMovie(12345);

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/solo/dismissed`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ movieId: 12345 }),
      })
    );
  });
});

describe('api.getMyList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-token');
  });

  it('should GET /api/solo/list', async () => {
    const mockWatchlist = {
      watchlist: [
        { id: '1', movieId: 123, addedAt: '2024-01-01', movie: { id: 123, title: 'Test' } },
      ],
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWatchlist),
    } as Response);

    const result = await api.getMyList();

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/solo/list`,
      expect.any(Object)
    );
    expect(result).toEqual(mockWatchlist);
  });
});

describe('api.removeFromList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-token');
  });

  it('should DELETE from /api/solo/list with movieId', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response);

    await api.removeFromList(12345);

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/solo/list`,
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ movieId: 12345 }),
      })
    );
  });
});

describe('api.restoreFromDismissed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-token');
  });

  it('should DELETE from dismissed then POST to list', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response);

    await api.restoreFromDismissed(12345);

    // First call should be DELETE from dismissed
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/api/solo/dismissed`,
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ movieId: 12345 }),
      })
    );

    // Second call should be POST to list
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/api/solo/list`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ movieId: 12345 }),
      })
    );
  });
});
