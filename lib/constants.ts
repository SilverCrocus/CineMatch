// API base URL - update this to your deployed backend
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://your-cinematch-domain.com';

export const SECURE_STORE_KEYS = {
  SESSION_TOKEN: 'session_token',
  USER_DATA: 'user_data',
} as const;
