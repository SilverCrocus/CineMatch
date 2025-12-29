import * as SecureStore from 'expo-secure-store';
import { api } from '../../lib/api';

const API_BASE_URL = 'http://localhost:3000';
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('Friends API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-token');
  });

  describe('api.getFriends', () => {
    it('should GET /api/friends and return friends and pending requests', async () => {
      const mockResponse = {
        friends: [
          { id: 'u1', name: 'Friend 1', email: 'friend1@test.com' },
          { id: 'u2', name: 'Friend 2', email: 'friend2@test.com' },
        ],
        pendingRequests: [
          {
            id: 'req1',
            createdAt: '2024-01-01T00:00:00Z',
            user: { id: 'u3', name: 'Requester', email: 'req@test.com' },
          },
        ],
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await api.getFriends();

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/friends`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(result.friends).toHaveLength(2);
      expect(result.pendingRequests).toHaveLength(1);
    });
  });

  describe('api.searchUsers', () => {
    it('should GET /api/friends/search with query parameter', async () => {
      const mockUsers = {
        users: [
          { id: 'u1', name: 'John Doe', email: 'john@test.com' },
        ],
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUsers),
      } as Response);

      const result = await api.searchUsers('john');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/friends/search?q=john`,
        expect.any(Object)
      );
      expect(result.users).toHaveLength(1);
      expect(result.users[0].name).toBe('John Doe');
    });

    it('should URL encode the search query', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ users: [] }),
      } as Response);

      await api.searchUsers('john doe@test');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/friends/search?q=john%20doe%40test`,
        expect.any(Object)
      );
    });
  });

  describe('api.sendFriendRequest', () => {
    it('should POST to /api/friends with friendId', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const result = await api.sendFriendRequest('user-123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/friends`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ friendId: 'user-123' }),
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('api.acceptFriendRequest', () => {
    it('should PATCH /api/friends/:id to accept request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const result = await api.acceptFriendRequest('request-456');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/friends/request-456`,
        expect.objectContaining({
          method: 'PATCH',
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('api.rejectFriendRequest', () => {
    it('should DELETE /api/friends/:id to reject request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const result = await api.rejectFriendRequest('request-789');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/friends/request-789`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result.success).toBe(true);
    });
  });
});
