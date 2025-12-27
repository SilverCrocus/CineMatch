/**
 * Movie Service Tests - Comprehensive tests for movie fetching, caching, and deck building
 */

// Mock database
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
}));

// Mock TMDB API
jest.mock('@/lib/api/tmdb', () => ({
  discoverMovies: jest.fn(),
  getMovieDetails: jest.fn(),
  getWatchProviders: jest.fn(),
  searchMovies: jest.fn(),
  getPosterUrl: jest.fn((path: string, size: string) =>
    path ? `https://image.tmdb.org/t/p/${size}${path}` : null
  ),
  getBackdropUrl: jest.fn((path: string, size: string) =>
    path ? `https://image.tmdb.org/t/p/${size}${path}` : null
  ),
  getGenreNames: jest.fn((ids: number[]) => ids.map((id) => `Genre ${id}`)),
  getYear: jest.fn((date: string) => (date ? parseInt(date.split('-')[0]) : null)),
}));

// Mock OMDb API
jest.mock('@/lib/api/omdb', () => ({
  getOMDbRatings: jest.fn(),
}));

import { query, queryOne } from '@/lib/db';
import {
  discoverMovies,
  getMovieDetails,
  getWatchProviders,
  searchMovies,
  getYear,
} from '@/lib/api/tmdb';
import { getOMDbRatings } from '@/lib/api/omdb';
import {
  getOrFetchMovie,
  buildDeckFromFilters,
  buildDeckFromTitles,
  getMoviesByIds,
  searchMoviesByTitle,
} from '@/lib/services/movies';

