import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomeScreen from '../../app/(tabs)/index';

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: {
      Pan: () => ({
        onUpdate: () => ({
          onEnd: () => ({}),
        }),
      }),
    },
    GestureHandlerRootView: View,
  };
});

// Mock safe area insets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Mock auth context
const mockSignOut = jest.fn();
const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  image: null,
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: mockUser,
    signOut: mockSignOut,
    isAuthenticated: true,
  }),
}));

// Mock router
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: mockBack,
  }),
  useLocalSearchParams: () => ({}),
}));

// Mock API
jest.mock('../../lib/api', () => ({
  api: {
    joinSession: jest.fn(),
  },
}));

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

// Wrapper component with providers
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
};

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const result = renderWithProviders(<HomeScreen />);
    expect(result).toBeTruthy();
  });

  it('should display the Cinematch logo', () => {
    const { getByText } = renderWithProviders(<HomeScreen />);
    expect(getByText('Cinematch')).toBeTruthy();
  });

  it('should display Solo Mode card', () => {
    const { getByText } = renderWithProviders(<HomeScreen />);
    expect(getByText('Solo Mode')).toBeTruthy();
    expect(getByText('Discover movies tailored just for you')).toBeTruthy();
  });

  it('should display Session card', () => {
    const { getByText } = renderWithProviders(<HomeScreen />);
    expect(getByText('Session')).toBeTruthy();
    expect(getByText('Find movies everyone will love')).toBeTruthy();
  });

  it('should display Join a Session button', () => {
    const { getByText } = renderWithProviders(<HomeScreen />);
    expect(getByText('Join a Session')).toBeTruthy();
  });

  it('should navigate to solo mode when Solo Mode card is pressed', () => {
    const { getByText } = renderWithProviders(<HomeScreen />);

    const soloCard = getByText('Solo Mode');
    fireEvent.press(soloCard);

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/solo');
  });

  it('should navigate to session create when Session card is pressed', () => {
    const { getByText } = renderWithProviders(<HomeScreen />);

    const sessionCard = getByText('Session');
    fireEvent.press(sessionCard);

    expect(mockPush).toHaveBeenCalledWith('/session/create');
  });

  it('should show join input when Join a Session is pressed', () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(
      <HomeScreen />
    );

    const joinButton = getByText('Join a Session');
    fireEvent.press(joinButton);

    // Should show the code input
    expect(getByPlaceholderText('Enter code')).toBeTruthy();
  });

  it('should display user initial in profile button when no image', () => {
    const { getAllByText } = renderWithProviders(<HomeScreen />);

    // User name is "Test User", so initial should be "T"
    // There are multiple "T" elements (profile button + bottom sheet)
    const initials = getAllByText('T');
    expect(initials.length).toBeGreaterThanOrEqual(1);
  });

  it('should render profile bottom sheet content', () => {
    const { getByText } = renderWithProviders(<HomeScreen />);

    // Bottom sheet content should be in the tree (though may be off-screen)
    expect(getByText('Friends')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Sign Out')).toBeTruthy();
  });

  it('should display user name in profile sheet', () => {
    const { getAllByText } = renderWithProviders(<HomeScreen />);

    // "Test User" appears in the bottom sheet
    const userNames = getAllByText('Test User');
    expect(userNames.length).toBeGreaterThan(0);
  });

  it('should display user email in profile sheet', () => {
    const { getByText } = renderWithProviders(<HomeScreen />);
    expect(getByText('test@example.com')).toBeTruthy();
  });

  it('should show join input when Join a Session is pressed', async () => {
    const { getByText, getByPlaceholderText, queryByText } =
      renderWithProviders(<HomeScreen />);

    // Initially "Join a Session" button is visible
    expect(getByText('Join a Session')).toBeTruthy();

    // Open join input
    await act(async () => {
      fireEvent.press(getByText('Join a Session'));
    });

    // Code input should now be visible
    expect(getByPlaceholderText('Enter code')).toBeTruthy();

    // "Join a Session" text should no longer be visible (replaced by input)
    expect(queryByText('Join a Session')).toBeNull();
  });

  it('should convert join code to uppercase', () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(
      <HomeScreen />
    );

    // Open join input
    fireEvent.press(getByText('Join a Session'));

    const input = getByPlaceholderText('Enter code');
    fireEvent.changeText(input, 'abc123');

    // The input should convert to uppercase
    expect(input.props.value).toBe('ABC123');
  });
});

describe('HomeScreen - Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have working Solo Mode navigation', () => {
    const { getByText } = renderWithProviders(<HomeScreen />);

    fireEvent.press(getByText('Solo Mode'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/solo');
  });

  it('should have working Session navigation', () => {
    const { getByText } = renderWithProviders(<HomeScreen />);

    fireEvent.press(getByText('Session'));
    expect(mockPush).toHaveBeenCalledWith('/session/create');
  });
});

describe('HomeScreen - Profile Sheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display all profile menu options', () => {
    const { getByText } = renderWithProviders(<HomeScreen />);

    expect(getByText('Friends')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Sign Out')).toBeTruthy();
  });

  it('should display user info in profile sheet', () => {
    const { getByText, getAllByText } = renderWithProviders(<HomeScreen />);

    // User name and email should be visible
    const userNames = getAllByText('Test User');
    expect(userNames.length).toBeGreaterThan(0);
    expect(getByText('test@example.com')).toBeTruthy();
  });
});
