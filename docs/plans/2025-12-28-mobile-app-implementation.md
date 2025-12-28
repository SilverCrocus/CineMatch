# Cinematch Mobile App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build native iOS and Android apps for Cinematch using Expo (React Native) with swipe-based movie discovery.

**Architecture:** Separate Expo project (`cinematch-mobile`) calling the existing Next.js backend API. Tab-based navigation with Expo Router. Native gesture handling via react-native-gesture-handler and reanimated.

**Tech Stack:** Expo SDK 52, Expo Router 4, TypeScript, react-native-gesture-handler, react-native-reanimated, expo-auth-session, expo-secure-store, TanStack Query

---

## Phase 1: Project Setup

### Task 1: Initialize Expo Project

**Files:**
- Create: `../cinematch-mobile/` (new project directory)

**Step 1: Create Expo project with TypeScript template**

```bash
cd /Users/diyagamah/Documents
npx create-expo-app@latest cinematch-mobile --template tabs
```

Expected: Creates new directory with Expo project scaffolding

**Step 2: Navigate to project and verify it runs**

```bash
cd cinematch-mobile
npx expo start
```

Expected: Metro bundler starts, shows QR code

**Step 3: Stop the dev server (Ctrl+C) and commit initial setup**

```bash
git add .
git commit -m "chore: initialize Expo project with tabs template"
```

---

### Task 2: Install Core Dependencies

**Files:**
- Modify: `cinematch-mobile/package.json`

**Step 1: Install gesture and animation libraries**

```bash
cd /Users/diyagamah/Documents/cinematch-mobile
npx expo install react-native-gesture-handler react-native-reanimated
```

**Step 2: Install auth and storage libraries**

```bash
npx expo install expo-auth-session expo-secure-store expo-web-browser expo-crypto
```

**Step 3: Install data fetching library**

```bash
npm install @tanstack/react-query
```

**Step 4: Commit dependencies**

```bash
git add package.json package-lock.json
git commit -m "chore: add gesture, auth, storage, and query dependencies"
```

---

### Task 3: Configure Reanimated Babel Plugin

**Files:**
- Modify: `cinematch-mobile/babel.config.js`

**Step 1: Update babel config**

Replace contents of `babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

**Step 2: Clear Metro cache and verify**

```bash
npx expo start --clear
```

Expected: App starts without babel errors

**Step 3: Commit config**

```bash
git add babel.config.js
git commit -m "chore: configure reanimated babel plugin"
```

---

### Task 4: Set Up Project Structure

**Files:**
- Create: `cinematch-mobile/lib/api.ts`
- Create: `cinematch-mobile/lib/auth.ts`
- Create: `cinematch-mobile/lib/constants.ts`
- Create: `cinematch-mobile/types/index.ts`
- Create: `cinematch-mobile/hooks/useAuth.ts`

**Step 1: Create lib directory and constants**

Create `lib/constants.ts`:

```typescript
// API base URL - update this to your deployed backend
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://your-cinematch-domain.com';

export const SECURE_STORE_KEYS = {
  SESSION_TOKEN: 'session_token',
  USER_DATA: 'user_data',
} as const;
```

**Step 2: Create types file**

Create `types/index.ts`:

```typescript
export interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
  vote_average: number;
  genre_ids: number[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface Session {
  id: string;
  code: string;
  status: 'waiting' | 'active' | 'completed';
  host_id: string;
  created_at: string;
}

export interface Friend {
  id: string;
  name: string;
  email: string;
  image?: string;
  status: 'pending' | 'accepted';
}
```

**Step 3: Create API client**

Create `lib/api.ts`:

```typescript
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, SECURE_STORE_KEYS } from './constants';

class APIError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await SecureStore.getItemAsync(SECURE_STORE_KEYS.SESSION_TOKEN);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new APIError(`API error: ${response.statusText}`, response.status);
  }

  return response.json();
}

