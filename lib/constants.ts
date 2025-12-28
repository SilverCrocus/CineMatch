import { Platform } from 'react-native';

// API base URL - Android emulator uses 10.0.2.2 to reach host machine
const getDevApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  // iOS simulator and physical devices
  return 'http://localhost:3000';
};

export const API_BASE_URL = __DEV__
  ? getDevApiUrl()
  : 'https://your-cinematch-domain.com';

export const SECURE_STORE_KEYS = {
  SESSION_TOKEN: 'session_token',
  USER_DATA: 'user_data',
} as const;