describe('Movie Services', () => {
  const mockTmdbDetails = {
    id: 27205,
    title: 'Inception',
    overview: 'A thief who steals corporate secrets through dream-sharing technology.',
    release_date: '2010-07-16',
    poster_path: '/poster.jpg',
    backdrop_path: '/backdrop.jpg',
    runtime: 148,
    genres: [
      { id: 28, name: 'Action' },
      { id: 878, name: 'Science Fiction' },
    ],
    imdb_id: 'tt1375666',
  };

  const mockProviders = ['Netflix', 'Amazon Prime'];

  const mockRatings = {
    imdbRating: '8.8',
    rtCriticScore: '87%',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrFetchMovie', () => {
    it('should return cached movie if cache is valid', async () => {
      const cachedMovie = {
        id: 'uuid-123',
        tmdb_id: 27205,
        imdb_id: 'tt1375666',
        title: 'Inception',
        year: 2010,
        poster_url: 'https://image.tmdb.org/t/p/w500/poster.jpg',
        backdrop_url: 'https://image.tmdb.org/t/p/w1280/backdrop.jpg',
        genres: ['Action', 'Science Fiction'],
        synopsis: 'A thief who steals corporate secrets.',
        runtime: 148,
        imdb_rating: '8.8',
        rt_critic_score: '87%',
        streaming_services: ['Netflix'],
        cached_at: new Date().toISOString(), // Fresh cache
      };

      (queryOne as jest.Mock).mockResolvedValue(cachedMovie);

      const result = await getOrFetchMovie(27205);

      expect(result).toBeDefined();
      expect(result?.title).toBe('Inception');
      expect(result?.tmdbId).toBe(27205);
      expect(getMovieDetails).not.toHaveBeenCalled(); // Should use cache
    });

    it('should fetch fresh data if cache is expired', async () => {
      const expiredCache = {
        id: 'uuid-123',
        tmdb_id: 27205,
        cached_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours old
      };

      (queryOne as jest.Mock).mockResolvedValue(expiredCache);
      (getMovieDetails as jest.Mock).mockResolvedValue(mockTmdbDetails);
      (getWatchProviders as jest.Mock).mockResolvedValue(mockProviders);
      (getOMDbRatings as jest.Mock).mockResolvedValue(mockRatings);
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await getOrFetchMovie(27205);

      expect(getMovieDetails).toHaveBeenCalledWith(27205);
      expect(result?.title).toBe('Inception');
    });

    it('should fetch and cache new movie if not in cache', async () => {
      (queryOne as jest.Mock).mockResolvedValue(null); // No cache
      (getMovieDetails as jest.Mock).mockResolvedValue(mockTmdbDetails);
      (getWatchProviders as jest.Mock).mockResolvedValue(mockProviders);
      (getOMDbRatings as jest.Mock).mockResolvedValue(mockRatings);
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await getOrFetchMovie(27205);

      expect(result).toBeDefined();
      expect(result?.title).toBe('Inception');
      expect(result?.imdbRating).toBe('8.8');
      expect(result?.rtCriticScore).toBe('87%');
      expect(result?.streamingServices).toEqual(mockProviders);
      expect(query).toHaveBeenCalled(); // Should cache
    });

    it('should return null if TMDB fetch fails', async () => {
      (queryOne as jest.Mock).mockResolvedValue(null);
      (getMovieDetails as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await getOrFetchMovie(99999);

      expect(result).toBeNull();
    });

    it('should handle missing IMDB ID gracefully', async () => {
      const detailsWithoutImdb = { ...mockTmdbDetails, imdb_id: null };

      (queryOne as jest.Mock).mockResolvedValue(null);
      (getMovieDetails as jest.Mock).mockResolvedValue(detailsWithoutImdb);
      (getWatchProviders as jest.Mock).mockResolvedValue([]);
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await getOrFetchMovie(27205);

      expect(result?.imdbRating).toBeNull();
      expect(result?.rtCriticScore).toBeNull();
      expect(getOMDbRatings).not.toHaveBeenCalled();
    });

    it('should handle OMDb API failures gracefully', async () => {
      (queryOne as jest.Mock).mockResolvedValue(null);
      (getMovieDetails as jest.Mock).mockResolvedValue(mockTmdbDetails);
      (getWatchProviders as jest.Mock).mockResolvedValue(mockProviders);
      (getOMDbRatings as jest.Mock).mockRejectedValue(new Error('OMDb Error'));
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await getOrFetchMovie(27205);

      expect(result).toBeDefined();
      expect(result?.imdbRating).toBeNull();
    });
  });

  describe('buildDeckFromFilters', () => {
    const mockDiscoverResults = {
      movies: [
        { id: 1, title: 'Movie 1', release_date: '2020-01-01' },
        { id: 2, title: 'Movie 2', release_date: '2021-01-01' },
        { id: 3, title: 'Movie 3', release_date: '2022-01-01' },
      ],
      totalPages: 1,
    };

    it('should build deck from genre filters', async () => {
      (discoverMovies as jest.Mock).mockResolvedValue(mockDiscoverResults);
      (queryOne as jest.Mock).mockResolvedValue(null);
      (getMovieDetails as jest.Mock).mockResolvedValue(mockTmdbDetails);
      (getWatchProviders as jest.Mock).mockResolvedValue([]);
      (getOMDbRatings as jest.Mock).mockResolvedValue({ imdbRating: null, rtCriticScore: null });
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const filters = { genres: [28, 878], limit: 3 };
      const result = await buildDeckFromFilters(filters);

      expect(discoverMovies).toHaveBeenCalledWith({
        genres: [28, 878],
        yearFrom: undefined,
        yearTo: undefined,
        page: 1,
      });
      expect(result).toHaveLength(3);
    });

    it('should build deck from year range filters', async () => {
      (discoverMovies as jest.Mock).mockResolvedValue(mockDiscoverResults);
      (queryOne as jest.Mock).mockResolvedValue(null);
      (getMovieDetails as jest.Mock).mockResolvedValue(mockTmdbDetails);
      (getWatchProviders as jest.Mock).mockResolvedValue([]);
      (getOMDbRatings as jest.Mock).mockResolvedValue({ imdbRating: null, rtCriticScore: null });
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const filters = { yearFrom: 2000, yearTo: 2020, limit: 3 };
      const result = await buildDeckFromFilters(filters);

      expect(discoverMovies).toHaveBeenCalledWith({
        genres: undefined,
        yearFrom: 2000,
        yearTo: 2020,
        page: 1,
      });
    });

    it('should respect limit parameter', async () => {
      const manyMovies = {
        movies: Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          title: `Movie ${i + 1}`,
          release_date: '2020-01-01',
        })),
        totalPages: 1,
      };

      (discoverMovies as jest.Mock).mockResolvedValue(manyMovies);
      (queryOne as jest.Mock).mockResolvedValue(null);
      (getMovieDetails as jest.Mock).mockResolvedValue(mockTmdbDetails);
      (getWatchProviders as jest.Mock).mockResolvedValue([]);
      (getOMDbRatings as jest.Mock).mockResolvedValue({ imdbRating: null, rtCriticScore: null });
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await buildDeckFromFilters({ limit: 5 });

      expect(result).toHaveLength(5);
    });

    it('should use default limit of 20', async () => {
      const manyMovies = {
        movies: Array.from({ length: 25 }, (_, i) => ({
          id: i + 1,
          title: `Movie ${i + 1}`,
          release_date: '2020-01-01',
        })),
        totalPages: 1,
      };

      (discoverMovies as jest.Mock).mockResolvedValue(manyMovies);
      (queryOne as jest.Mock).mockResolvedValue(null);
      (getMovieDetails as jest.Mock).mockResolvedValue(mockTmdbDetails);
      (getWatchProviders as jest.Mock).mockResolvedValue([]);
      (getOMDbRatings as jest.Mock).mockResolvedValue({ imdbRating: null, rtCriticScore: null });
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await buildDeckFromFilters({});

      expect(result).toHaveLength(20);
    });

    it('should paginate through results if needed', async () => {
      const page1 = {
        movies: Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          title: `Movie ${i + 1}`,
          release_date: '2020-01-01',
        })),
        totalPages: 3,
      };

      const page2 = {
        movies: Array.from({ length: 5 }, (_, i) => ({
          id: i + 6,
          title: `Movie ${i + 6}`,
          release_date: '2020-01-01',
        })),
        totalPages: 3,
      };

      (discoverMovies as jest.Mock)
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);
      (queryOne as jest.Mock).mockResolvedValue(null);
      (getMovieDetails as jest.Mock).mockResolvedValue(mockTmdbDetails);
      (getWatchProviders as jest.Mock).mockResolvedValue([]);
      (getOMDbRatings as jest.Mock).mockResolvedValue({ imdbRating: null, rtCriticScore: null });
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await buildDeckFromFilters({ limit: 8 });

      expect(discoverMovies).toHaveBeenCalledTimes(2);
      expect(result.length).toBeLessThanOrEqual(8);
    });

    it('should filter out failed movie fetches', async () => {
      (discoverMovies as jest.Mock).mockResolvedValue(mockDiscoverResults);
      (queryOne as jest.Mock).mockResolvedValue(null);
      (getMovieDetails as jest.Mock)
        .mockResolvedValueOnce(mockTmdbDetails)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(mockTmdbDetails);
      (getWatchProviders as jest.Mock).mockResolvedValue([]);
      (getOMDbRatings as jest.Mock).mockResolvedValue({ imdbRating: null, rtCriticScore: null });
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await buildDeckFromFilters({ limit: 3 });

      // Should have 2 movies (1 failed)
      expect(result.length).toBe(2);
    });
  });

  describe('buildDeckFromTitles', () => {
    it('should build deck from title list', async () => {
      const searchResults = [
        { id: 27205, title: 'Inception', release_date: '2010-07-16' },
      ];

      (searchMovies as jest.Mock).mockResolvedValue(searchResults);
      (queryOne as jest.Mock).mockResolvedValue(null);
      (getMovieDetails as jest.Mock).mockResolvedValue(mockTmdbDetails);
      (getWatchProviders as jest.Mock).mockResolvedValue(mockProviders);
      (getOMDbRatings as jest.Mock).mockResolvedValue(mockRatings);
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      (getYear as jest.Mock).mockReturnValue(2010);

      const titles = [{ title: 'Inception', year: 2010 }];
      const result = await buildDeckFromTitles(titles);

      expect(searchMovies).toHaveBeenCalledWith('Inception');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Inception');
    });

    it('should find exact title and year match', async () => {
      const searchResults = [
        { id: 1, title: 'Inception', release_date: '2010-07-16' },
        { id: 2, title: 'Inception: The Beginning', release_date: '2015-01-01' },
      ];

      (searchMovies as jest.Mock).mockResolvedValue(searchResults);
      (queryOne as jest.Mock).mockResolvedValue(null);
      (getMovieDetails as jest.Mock).mockResolvedValue(mockTmdbDetails);
      (getWatchProviders as jest.Mock).mockResolvedValue([]);
      (getOMDbRatings as jest.Mock).mockResolvedValue({ imdbRating: null, rtCriticScore: null });
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      (getYear as jest.Mock).mockImplementation((date: string) =>
        date ? parseInt(date.split('-')[0]) : null
      );

      const titles = [{ title: 'Inception', year: 2010 }];
      const result = await buildDeckFromTitles(titles);

      // Should prefer exact match
      expect(result).toHaveLength(1);
    });

    it('should fallback to first result if no exact match', async () => {
      const searchResults = [
        { id: 1, title: 'Inception (Different)', release_date: '2010-07-16' },
      ];

      (searchMovies as jest.Mock).mockResolvedValue(searchResults);
      (queryOne as jest.Mock).mockResolvedValue(null);
      (getMovieDetails as jest.Mock).mockResolvedValue({
        ...mockTmdbDetails,
        title: 'Inception (Different)',
      });
      (getWatchProviders as jest.Mock).mockResolvedValue([]);
      (getOMDbRatings as jest.Mock).mockResolvedValue({ imdbRating: null, rtCriticScore: null });
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      (getYear as jest.Mock).mockReturnValue(2010);

      const titles = [{ title: 'Inception' }];
      const result = await buildDeckFromTitles(titles);

      expect(result).toHaveLength(1);
    });

    it('should skip titles with no search results', async () => {
      (searchMovies as jest.Mock).mockResolvedValue([]);

      const titles = [{ title: 'Nonexistent Movie 12345' }];
      const result = await buildDeckFromTitles(titles);

      expect(result).toHaveLength(0);
    });

    it('should handle search errors gracefully', async () => {
      (searchMovies as jest.Mock)
        .mockResolvedValueOnce([
          { id: 1, title: 'Movie 1', release_date: '2020-01-01' },
        ])
        .mockRejectedValueOnce(new Error('Search failed'));
      (queryOne as jest.Mock).mockResolvedValue(null);
      (getMovieDetails as jest.Mock).mockResolvedValue(mockTmdbDetails);
      (getWatchProviders as jest.Mock).mockResolvedValue([]);
      (getOMDbRatings as jest.Mock).mockResolvedValue({ imdbRating: null, rtCriticScore: null });
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      (getYear as jest.Mock).mockReturnValue(2020);

      const titles = [{ title: 'Movie 1' }, { title: 'Movie 2' }];
      const result = await buildDeckFromTitles(titles);

      expect(result).toHaveLength(1); // Only first movie succeeds
    });

    it('should handle multiple titles', async () => {
      (searchMovies as jest.Mock).mockResolvedValue([
        { id: 1, title: 'Test', release_date: '2020-01-01' },
      ]);
      (queryOne as jest.Mock).mockResolvedValue(null);
      (getMovieDetails as jest.Mock).mockResolvedValue(mockTmdbDetails);
      (getWatchProviders as jest.Mock).mockResolvedValue([]);
      (getOMDbRatings as jest.Mock).mockResolvedValue({ imdbRating: null, rtCriticScore: null });
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      (getYear as jest.Mock).mockReturnValue(2020);

      const titles = [
        { title: 'Inception' },
        { title: 'The Dark Knight' },
        { title: 'Interstellar' },
      ];
      const result = await buildDeckFromTitles(titles);

      expect(searchMovies).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
    });
  });

  describe('getMoviesByIds', () => {
    it('should fetch multiple movies by TMDB IDs', async () => {
      (queryOne as jest.Mock).mockResolvedValue(null);
      (getMovieDetails as jest.Mock).mockResolvedValue(mockTmdbDetails);
      (getWatchProviders as jest.Mock).mockResolvedValue([]);
      (getOMDbRatings as jest.Mock).mockResolvedValue({ imdbRating: null, rtCriticScore: null });
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await getMoviesByIds([27205, 155, 157336]);

      expect(result).toHaveLength(3);
    });

    it('should filter out failed fetches', async () => {
      (queryOne as jest.Mock).mockResolvedValue(null);
      (getMovieDetails as jest.Mock)
        .mockResolvedValueOnce(mockTmdbDetails)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(mockTmdbDetails);
      (getWatchProviders as jest.Mock).mockResolvedValue([]);
      (getOMDbRatings as jest.Mock).mockResolvedValue({ imdbRating: null, rtCriticScore: null });
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await getMoviesByIds([1, 2, 3]);

      expect(result).toHaveLength(2); // Middle one failed
    });

    it('should return empty array for empty input', async () => {
      const result = await getMoviesByIds([]);

      expect(result).toEqual([]);
    });
  });

  describe('searchMoviesByTitle', () => {
    it('should search and return basic movie info', async () => {
      const searchResults = [
        {
          id: 27205,
          title: 'Inception',
          release_date: '2010-07-16',
          poster_path: '/poster.jpg',
          backdrop_path: null,
          genre_ids: [28, 878],
          overview: 'A thief who steals corporate secrets.',
        },
      ];

      (searchMovies as jest.Mock).mockResolvedValue(searchResults);

      const result = await searchMoviesByTitle('Inception');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Inception');
      expect(result[0].tmdbId).toBe(27205);
      expect(result[0].imdbRating).toBeNull(); // Not enriched for search
      expect(result[0].runtime).toBeNull(); // Not enriched for search
    });

    it('should limit results to 10', async () => {
      const manyResults = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: `Movie ${i + 1}`,
        release_date: '2020-01-01',
        poster_path: '/poster.jpg',
        backdrop_path: null,
        genre_ids: [28],
        overview: 'Synopsis',
      }));

      (searchMovies as jest.Mock).mockResolvedValue(manyResults);

      const result = await searchMoviesByTitle('Movie');

      expect(result).toHaveLength(10);
    });

    it('should return empty array for no results', async () => {
      (searchMovies as jest.Mock).mockResolvedValue([]);

      const result = await searchMoviesByTitle('asdfghjkl12345');

      expect(result).toEqual([]);
    });
  });

  describe('Cache Validation', () => {
    it('should consider cache valid within 24 hours', async () => {
      const recentCache = {
        id: 'uuid-123',
        tmdb_id: 27205,
        imdb_id: 'tt1375666',
        title: 'Inception',
        year: 2010,
        poster_url: '/poster.jpg',
        backdrop_url: '/backdrop.jpg',
        genres: ['Action'],
        synopsis: 'A thief...',
        runtime: 148,
        imdb_rating: '8.8',
        rt_critic_score: '87%',
        streaming_services: ['Netflix'],
        cached_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours old
      };

      (queryOne as jest.Mock).mockResolvedValue(recentCache);

      await getOrFetchMovie(27205);

      expect(getMovieDetails).not.toHaveBeenCalled(); // Should use cache
    });

    it('should consider cache invalid after 24 hours', async () => {
      const oldCache = {
        id: 'uuid-123',
        tmdb_id: 27205,
        cached_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours old
      };

      (queryOne as jest.Mock).mockResolvedValue(oldCache);
      (getMovieDetails as jest.Mock).mockResolvedValue(mockTmdbDetails);
      (getWatchProviders as jest.Mock).mockResolvedValue([]);
      (getOMDbRatings as jest.Mock).mockResolvedValue({ imdbRating: null, rtCriticScore: null });
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await getOrFetchMovie(27205);

      expect(getMovieDetails).toHaveBeenCalled(); // Should refresh
    });
  });
});