export const api = {
  // Solo mode
  getMovies: () => fetchAPI<{ movies: Movie[] }>('/api/solo/movies'),
  likeMovie: (movieId: number) =>
    fetchAPI('/api/solo/list', {
      method: 'POST',
      body: JSON.stringify({ movieId }),
    }),
  dismissMovie: (movieId: number) =>
    fetchAPI('/api/solo/dismissed', {
      method: 'POST',
      body: JSON.stringify({ movieId }),
    }),
  getMyList: () => fetchAPI<{ movies: Movie[] }>('/api/solo/list'),

  // Friends
  getFriends: () => fetchAPI<{ friends: Friend[] }>('/api/friends'),
  searchUsers: (query: string) =>
    fetchAPI<{ users: User[] }>(`/api/friends/search?q=${encodeURIComponent(query)}`),
  addFriend: (userId: string) =>
    fetchAPI('/api/friends', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  // Sessions
  createSession: () => fetchAPI<Session>('/api/sessions', { method: 'POST' }),
  joinSession: (code: string) =>
    fetchAPI<Session>('/api/sessions/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  getSession: (id: string) => fetchAPI<Session>(`/api/sessions/${id}`),
};
```

**Step 4: Create auth utilities**

Create `lib/auth.ts`:

```typescript
import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';
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
```

**Step 5: Create auth hook**

Create `hooks/useAuth.ts`:

```typescript
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
```

**Step 6: Commit project structure**

```bash
git add lib/ types/ hooks/
git commit -m "feat: add API client, auth utilities, and types"
```

---

## Phase 2: Navigation & Auth Flow

### Task 5: Set Up Auth Context

**Files:**
- Create: `cinematch-mobile/contexts/AuthContext.tsx`
- Modify: `cinematch-mobile/app/_layout.tsx`

**Step 1: Create auth context**

Create `contexts/AuthContext.tsx`:

```typescript
import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
```

**Step 2: Commit context**

```bash
git add contexts/
git commit -m "feat: add auth context provider"
```

---

### Task 6: Set Up Query Client

**Files:**
- Create: `cinematch-mobile/lib/queryClient.ts`

**Step 1: Create query client**

Create `lib/queryClient.ts`:

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});
```

**Step 2: Commit**

```bash
git add lib/queryClient.ts
git commit -m "feat: add TanStack Query client"
```

---

### Task 7: Update Root Layout

**Files:**
- Modify: `cinematch-mobile/app/_layout.tsx`

**Step 1: Update root layout with providers**

Replace `app/_layout.tsx`:

```typescript
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../contexts/AuthContext';
import { queryClient } from '../lib/queryClient';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <StatusBar style="auto" />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

**Step 2: Commit layout**

```bash
git add app/_layout.tsx
git commit -m "feat: add providers to root layout"
```

---

### Task 8: Create Auth Screens

**Files:**
- Create: `cinematch-mobile/app/(auth)/_layout.tsx`
- Create: `cinematch-mobile/app/(auth)/login.tsx`

**Step 1: Create auth layout**

Create `app/(auth)/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
```

**Step 2: Create login screen**

Create `app/(auth)/login.tsx`:

```typescript
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../lib/constants';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isAuthenticated } = useAuthContext();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  // For now, use a simple dev login flow
  // TODO: Replace with proper Google OAuth configuration
  async function handleSignIn() {
    try {
      // Development: Call your test login endpoint
      const response = await fetch(`${API_BASE_URL}/api/auth/test-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      if (response.ok) {
        const data = await response.json();
        await signIn(data.token, data.user);
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Sign in error:', error);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cinematch</Text>
        <Text style={styles.subtitle}>Find your next favorite movie</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.googleButton} onPress={handleSignIn}>
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#888',
  },
  buttonContainer: {
    gap: 16,
  },
  googleButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
```

**Step 3: Commit auth screens**

```bash
git add app/\(auth\)/
git commit -m "feat: add login screen with auth flow"
```

---

### Task 9: Create Tab Navigation

**Files:**
- Create: `cinematch-mobile/app/(tabs)/_layout.tsx`
- Create: `cinematch-mobile/app/(tabs)/index.tsx`
- Create: `cinematch-mobile/app/(tabs)/solo.tsx`
- Create: `cinematch-mobile/app/(tabs)/friends.tsx`

**Step 1: Create tabs layout**

Create `app/(tabs)/_layout.tsx`:

```typescript
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#e50914',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#0f0f0f',
          borderTopColor: '#222',
        },
        headerStyle: {
          backgroundColor: '#0f0f0f',
        },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="solo"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="film" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

**Step 2: Create home screen**

Create `app/(tabs)/index.tsx`:

```typescript
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../contexts/AuthContext';

export default function HomeScreen() {
  const { user, signOut } = useAuthContext();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        Welcome{user?.name ? `, ${user.name}` : ''}!
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/solo')}
        >
          <Text style={styles.primaryButtonText}>Start Swiping</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/solo/list')}
        >
          <Text style={styles.secondaryButtonText}>My List</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    padding: 24,
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 32,
    textAlign: 'center',
  },
  actions: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#e50914',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#222',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 48,
    alignItems: 'center',
  },
  signOutText: {
    color: '#888',
    fontSize: 14,
  },
});
```

**Step 3: Create placeholder solo screen**

Create `app/(tabs)/solo.tsx`:

```typescript
import { View, Text, StyleSheet } from 'react-native';

export default function SoloScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Swipe Screen Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 18,
  },
});
```

**Step 4: Create placeholder friends screen**

Create `app/(tabs)/friends.tsx`:

```typescript
import { View, Text, StyleSheet } from 'react-native';

