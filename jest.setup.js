// Built-in matchers are auto-extended in newer versions of @testing-library/react-native

// Define __DEV__ global for tests
global.__DEV__ = true;

// Mock constants module
jest.mock('./lib/constants', () => ({
  API_BASE_URL: 'http://localhost:3000',
  SECURE_STORE_KEYS: {
    SESSION_TOKEN: 'session_token',
    USER_DATA: 'user_data',
  },
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: 'Link',
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// jest-expo handles animation mocks

// Mock fetch globally
global.fetch = jest.fn();
