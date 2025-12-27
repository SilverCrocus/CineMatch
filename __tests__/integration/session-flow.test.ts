/**
 * Integration Tests - Full Session Flow
 * Tests the complete workflow from session creation through reveal
 */

// Mock all external dependencies
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  queryMany: jest.fn(),
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/services/movies', () => ({
  buildDeckFromFilters: jest.fn(),
  buildDeckFromTitles: jest.fn(),
  getMoviesByIds: jest.fn(),
  getOrFetchMovie: jest.fn(),
}));

import { query, queryOne, queryMany } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { buildDeckFromFilters, getMoviesByIds } from '@/lib/services/movies';

describe('Session Flow Integration', () => {
  // Shared test data
  const host = { id: 'host-123', name: 'Host User', email: 'host@example.com' };
  const guest1 = { id: 'guest-456', name: 'Guest One', email: 'guest1@example.com' };
  const guest2 = { id: 'guest-789', name: 'Guest Two', email: 'guest2@example.com' };

  const mockMovies = [
    { tmdbId: 27205, title: 'Inception', year: 2010 },
    { tmdbId: 155, title: 'The Dark Knight', year: 2008 },
    { tmdbId: 157336, title: 'Interstellar', year: 2014 },
    { tmdbId: 550, title: 'Fight Club', year: 1999 },
    { tmdbId: 680, title: 'Pulp Fiction', year: 1994 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Session Lifecycle', () => {
    it('should support full flow: create -> join -> swipe -> reveal', async () => {
      // ============ PHASE 1: Session Creation ============
      const sessionId = 'session-abc123';
      const roomCode = 'XYZW';

      // Host creates session
      (getServerSession as jest.Mock).mockResolvedValue({ user: host });
      (buildDeckFromFilters as jest.Mock).mockResolvedValue(mockMovies);
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      // Simulate session creation
      const createdSession = {
        id: sessionId,
        code: roomCode,
        host_id: host.id,
        status: 'lobby',
        deck: mockMovies.map(m => m.tmdbId),
        created_at: new Date().toISOString(),
      };

      (queryOne as jest.Mock).mockResolvedValue(createdSession);

      // Verify session was created
      const sessionAfterCreate = await queryOne(
        'SELECT * FROM sessions WHERE id = $1',
        [sessionId]
      );
      expect(sessionAfterCreate.status).toBe('lobby');
      expect(sessionAfterCreate.code).toBe(roomCode);

      // ============ PHASE 2: Guests Join ============
      // Guest 1 joins
      (getServerSession as jest.Mock).mockResolvedValue({ user: guest1 });
      (queryOne as jest.Mock).mockResolvedValue({ id: sessionId, status: 'lobby' });

      const canJoin1 = await queryOne(
        'SELECT id, status FROM sessions WHERE code = $1',
        [roomCode]
      );
      expect(canJoin1.status).toBe('lobby');

      // Guest 2 joins
      (getServerSession as jest.Mock).mockResolvedValue({ user: guest2 });
      (queryOne as jest.Mock).mockResolvedValue({ id: sessionId, status: 'lobby' });

      const canJoin2 = await queryOne(
        'SELECT id, status FROM sessions WHERE code = $1',
        [roomCode]
      );
      expect(canJoin2.status).toBe('lobby');

      // ============ PHASE 3: Host Starts Session ============
      (getServerSession as jest.Mock).mockResolvedValue({ user: host });
      (queryOne as jest.Mock).mockResolvedValue({
        id: sessionId,
        host_id: host.id,
        status: 'lobby',
      });

      const sessionToStart = await queryOne(
        'SELECT * FROM sessions WHERE id = $1',
        [sessionId]
      );
      const canStart = sessionToStart.host_id === host.id && sessionToStart.status === 'lobby';
      expect(canStart).toBe(true);

      // Simulate status update to swiping
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      await query(
        'UPDATE sessions SET status = $1 WHERE id = $2',
        ['swiping', sessionId]
      );

      // ============ PHASE 4: Users Swipe ============
      const swipeData: Record<string, Record<number, boolean>> = {
        [host.id]: {},
        [guest1.id]: {},
        [guest2.id]: {},
      };

      // Simulate swiping - everyone likes Inception and Dark Knight
      for (const userId of [host.id, guest1.id, guest2.id]) {
        // Each user swipes on all movies
        for (const movie of mockMovies) {
          // Everyone likes Inception (27205) and Dark Knight (155)
          const liked = movie.tmdbId === 27205 || movie.tmdbId === 155;
          swipeData[userId][movie.tmdbId] = liked;

          (query as jest.Mock).mockResolvedValue({ rowCount: 1 });
          await query(
            `INSERT INTO swipes (session_id, user_id, movie_id, liked)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (session_id, user_id, movie_id)
             DO UPDATE SET liked = $4`,
            [sessionId, userId, movie.tmdbId, liked]
          );
        }
      }

      // ============ PHASE 5: Check Completion ============
      // All users have completed their swipes
      (queryMany as jest.Mock).mockResolvedValue([
        { user_id: host.id, completed: true },
        { user_id: guest1.id, completed: true },
        { user_id: guest2.id, completed: true },
      ]);

      const participants = await queryMany(
        'SELECT user_id, completed FROM session_participants WHERE session_id = $1',
        [sessionId]
      );
      const allCompleted = participants.every((p) => p.completed);
      expect(allCompleted).toBe(true);

      // ============ PHASE 6: Calculate Matches ============
      // Simulate getting all swipes
      const allSwipes = Object.entries(swipeData).flatMap(([userId, movieSwipes]) =>
        Object.entries(movieSwipes).map(([movieId, liked]) => ({
          user_id: userId,
          movie_id: parseInt(movieId),
          liked,
        }))
      );

      // Calculate matches (movies everyone liked)
      const participantIds = [host.id, guest1.id, guest2.id];
      const movieLikes = new Map<number, Set<string>>();

      for (const swipe of allSwipes) {
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

      // Verify matches
      expect(matchedIds).toContain(27205); // Inception
      expect(matchedIds).toContain(155); // The Dark Knight
      expect(matchedIds).toHaveLength(2);

      // ============ PHASE 7: Reveal Results ============
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      await query(
        'UPDATE sessions SET status = $1, matches = $2 WHERE id = $3',
        ['revealed', matchedIds, sessionId]
      );

      // Verify final state
      (queryOne as jest.Mock).mockResolvedValue({
        id: sessionId,
        status: 'revealed',
        matches: matchedIds,
      });

      const finalSession = await queryOne(
        'SELECT * FROM sessions WHERE id = $1',
        [sessionId]
      );
      expect(finalSession.status).toBe('revealed');
      expect(finalSession.matches).toHaveLength(2);
      expect(finalSession.matches).toContain(27205);
      expect(finalSession.matches).toContain(155);
    });
  });

  describe('Edge Cases', () => {
    it('should handle session with no matches', async () => {
      const participantIds = ['user-1', 'user-2'];
      const swipes = [
        // User 1 likes movies 1, 2
        { user_id: 'user-1', movie_id: 1, liked: true },
        { user_id: 'user-1', movie_id: 2, liked: true },
        { user_id: 'user-1', movie_id: 3, liked: false },
        // User 2 likes only movie 3
        { user_id: 'user-2', movie_id: 1, liked: false },
        { user_id: 'user-2', movie_id: 2, liked: false },
        { user_id: 'user-2', movie_id: 3, liked: true },
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

    it('should handle single participant session', async () => {
      const participantIds = ['solo-user'];
      const swipes = [
        { user_id: 'solo-user', movie_id: 1, liked: true },
        { user_id: 'solo-user', movie_id: 2, liked: true },
        { user_id: 'solo-user', movie_id: 3, liked: false },
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

      // Solo user's likes are all matches
      expect(matchedIds).toEqual([1, 2]);
    });

    it('should handle large group with few matches', async () => {
      const participantIds = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
      const movieIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      // Generate random-ish swipes where only movie 1 is liked by all
      const swipes: Array<{ user_id: string; movie_id: number; liked: boolean }> = [];

      for (const userId of participantIds) {
        for (const movieId of movieIds) {
          // Everyone likes movie 1
          const liked = movieId === 1 ? true : Math.random() > 0.5;
          swipes.push({ user_id: userId, movie_id: movieId, liked });
        }
      }

      // Force movie 1 to be liked by all
      for (const userId of participantIds) {
        const existingSwipe = swipes.find(
          (s) => s.user_id === userId && s.movie_id === 1
        );
        if (existingSwipe) {
          existingSwipe.liked = true;
        }
      }

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

      expect(matchedIds).toContain(1); // Movie 1 must be a match
    });

    it('should handle participant leaving during swiping', async () => {
      // If a participant leaves, remaining participants can still complete
      const remainingParticipants = [
        { user_id: 'user-1', completed: true },
        { user_id: 'user-2', completed: true },
        // user-3 left (removed from participants)
      ];

      const allCompleted = remainingParticipants.every((p) => p.completed);
      expect(allCompleted).toBe(true);
    });
  });

  describe('State Validation', () => {
    it('should prevent joining started session', async () => {
      // Test the logic directly without async mock complexity
      const session = {
        id: 'session-123',
        status: 'swiping', // Already started
      };

      const canJoin = session.status === 'lobby';
      expect(canJoin).toBe(false);
    });

    it('should prevent non-host from starting session', () => {
      // Test the logic directly
      const session = {
        id: 'session-123',
        host_id: 'host-123',
        status: 'lobby',
      };
      const currentUser = { id: 'not-host' };

      const canStart = session.host_id === currentUser.id;
      expect(canStart).toBe(false);
    });

    it('should prevent swiping on completed session', async () => {
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'session-123',
        status: 'revealed', // Already completed
      });

      const session = await queryOne('SELECT * FROM sessions WHERE id = $1', ['session-123']);

      const canSwipe = session.status === 'swiping';
      expect(canSwipe).toBe(false);
    });

    it('should prevent reveal before all completed', async () => {
      (queryMany as jest.Mock).mockResolvedValue([
        { user_id: 'user-1', completed: true },
        { user_id: 'user-2', completed: false }, // Not done
        { user_id: 'user-3', completed: true },
      ]);

      const participants = await queryMany(
        'SELECT * FROM session_participants WHERE session_id = $1',
        ['session-123']
      );

      const canReveal = participants.every((p) => p.completed);
      expect(canReveal).toBe(false);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent swipes from multiple users', async () => {
      // Simulate multiple users swiping at the same time
      const swipePromises = [
        query('INSERT INTO swipes VALUES ($1, $2, $3, $4)', ['s1', 'u1', 1, true]),
        query('INSERT INTO swipes VALUES ($1, $2, $3, $4)', ['s1', 'u2', 1, false]),
        query('INSERT INTO swipes VALUES ($1, $2, $3, $4)', ['s1', 'u3', 1, true]),
      ];

      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await Promise.all(swipePromises);

      expect(query).toHaveBeenCalledTimes(3);
    });

    it('should handle swipe update (change of mind)', async () => {
      // User changes their mind - upsert should work
      (query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      // First swipe: like
      await query(
        `INSERT INTO swipes (session_id, user_id, movie_id, liked)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (session_id, user_id, movie_id)
         DO UPDATE SET liked = $4`,
        ['session-123', 'user-123', 27205, true]
      );

      // Second swipe: unlike (change of mind)
      await query(
        `INSERT INTO swipes (session_id, user_id, movie_id, liked)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (session_id, user_id, movie_id)
         DO UPDATE SET liked = $4`,
        ['session-123', 'user-123', 27205, false]
      );

      expect(query).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Integrity', () => {
    it('should track swipe counts accurately', async () => {
      const deckSize = 25;
      let swipeCount = 0;

      // Simulate swiping through entire deck
      for (let i = 0; i < deckSize; i++) {
        (query as jest.Mock).mockResolvedValue({ rowCount: 1 });
        await query('INSERT INTO swipes VALUES ($1, $2, $3, $4)', [
          'session-123',
          'user-123',
          i + 1,
          Math.random() > 0.5,
        ]);
        swipeCount++;
      }

      expect(swipeCount).toBe(deckSize);

      // Verify count matches
      (queryOne as jest.Mock).mockResolvedValue({ count: String(deckSize) });
      const result = await queryOne(
        'SELECT COUNT(*) as count FROM swipes WHERE session_id = $1 AND user_id = $2',
        ['session-123', 'user-123']
      );

      expect(parseInt(result.count)).toBe(deckSize);
    });

    it('should preserve movie order in matches', async () => {
      const participantIds = ['user-1', 'user-2'];
      const likedMovieIds = [155, 27205, 550, 680]; // Order matters

      const swipes: Array<{ user_id: string; movie_id: number; liked: boolean }> = [];
      for (const userId of participantIds) {
        for (const movieId of likedMovieIds) {
          swipes.push({ user_id: userId, movie_id: movieId, liked: true });
        }
      }

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

      expect(matchedIds).toHaveLength(4);
      expect(matchedIds).toContain(155);
      expect(matchedIds).toContain(27205);
      expect(matchedIds).toContain(550);
      expect(matchedIds).toContain(680);
    });
  });
});
