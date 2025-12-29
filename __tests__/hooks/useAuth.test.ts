import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types';

// Mock the auth module
jest.mock('../../lib/auth', () => ({
  getStoredToken: jest.fn(),
  getStoredUser: jest.fn(),
  storeToken: jest.fn(),
  storeUser: jest.fn(),
  clearAuth: jest.fn(),
}));

import {
  getStoredToken,
  getStoredUser,
  storeToken,
  storeUser,
  clearAuth,
} from '../../lib/auth';

const mockGetStoredToken = getStoredToken as jest.MockedFunction<typeof getStoredToken>;
const mockGetStoredUser = getStoredUser as jest.MockedFunction<typeof getStoredUser>;
const mockStoreToken = storeToken as jest.MockedFunction<typeof storeToken>;
const mockStoreUser = storeUser as jest.MockedFunction<typeof storeUser>;
const mockClearAuth = clearAuth as jest.MockedFunction<typeof clearAuth>;

describe('useAuth Hook', () => {
  const mockUser: User = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreToken.mockResolvedValue(undefined);
    mockStoreUser.mockResolvedValue(undefined);
    mockClearAuth.mockResolvedValue(undefined);
  });

  describe('initial state', () => {
    it('should start with isLoading true', () => {
      mockGetStoredToken.mockResolvedValue(null);
      mockGetStoredUser.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it('should load stored auth on mount', async () => {
      mockGetStoredToken.mockResolvedValue('stored-token');
      mockGetStoredUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe('stored-token');
      expect(result.current.user).toEqual(mockUser);
    });

    it('should set isAuthenticated false when no stored auth', async () => {
      mockGetStoredToken.mockResolvedValue(null);
      mockGetStoredUser.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('should handle storage errors gracefully', async () => {
      mockGetStoredToken.mockRejectedValue(new Error('Storage error'));
      mockGetStoredUser.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('signIn', () => {
    it('should store token and user, then update state', async () => {
      mockGetStoredToken.mockResolvedValue(null);
      mockGetStoredUser.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('new-token', mockUser);
      });

      expect(mockStoreToken).toHaveBeenCalledWith('new-token');
      expect(mockStoreUser).toHaveBeenCalledWith(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe('new-token');
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('signOut', () => {
    it('should clear auth and update state', async () => {
      mockGetStoredToken.mockResolvedValue('stored-token');
      mockGetStoredUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockClearAuth).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });
});