export default function FriendsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Friends Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 18,
  },
});
```

**Step 5: Commit tabs**

```bash
git add app/\(tabs\)/
git commit -m "feat: add tab navigation with home, solo, and friends screens"
```

---

## Phase 3: Swipe Card Component

### Task 10: Create Movie Card Component

**Files:**
- Create: `cinematch-mobile/components/MovieCard.tsx`

**Step 1: Create the movie card**

Create `components/MovieCard.tsx`:

```typescript
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import { Movie } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

interface MovieCardProps {
  movie: Movie;
  index: number;
  totalCards: number;
  translateX: SharedValue<number>;
  isTop: boolean;
}

export default function MovieCard({
  movie,
  index,
  totalCards,
  translateX,
  isTop,
}: MovieCardProps) {
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null;

  const year = movie.release_date?.split('-')[0] || 'N/A';

  const animatedStyle = useAnimatedStyle(() => {
    if (!isTop) {
      // Cards behind: slight scale and offset
      const scale = interpolate(index, [0, totalCards], [1, 0.9]);
      const translateY = interpolate(index, [0, totalCards], [0, -20]);
      return {
        transform: [{ scale }, { translateY }],
      };
    }

    // Top card: follows gesture
    const rotate = interpolate(translateX.value, [-SCREEN_WIDTH, SCREEN_WIDTH], [-15, 15]);

    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => {
    if (!isTop) return { opacity: 0 };
    return {
      opacity: interpolate(translateX.value, [0, SCREEN_WIDTH / 4], [0, 1]),
    };
  });

  const nopeOpacity = useAnimatedStyle(() => {
    if (!isTop) return { opacity: 0 };
    return {
      opacity: interpolate(translateX.value, [-SCREEN_WIDTH / 4, 0], [1, 0]),
    };
  });

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      {posterUrl ? (
        <Image source={{ uri: posterUrl }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, styles.noPoster]}>
          <Text style={styles.noPosterText}>No Image</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {movie.title}
        </Text>
        <Text style={styles.meta}>
          {year} • ⭐ {movie.vote_average.toFixed(1)}
        </Text>
      </View>

      {/* Like/Nope indicators */}
      <Animated.View style={[styles.indicator, styles.likeIndicator, likeOpacity]}>
        <Text style={styles.indicatorText}>LIKE</Text>
      </Animated.View>
      <Animated.View style={[styles.indicator, styles.nopeIndicator, nopeOpacity]}>
        <Text style={styles.indicatorText}>NOPE</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    position: 'absolute',
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    height: '75%',
  },
  noPoster: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPosterText: {
    color: '#666',
    fontSize: 16,
  },
  info: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    color: '#888',
  },
  indicator: {
    position: 'absolute',
    top: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
  },
  likeIndicator: {
    right: 20,
    borderColor: '#4ade80',
  },
  nopeIndicator: {
    left: 20,
    borderColor: '#f87171',
  },
  indicatorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
});
```

**Step 2: Commit component**

```bash
git add components/
git commit -m "feat: add MovieCard component with animations"
```

---

### Task 11: Create Swipe Deck Component

**Files:**
- Create: `cinematch-mobile/components/SwipeDeck.tsx`

**Step 1: Create swipe deck**

Create `components/SwipeDeck.tsx`:

```typescript
import { View, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import MovieCard from './MovieCard';
import { Movie } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface SwipeDeckProps {
  movies: Movie[];
  onSwipeRight: (movie: Movie) => void;
  onSwipeLeft: (movie: Movie) => void;
}

export default function SwipeDeck({
  movies,
  onSwipeRight,
  onSwipeLeft,
}: SwipeDeckProps) {
  const translateX = useSharedValue(0);

  const handleSwipeComplete = (direction: 'left' | 'right') => {
    const movie = movies[0];
    if (!movie) return;

    if (direction === 'right') {
      onSwipeRight(movie);
    } else {
      onSwipeLeft(movie);
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - like
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, {}, () => {
          runOnJS(handleSwipeComplete)('right');
          translateX.value = 0;
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - dismiss
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, {}, () => {
          runOnJS(handleSwipeComplete)('left');
          translateX.value = 0;
        });
      } else {
        // Return to center
        translateX.value = withSpring(0);
      }
    });

  // Show top 3 cards
  const visibleMovies = movies.slice(0, 3);

  return (
    <View style={styles.container}>
      {visibleMovies.map((movie, index) => {
        const isTop = index === 0;

        if (isTop) {
          return (
            <GestureDetector key={movie.id} gesture={panGesture}>
              <Animated.View style={styles.cardContainer}>
                <MovieCard
                  movie={movie}
                  index={index}
                  totalCards={visibleMovies.length}
                  translateX={translateX}
                  isTop={true}
                />
              </Animated.View>
            </GestureDetector>
          );
        }

        return (
          <MovieCard
            key={movie.id}
            movie={movie}
            index={index}
            totalCards={visibleMovies.length}
            translateX={translateX}
            isTop={false}
          />
        );
      }).reverse()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    position: 'absolute',
  },
});
```

**Step 2: Commit deck**

```bash
git add components/SwipeDeck.tsx
git commit -m "feat: add SwipeDeck with gesture handling"
```

---

### Task 12: Implement Solo Swipe Screen

**Files:**
- Modify: `cinematch-mobile/app/(tabs)/solo.tsx`

**Step 1: Update solo screen with swipe functionality**

Replace `app/(tabs)/solo.tsx`:

```typescript
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import SwipeDeck from '../../components/SwipeDeck';
import { api } from '../../lib/api';
import { Movie } from '../../types';

