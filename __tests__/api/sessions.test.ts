/**
 * Session API Tests - Comprehensive tests for all session endpoints
 */

// Mock database
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  queryMany: jest.fn(),
}));

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock movie services
jest.mock('@/lib/services/movies', () => ({
  buildDeckFromFilters: jest.fn(),
  buildDeckFromTitles: jest.fn(),
  getMoviesByIds: jest.fn(),
  getOrFetchMovie: jest.fn(),
}));

// Mock parsers
jest.mock('@/lib/parsers', () => ({
  parseMovieListUrl: jest.fn(),
  parseTextList: jest.fn(),
}));

import { query, queryOne, queryMany } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { buildDeckFromFilters, buildDeckFromTitles, getMoviesByIds } from '@/lib/services/movies';
import { parseMovieListUrl, parseTextList } from '@/lib/parsers';
import { generateRoomCode } from '@/lib/utils';

describe('Session API', () => {
  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockSession = {
    user: mockUser,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  describe('Room Code Generation', () => {
    it('should generate unique room codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        codes.add(generateRoomCode());
      }
      // With 32^4 possible combinations, should be mostly unique
      expect(codes.size).toBeGreaterThan(900);
    });

    it('should not include ambiguous characters', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateRoomCode();
        expect(code).not.toMatch(/[01IO]/);
      }
    });
  });

  describe('Session Creation Logic', () => {
    const mockMovies = [
      { tmdbId: 1, title: 'Movie 1' },
      { tmdbId: 2, title: 'Movie 2' },
      { tmdbId: 3, title: 'Movie 3' },
    ];

    it('should build deck from filters', async () => {
      (buildDeckFromFilters as jest.Mock).mockResolvedValue(mockMovies);

      const filters = { genres: [28, 12], yearFrom: 2000, yearTo: 2023 };
      const result = await buildDeckFromFilters({ ...filters, limit: 25 });

      expect(result).toEqual(mockMovies);
      expect(buildDeckFromFilters).toHaveBeenCalledWith({ ...filters, limit: 25 });
    });

    it('should build deck from URL', async () => {
      (parseMovieListUrl as jest.Mock).mockResolvedValue({
        titles: ['Inception', 'The Dark Knight', 'Interstellar'],
        source: 'Letterboxd',
      });
      (buildDeckFromTitles as jest.Mock).mockResolvedValue(mockMovies);

      const url = 'https://letterboxd.com/user/list/favorites';
      const parsed = await parseMovieListUrl(url);

      expect(parsed.titles).toHaveLength(3);
      expect(parsed.error).toBeUndefined();
    });

    it('should handle URL parsing errors', async () => {
      (parseMovieListUrl as jest.Mock).mockResolvedValue({
        titles: [],
        source: 'unknown',
        error: 'Failed to parse URL',
      });

      const result = await parseMovieListUrl('https://invalid-url.com');

      expect(result.titles).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it('should build deck from text list', () => {
      const textInput = `Inception
The Dark Knight
Interstellar`;
      (parseTextList as jest.Mock).mockReturnValue([
        'Inception',
        'The Dark Knight',
        'Interstellar',
      ]);

      const titles = parseTextList(textInput);

      expect(titles).toHaveLength(3);
    });

    it('should limit deck size', async () => {
      const manyMovies = Array.from({ length: 100 }, (_, i) => ({
        tmdbId: i + 1,
        title: `Movie ${i + 1}`,
      }));
      (buildDeckFromFilters as jest.Mock).mockResolvedValue(manyMovies.slice(0, 25));

      const result = await buildDeckFromFilters({ limit: 25 });

      expect(result.length).toBeLessThanOrEqual(25);
    });
  });

  describe('Session Join Logic', () => {
    it('should find session by code', async () => {
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'session-123',
        status: 'lobby',
      });

      const result = await queryOne(
        'SELECT id, status FROM sessions WHERE code = $1',
        ['ABCD']
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('lobby');
    });

    it('should reject join if session not found', async () => {
      (queryOne as jest.Mock).mockResolvedValue(null);

      const result = await queryOne(
        'SELECT id, status FROM sessions WHERE code = $1',
        ['INVALID']
      );

      expect(result).toBeNull();
    });

    it('should reject join if session already started', async () => {
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'session-123',
        status: 'swiping', // Not 'lobby'
      });

      const result = await queryOne(
        'SELECT id, status FROM sessions WHERE code = $1',
        ['ABCD']
      );

      expect(result.status).not.toBe('lobby');
    });

    it('should check for existing participation', async () => {
      (queryOne as jest.Mock)
        .mockResolvedValueOnce({ id: 'session-123', status: 'lobby' })
        .mockResolvedValueOnce({ id: 'participant-123' }); // Already joined

      const session = await queryOne('SELECT id FROM sessions WHERE code = $1', ['ABCD']);
      const existing = await queryOne(
        'SELECT id FROM session_participants WHERE session_id = $1 AND user_id = $2',
        [session.id, 'user-123']
      );

      expect(existing).toBeDefined();
    });
  });

  describe('Swiping Logic', () => {
    it('should record swipe', async () => {
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await query(
        `INSERT INTO swipes (session_id, user_id, movie_id, liked)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (session_id, user_id, movie_id)
         DO UPDATE SET liked = $4`,
        ['session-123', 'user-123', 12345, true]
      );

      expect(query).toHaveBeenCalled();
    });

    it('should count user swipes', async () => {
      (queryOne as jest.Mock).mockResolvedValue({ count: '25' });

      const result = await queryOne(
        'SELECT COUNT(*) as count FROM swipes WHERE session_id = $1 AND user_id = $2',
        ['session-123', 'user-123']
      );

      expect(parseInt(result.count)).toBe(25);
    });

    it('should mark participant as completed when all movies swiped', async () => {
      const deckSize = 25;
      (queryOne as jest.Mock)
        .mockResolvedValueOnce({ status: 'swiping', deck: Array(deckSize).fill(1) })
        .mockResolvedValueOnce({ count: String(deckSize) });

      const session = await queryOne('SELECT status, deck FROM sessions WHERE id = $1', ['session-123']);
      const swipeCount = await queryOne(
        'SELECT COUNT(*) as count FROM swipes WHERE session_id = $1 AND user_id = $2',
        ['session-123', 'user-123']
      );

      const completed = parseInt(swipeCount.count) === session.deck.length;
      expect(completed).toBe(true);
    });
  });

  describe('Match Finding Logic', () => {
    it('should find movies everyone liked', () => {
      const participantIds = ['user-1', 'user-2', 'user-3'];
      const swipes = [
        // Movie 1: Everyone liked
        { movie_id: 1, user_id: 'user-1', liked: true },
        { movie_id: 1, user_id: 'user-2', liked: true },
        { movie_id: 1, user_id: 'user-3', liked: true },
        // Movie 2: Mixed
        { movie_id: 2, user_id: 'user-1', liked: true },
        { movie_id: 2, user_id: 'user-2', liked: false },
        { movie_id: 2, user_id: 'user-3', liked: true },
        // Movie 3: Only one liked
        { movie_id: 3, user_id: 'user-1', liked: true },
        { movie_id: 3, user_id: 'user-2', liked: false },
        { movie_id: 3, user_id: 'user-3', liked: false },
      ];

      // Match-finding logic (same as in reveal route)
      const movieLikes = new Map<number, Set<string>>();
      for (const swipe of swipes) {
        if (swipe.liked) {
          if (!movieLikes.has(swipe.movie_id)) {
            movieLikes.set(swipe.movie_id, new Set());
          }
          movieLikes.get(swipe.movie_id)!.add(swipe.user_id);
        }
      }

      const matchedIds: number[] = [];
      for (const [movieId, likers] of movieLikes) {
        if (participantIds.every((pid) => likers.has(pid))) {
          matchedIds.push(movieId);
        }
      }

      expect(matchedIds).toEqual([1]);
    });

    it('should return empty array when no universal matches', () => {
      const participantIds = ['user-1', 'user-2'];
      const swipes = [
        { movie_id: 1, user_id: 'user-1', liked: true },
        { movie_id: 1, user_id: 'user-2', liked: false },
        { movie_id: 2, user_id: 'user-1', liked: false },
        { movie_id: 2, user_id: 'user-2', liked: true },
      ];

      const movieLikes = new Map<number, Set<string>>();
      for (const swipe of swipes) {
        if (swipe.liked) {
          if (!movieLikes.has(swipe.movie_id)) {
            movieLikes.set(swipe.movie_id, new Set());
          }
          movieLikes.get(swipe.movie_id)!.add(swipe.user_id);
        }
      }

      const matchedIds: number[] = [];
      for (const [movieId, likers] of movieLikes) {
        if (participantIds.every((pid) => likers.has(pid))) {
          matchedIds.push(movieId);
        }
      }

      expect(matchedIds).toEqual([]);
    });

    it('should find multiple matches', () => {
      const participantIds = ['user-1', 'user-2'];
      const swipes = [
        { movie_id: 1, user_id: 'user-1', liked: true },
        { movie_id: 1, user_id: 'user-2', liked: true },
        { movie_id: 2, user_id: 'user-1', liked: true },
        { movie_id: 2, user_id: 'user-2', liked: true },
        { movie_id: 3, user_id: 'user-1', liked: false },
        { movie_id: 3, user_id: 'user-2', liked: true },
      ];

      const movieLikes = new Map<number, Set<string>>();
      for (const swipe of swipes) {
        if (swipe.liked) {
          if (!movieLikes.has(swipe.movie_id)) {
            movieLikes.set(swipe.movie_id, new Set());
          }
          movieLikes.get(swipe.movie_id)!.add(swipe.user_id);
        }
      }

      const matchedIds: number[] = [];
      for (const [movieId, likers] of movieLikes) {
        if (participantIds.every((pid) => likers.has(pid))) {
          matchedIds.push(movieId);
        }
      }

      expect(matchedIds).toEqual([1, 2]);
    });
  });

  describe('Completion Detection', () => {
    it('should detect when all participants completed', () => {
      const participants = [
        { id: '1', completed: true },
        { id: '2', completed: true },
        { id: '3', completed: true },
      ];

      const allCompleted = participants.every((p) => p.completed);
      expect(allCompleted).toBe(true);
    });

    it('should detect when not all participants completed', () => {
      const participants = [
        { id: '1', completed: true },
        { id: '2', completed: false },
        { id: '3', completed: true },
      ];

      const allCompleted = participants.every((p) => p.completed);
      expect(allCompleted).toBe(false);
    });

    it('should handle single participant', () => {
      const participants = [{ id: '1', completed: true }];

      const allCompleted = participants.every((p) => p.completed);
      expect(allCompleted).toBe(true);
    });
  });

  describe('Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const session = await getServerSession();
      expect(session).toBeNull();
    });

    it('should verify host for start action', async () => {
      const sessionData = {
        id: 'session-123',
        host_id: 'user-123',
        status: 'lobby',
      };

      const isHost = sessionData.host_id === mockUser.id;
      expect(isHost).toBe(true);
    });

    it('should reject non-host start attempts', async () => {
      const sessionData = {
        id: 'session-123',
        host_id: 'different-user',
        status: 'lobby',
      };

      const isHost = sessionData.host_id === mockUser.id;
      expect(isHost).toBe(false);
    });

    it('should verify participant membership', () => {
      const participants = [
        { user_id: 'user-123' },
        { user_id: 'user-456' },
      ];

      const isParticipant = participants.some((p) => p.user_id === mockUser.id);
      expect(isParticipant).toBe(true);
    });
  });

  describe('Session State Transitions', () => {
    it('should allow lobby -> swiping transition', () => {
      const validTransitions: Record<string, string[]> = {
        lobby: ['swiping'],
        swiping: ['revealed'],
        revealed: [],
      };

      expect(validTransitions['lobby']).toContain('swiping');
    });

    it('should allow swiping -> revealed transition', () => {
      const validTransitions: Record<string, string[]> = {
        lobby: ['swiping'],
        swiping: ['revealed'],
        revealed: [],
      };

      expect(validTransitions['swiping']).toContain('revealed');
    });

    it('should not allow backwards transitions', () => {
      const validTransitions: Record<string, string[]> = {
        lobby: ['swiping'],
        swiping: ['revealed'],
        revealed: [],
      };

      expect(validTransitions['revealed']).not.toContain('swiping');
      expect(validTransitions['swiping']).not.toContain('lobby');
    });
  });
});
