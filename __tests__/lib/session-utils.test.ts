import {
  findUserParticipant,
  isUserCompleted,
  areAllCompleted,
  shouldAutoReveal,
  getMoviesRemaining,
  getSwipeProgress,
  isSessionHost,
  getSessionPhase,
} from '../../lib/session-utils';
import { Session, SessionParticipant } from '../../lib/api';
import { User } from '../../types';

// Helper to create mock data
const createMockParticipant = (overrides: Partial<SessionParticipant> = {}): SessionParticipant => ({
  id: 'p1',
  odUserId: 'od1',
  nickname: 'Test User',
  completed: false,
  user: { id: 'u1', name: 'Test User', image: '' },
  ...overrides,
});

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  id: 's1',
  code: 'ABC123',
  status: 'lobby',
  hostId: 'h1',
  participants: [createMockParticipant()],
  movies: [{ id: 1, tmdbId: 1, title: 'Movie 1' } as any],
  userSwipes: {},
  isHost: false,
  ...overrides,
});

const mockUser: User = { id: 'u1', name: 'Test User', email: 'test@example.com' };

describe('Session Utils', () => {
  describe('findUserParticipant', () => {
    it('should find participant matching user id', () => {
      const session = createMockSession({
        participants: [
          createMockParticipant({ user: { id: 'u1', name: 'User 1', image: '' } }),
          createMockParticipant({ id: 'p2', user: { id: 'u2', name: 'User 2', image: '' } }),
        ],
      });

      const participant = findUserParticipant(session, mockUser);

      expect(participant).not.toBeNull();
      expect(participant?.user.id).toBe('u1');
    });

    it('should return null when user not in session', () => {
      const session = createMockSession({
        participants: [
          createMockParticipant({ user: { id: 'other', name: 'Other', image: '' } }),
        ],
      });

      const participant = findUserParticipant(session, mockUser);

      expect(participant).toBeNull();
    });

    it('should return null when session is null', () => {
      expect(findUserParticipant(null, mockUser)).toBeNull();
    });

    it('should return null when user is null', () => {
      expect(findUserParticipant(createMockSession(), null)).toBeNull();
    });
  });

  describe('isUserCompleted', () => {
    it('should return true when user has completed', () => {
      const session = createMockSession({
        participants: [createMockParticipant({ completed: true })],
      });

      expect(isUserCompleted(session, mockUser)).toBe(true);
    });

    it('should return false when user has not completed', () => {
      const session = createMockSession({
        participants: [createMockParticipant({ completed: false })],
      });

      expect(isUserCompleted(session, mockUser)).toBe(false);
    });

    it('should return false when user not in session', () => {
      const session = createMockSession({
        participants: [
          createMockParticipant({ user: { id: 'other', name: 'Other', image: '' } }),
        ],
      });

      expect(isUserCompleted(session, mockUser)).toBe(false);
    });
  });

  describe('areAllCompleted', () => {
    it('should return true when all participants completed', () => {
      const session = createMockSession({
        participants: [
          createMockParticipant({ id: 'p1', completed: true }),
          createMockParticipant({ id: 'p2', completed: true }),
        ],
      });

      expect(areAllCompleted(session)).toBe(true);
    });

    it('should return false when some participants not completed', () => {
      const session = createMockSession({
        participants: [
          createMockParticipant({ id: 'p1', completed: true }),
          createMockParticipant({ id: 'p2', completed: false }),
        ],
      });

      expect(areAllCompleted(session)).toBe(false);
    });

    it('should return false when no participants', () => {
      const session = createMockSession({ participants: [] });

      expect(areAllCompleted(session)).toBe(false);
    });

    it('should return false when session is null', () => {
      expect(areAllCompleted(null)).toBe(false);
    });
  });

  describe('shouldAutoReveal', () => {
    it('should return true when swiping and all completed', () => {
      const session = createMockSession({
        status: 'swiping',
        participants: [
          createMockParticipant({ completed: true }),
          createMockParticipant({ id: 'p2', user: { id: 'u2', name: 'User 2', image: '' }, completed: true }),
        ],
      });

      expect(shouldAutoReveal(session, mockUser)).toBe(true);
    });

    it('should return false when not all completed', () => {
      const session = createMockSession({
        status: 'swiping',
        participants: [
          createMockParticipant({ completed: true }),
          createMockParticipant({ id: 'p2', completed: false }),
        ],
      });

      expect(shouldAutoReveal(session, mockUser)).toBe(false);
    });

    it('should return false when not in swiping status', () => {
      const session = createMockSession({
        status: 'lobby',
        participants: [createMockParticipant({ completed: true })],
      });

      expect(shouldAutoReveal(session, mockUser)).toBe(false);
    });

    it('should return false when session is null', () => {
      expect(shouldAutoReveal(null, mockUser)).toBe(false);
    });
  });

  describe('getMoviesRemaining', () => {
    it('should return correct remaining count', () => {
      const session = createMockSession({
        movies: [{} as any, {} as any, {} as any, {} as any, {} as any], // 5 movies
      });

      expect(getMoviesRemaining(session, 2)).toBe(3);
    });

    it('should return 0 when all swiped', () => {
      const session = createMockSession({
        movies: [{} as any, {} as any],
      });

      expect(getMoviesRemaining(session, 2)).toBe(0);
    });

    it('should not return negative', () => {
      const session = createMockSession({
        movies: [{} as any, {} as any],
      });

      expect(getMoviesRemaining(session, 5)).toBe(0);
    });

    it('should return 0 when session is null', () => {
      expect(getMoviesRemaining(null, 0)).toBe(0);
    });
  });

  describe('getSwipeProgress', () => {
    it('should return correct percentage', () => {
      const session = createMockSession({
        movies: [{} as any, {} as any, {} as any, {} as any], // 4 movies
      });

      expect(getSwipeProgress(session, 2)).toBe(50);
    });

    it('should return 100 when all swiped', () => {
      const session = createMockSession({
        movies: [{} as any, {} as any],
      });

      expect(getSwipeProgress(session, 2)).toBe(100);
    });

    it('should cap at 100', () => {
      const session = createMockSession({
        movies: [{} as any, {} as any],
      });

      expect(getSwipeProgress(session, 5)).toBe(100);
    });

    it('should return 0 when no movies', () => {
      const session = createMockSession({ movies: [] });

      expect(getSwipeProgress(session, 0)).toBe(0);
    });
  });

  describe('isSessionHost', () => {
    it('should return true when user is host', () => {
      const session = createMockSession({ isHost: true });

      expect(isSessionHost(session)).toBe(true);
    });

    it('should return false when user is not host', () => {
      const session = createMockSession({ isHost: false });

      expect(isSessionHost(session)).toBe(false);
    });

    it('should return false when session is null', () => {
      expect(isSessionHost(null)).toBe(false);
    });
  });

  describe('getSessionPhase', () => {
    it('should return loading when loading', () => {
      expect(getSessionPhase(null, mockUser, false, true, true)).toBe('loading');
    });

    it('should return error when session is null and not loading', () => {
      expect(getSessionPhase(null, mockUser, false, true, false)).toBe('error');
    });

    it('should return lobby when status is lobby', () => {
      const session = createMockSession({ status: 'lobby' });

      expect(getSessionPhase(session, mockUser, false, true, false)).toBe('lobby');
    });

    it('should return prematches when has prematches and showing', () => {
      const session = createMockSession({
        status: 'swiping',
        participants: [createMockParticipant({ completed: false })],
      });

      expect(getSessionPhase(session, mockUser, true, true, false)).toBe('prematches');
    });

    it('should return swiping when actively swiping', () => {
      const session = createMockSession({
        status: 'swiping',
        participants: [createMockParticipant({ completed: false })],
      });

      expect(getSessionPhase(session, mockUser, false, false, false)).toBe('swiping');
    });

    it('should return waiting when user completed but not all', () => {
      const session = createMockSession({
        status: 'swiping',
        participants: [
          createMockParticipant({ completed: true }),
          createMockParticipant({ id: 'p2', user: { id: 'u2', name: 'User 2', image: '' }, completed: false }),
        ],
      });

      expect(getSessionPhase(session, mockUser, false, false, false)).toBe('waiting');
    });

    it('should return revealed when status is revealed', () => {
      const session = createMockSession({ status: 'revealed' });

      expect(getSessionPhase(session, mockUser, false, false, false)).toBe('revealed');
    });
  });
});
