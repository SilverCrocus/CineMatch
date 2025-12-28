import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { SECURE_STORE_KEYS } from './constants';
import { User } from '../types';

WebBrowser.maybeCompleteAuthSession();

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_STORE_KEYS.SESSION_TOKEN);
}

export async function storeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SECURE_STORE_KEYS.SESSION_TOKEN, token);
}

export async function getStoredUser(): Promise<User | null> {
  const userData = await SecureStore.getItemAsync(SECURE_STORE_KEYS.USER_DATA);
  return userData ? JSON.parse(userData) : null;
}

export async function storeUser(user: User): Promise<void> {
  await SecureStore.setItemAsync(SECURE_STORE_KEYS.USER_DATA, JSON.stringify(user));
}

export async function clearAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.SESSION_TOKEN);
  await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.USER_DATA);
}