export default function SoloScreen() {
  const queryClient = useQueryClient();
  const [currentMovies, setCurrentMovies] = useState<Movie[]>([]);

  const { isLoading, error, refetch } = useQuery({
    queryKey: ['movies'],
    queryFn: async () => {
      const data = await api.getMovies();
      setCurrentMovies((prev) => [...prev, ...data.movies]);
      return data;
    },
  });

  const likeMutation = useMutation({
    mutationFn: api.likeMovie,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myList'] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: api.dismissMovie,
  });

  const handleSwipeRight = (movie: Movie) => {
    likeMutation.mutate(movie.id);
    setCurrentMovies((prev) => prev.filter((m) => m.id !== movie.id));

    // Fetch more if running low
    if (currentMovies.length < 5) {
      refetch();
    }
  };

  const handleSwipeLeft = (movie: Movie) => {
    dismissMutation.mutate(movie.id);
    setCurrentMovies((prev) => prev.filter((m) => m.id !== movie.id));

    // Fetch more if running low
    if (currentMovies.length < 5) {
      refetch();
    }
  };

  if (isLoading && currentMovies.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

  if (error && currentMovies.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load movies</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (currentMovies.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No more movies!</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Load More</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SwipeDeck
        movies={currentMovies}
        onSwipeRight={handleSwipeRight}
        onSwipeLeft={handleSwipeLeft}
      />

      {/* Action buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, styles.dismissButton]}
          onPress={() => handleSwipeLeft(currentMovies[0])}
        >
          <Ionicons name="close" size={32} color="#f87171" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.likeButton]}
          onPress={() => handleSwipeRight(currentMovies[0])}
        >
          <Ionicons name="heart" size={32} color="#4ade80" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  centered: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#f87171',
    fontSize: 16,
    marginBottom: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#e50914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingBottom: 32,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  dismissButton: {
    borderColor: '#f87171',
  },
  likeButton: {
    borderColor: '#4ade80',
  },
});
```

**Step 2: Commit screen**

```bash
git add app/\(tabs\)/solo.tsx
git commit -m "feat: implement solo swipe screen with gesture handling"
```

---

## Phase 4: My List Screen

### Task 13: Create My List Screen

**Files:**
- Create: `cinematch-mobile/app/solo/list.tsx`
- Modify: `cinematch-mobile/app/(tabs)/_layout.tsx` (add route)

**Step 1: Create list screen**

Create `app/solo/list.tsx`:

```typescript
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { Movie } from '../../types';

export default function MyListScreen() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['myList'],
    queryFn: api.getMyList,
  });

  const renderMovie = ({ item }: { item: Movie }) => {
    const posterUrl = item.poster_path
      ? `https://image.tmdb.org/t/p/w200${item.poster_path}`
      : null;
    const year = item.release_date?.split('-')[0] || 'N/A';

    return (
      <View style={styles.movieItem}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.noPoster]}>
            <Ionicons name="film" size={24} color="#666" />
          </View>
        )}
        <View style={styles.movieInfo}>
          <Text style={styles.movieTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.movieMeta}>
            {year} • ⭐ {item.vote_average.toFixed(1)}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load your list</Text>
      </View>
    );
  }

  const movies = data?.movies || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My List</Text>
        <View style={{ width: 24 }} />
      </View>

      {movies.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No movies saved yet</Text>
          <Text style={styles.emptySubtext}>
            Start swiping to add movies to your list!
          </Text>
        </View>
      ) : (
        <FlatList
          data={movies}
          renderItem={renderMovie}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#f87171',
    fontSize: 16,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
  },
  list: {
    padding: 16,
  },
  movieItem: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  poster: {
    width: 80,
    height: 120,
  },
  noPoster: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  movieInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  movieTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  movieMeta: {
    fontSize: 14,
    color: '#888',
  },
});
```

**Step 2: Commit list screen**

```bash
mkdir -p app/solo
git add app/solo/
git commit -m "feat: add My List screen"
```

---

## Phase 5: Final Setup & Testing

### Task 14: Create App Entry Point

**Files:**
- Modify: `cinematch-mobile/app/index.tsx`

**Step 1: Create root redirect**

Create or replace `app/index.tsx`:

```typescript
import { Redirect } from 'expo-router';
import { useAuthContext } from '../contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const { isLoading, isAuthenticated } = useAuthContext();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

**Step 2: Commit entry point**

```bash
git add app/index.tsx
git commit -m "feat: add root redirect based on auth state"
```

---

### Task 15: Update App Configuration

**Files:**
- Modify: `cinematch-mobile/app.json`

**Step 1: Update app.json with proper config**

Update `app.json`:

```json
{
  "expo": {
    "name": "Cinematch",
    "slug": "cinematch-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "cinematch",
    "userInterfaceStyle": "dark",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourname.cinematch"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#0f0f0f"
      },
      "package": "com.yourname.cinematch"
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

**Step 2: Commit config**

```bash
git add app.json
git commit -m "chore: configure app settings"
```

---

### Task 16: Test the App

**Step 1: Start the development server**

```bash
cd /Users/diyagamah/Documents/cinematch-mobile
npx expo start
```

**Step 2: Test on iOS Simulator**

Press `i` in the terminal to open iOS Simulator.

Expected behavior:
- App opens to login screen
- Tapping "Sign in with Google" navigates to tabs (with dev login)
- Solo tab shows swipe cards (if backend running)
- Swiping left/right animates and removes cards

**Step 3: Test on Android Emulator (optional)**

Press `a` in the terminal to open Android Emulator.

---

### Task 17: Final Commit and Summary

**Step 1: Create final commit**

```bash
git add .
git commit -m "feat: complete initial mobile app implementation"
```

**Step 2: Push to remote (if desired)**

```bash
git remote add origin https://github.com/yourusername/cinematch-mobile.git
git push -u origin main
```

---

## Summary

After completing all tasks, you will have:

1. ✅ Expo project with TypeScript
2. ✅ Tab navigation (Home, Discover, Friends)
3. ✅ Auth flow with secure token storage
4. ✅ Swipe cards with native gestures
5. ✅ API client connected to your backend
6. ✅ My List screen

**Next steps (not in this plan):**
- Configure real Google OAuth
- Implement Friends screen
- Add push notifications
- Set up EAS Build for distribution
