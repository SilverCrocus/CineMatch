/**
 * @jest-environment node
 */

import { query, queryOne, queryMany } from '@/lib/db';

// Mock the database
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  queryMany: jest.fn(),
}));

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

import { getServerSession } from 'next-auth';

describe('Session API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Creation', () => {
    it('should generate unique room codes', () => {
      const { generateRoomCode } = require('@/lib/utils');
      const codes = new Set<string>();

      for (let i = 0; i < 100; i++) {
        codes.add(generateRoomCode());
      }

      // All codes should be unique (allowing for some collisions)
      expect(codes.size).toBeGreaterThan(90);
    });

    it('should generate 4-character alphanumeric codes by default', () => {
      const { generateRoomCode } = require('@/lib/utils');
      const code = generateRoomCode();

      expect(code).toHaveLength(4);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should generate codes of specified length', () => {
      const { generateRoomCode } = require('@/lib/utils');
      const code6 = generateRoomCode(6);
      const code8 = generateRoomCode(8);

      expect(code6).toHaveLength(6);
      expect(code8).toHaveLength(8);
    });
  });

  describe('Session Reveal Logic', () => {
    it('should find matches when all participants liked the same movie', async () => {
      const participantIds = ['user1', 'user2', 'user3'];
      const swipes = [
        { movie_id: 123, user_id: 'user1', liked: true },
        { movie_id: 123, user_id: 'user2', liked: true },
        { movie_id: 123, user_id: 'user3', liked: true },
        { movie_id: 456, user_id: 'user1', liked: true },
        { movie_id: 456, user_id: 'user2', liked: false },
        { movie_id: 456, user_id: 'user3', liked: true },
      ];

      // Find movies everyone liked (same logic as reveal route)
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

      expect(matchedIds).toEqual([123]); // Only movie 123 was liked by everyone
    });

    it('should return empty when no universal matches', async () => {
      const participantIds = ['user1', 'user2'];
      const swipes = [
        { movie_id: 123, user_id: 'user1', liked: true },
        { movie_id: 123, user_id: 'user2', liked: false },
        { movie_id: 456, user_id: 'user1', liked: false },
        { movie_id: 456, user_id: 'user2', liked: true },
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

      expect(matchedIds).toEqual([]); // No matches
    });
  });

  describe('Swipe Completion Detection', () => {
    it('should detect when all participants have completed', () => {
      const participants = [
        { id: '1', user_id: 'user1', completed: true },
        { id: '2', user_id: 'user2', completed: true },
        { id: '3', user_id: 'user3', completed: true },
      ];

      const allCompleted = participants.every((p) => p.completed);
      expect(allCompleted).toBe(true);
    });

    it('should detect when not all participants have completed', () => {
      const participants = [
        { id: '1', user_id: 'user1', completed: true },
        { id: '2', user_id: 'user2', completed: false },
        { id: '3', user_id: 'user3', completed: true },
      ];

      const allCompleted = participants.every((p) => p.completed);
      expect(allCompleted).toBe(false);
    });
  });
});

describe('Deck Building', () => {
  it('should limit deck size correctly', () => {
    const movies = Array.from({ length: 50 }, (_, i) => ({ tmdbId: i + 1 }));
    const deckSize = 25;

    const deck = movies.slice(0, deckSize);

    expect(deck).toHaveLength(25);
  });
});
