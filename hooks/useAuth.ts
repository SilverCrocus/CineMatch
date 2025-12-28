import { useEffect, useState, useCallback } from 'react';
import { User } from '../types';
import {
  getStoredToken,
  getStoredUser,
  storeToken,
  storeUser,
  clearAuth,
} from '../lib/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const [token, user] = await Promise.all([getStoredToken(), getStoredUser()]);
      setState({
        token,
        user,
        isLoading: false,
        isAuthenticated: !!token && !!user,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  const signIn = useCallback(async (token: string, user: User) => {
    await storeToken(token);
    await storeUser(user);
    setState({
      token,
      user,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const signOut = useCallback(async () => {
    await clearAuth();
    setState({
      token: null,
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  return {
    ...state,
    signIn,
    signOut,
  };
}
