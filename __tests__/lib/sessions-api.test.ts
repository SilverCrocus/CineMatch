import * as SecureStore from 'expo-secure-store';
import { api } from '../../lib/api';

const API_BASE_URL = 'http://localhost:3000';
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('Session API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-token');
  });

  describe('api.createSession', () => {
    it('should POST to /api/sessions with source', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'session-123', code: 'ABC123' }),
      } as Response);

      const result = await api.createSession({ type: 'filters', filters: { genres: [28] } });

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/sessions`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ source: { type: 'filters', filters: { genres: [28] } } }),
        })
      );
      expect(result).toEqual({ id: 'session-123', code: 'ABC123' });
    });
  });

  describe('api.joinSession', () => {
    it('should POST to /api/sessions/join with code', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionId: 'session-123' }),
      } as Response);

      const result = await api.joinSession('ABC123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/sessions/join`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ code: 'ABC123' }),
        })
      );
      expect(result).toEqual({ sessionId: 'session-123' });
    });
  });

  describe('api.getSession', () => {
    it('should GET /api/sessions/:id', async () => {
      const mockSession = {
        id: 'session-123',
        code: 'ABC123',
        status: 'lobby',
        participants: [],
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSession),
      } as Response);

      const result = await api.getSession('session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/sessions/session-123`,
        expect.any(Object)
      );
      expect(result).toEqual(mockSession);
    });
  });

  describe('api.startSession', () => {
    it('should POST to /api/sessions/:id/start', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await api.startSession('session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/sessions/session-123/start`,
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('api.swipeInSession', () => {
    it('should POST to /api/sessions/:id/swipe', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await api.swipeInSession('session-123', 456, true);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/sessions/session-123/swipe`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ movieId: 456, liked: true }),
        })
      );
    });
  });

  describe('api.revealMatches', () => {
    it('should POST then GET /api/sessions/:id/reveal', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ matches: [{ id: 1, title: 'Movie' }] }),
        } as Response);

      const result = await api.revealMatches('session-123');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ matches: [{ id: 1, title: 'Movie' }] });
    });
  });

  describe('api.getPrematches', () => {
    it('should GET /api/sessions/:id/prematches', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ movies: [{ id: 1, title: 'Common Movie' }] }),
      } as Response);

      const result = await api.getPrematches('session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/sessions/session-123/prematches`,
        expect.any(Object)
      );
      expect(result).toEqual({ movies: [{ id: 1, title: 'Common Movie' }] });
    });
  });

  describe('api.selectMovie', () => {
    it('should POST to /api/sessions/:id/select', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await api.selectMovie('session-123', 456);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/sessions/session-123/select`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ movieId: 456 }),
        })
      );
    });
  });
});
