import * as SecureStore from 'expo-secure-store';
import {
  getStoredToken,
  storeToken,
  getStoredUser,
  storeUser,
  clearAuth,
} from '../../lib/auth';
import { User } from '../../types';

describe('Auth Storage Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStoredToken', () => {
    it('should return token when stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-token');

      const token = await getStoredToken();

      expect(token).toBe('test-token');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('session_token');
    });

    it('should return null when no token stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const token = await getStoredToken();

      expect(token).toBeNull();
    });
  });

  describe('storeToken', () => {
    it('should store token in secure store', async () => {
      await storeToken('new-token');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'session_token',
        'new-token'
      );
    });
  });

  describe('getStoredUser', () => {
    it('should return parsed user when stored', async () => {
      const mockUser: User = { id: '1', name: 'Test User', email: 'test@example.com' };
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockUser));

      const user = await getStoredUser();

      expect(user).toEqual(mockUser);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('user_data');
    });

    it('should return null when no user stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const user = await getStoredUser();

      expect(user).toBeNull();
    });
  });

  describe('storeUser', () => {
    it('should store stringified user in secure store', async () => {
      const mockUser: User = { id: '1', name: 'Test User', email: 'test@example.com' };

      await storeUser(mockUser);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'user_data',
        JSON.stringify(mockUser)
      );
    });
  });

  describe('clearAuth', () => {
    it('should delete both token and user data', async () => {
      await clearAuth();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('session_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_data');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
    });
  });
});
