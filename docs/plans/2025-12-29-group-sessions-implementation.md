# Group Sessions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement group session functionality with home screen redesign, allowing users to create/join sessions, swipe on movies together, and see matches.

**Architecture:** Session state managed via polling (3s interval) against existing backend API. Single dynamic screen (`/session/[id]`) handles all phases (lobby, pre-matches, swiping, reveal) based on session status. Home screen becomes group sessions hub.

**Tech Stack:** React Native, Expo Router, TanStack Query, existing backend API endpoints

---

## Task 1: Add Session API Methods

**Files:**
- Modify: `/Users/diyagamah/Documents/cinematch-mobile/.worktrees/group-sessions/lib/api.ts`
- Test: `/Users/diyagamah/Documents/cinematch-mobile/.worktrees/group-sessions/__tests__/lib/sessions-api.test.ts`

**Step 1: Write the failing tests**

Create new test file `__tests__/lib/sessions-api.test.ts`:

```typescript
import * as SecureStore from 'expo-secure-store';
import { api } from '../../lib/api';

const API_BASE_URL = 'http://localhost:3000';
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('Session API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-token');
  });

  describe('api.createSession', () => {
    it('should POST to /api/sessions with source', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'session-123', code: 'ABC123' }),
      } as Response);

      const result = await api.createSession({ type: 'filters', filters: { genres: [28] } });

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/sessions`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ source: { type: 'filters', filters: { genres: [28] } } }),
        })
      );
      expect(result).toEqual({ id: 'session-123', code: 'ABC123' });
    });
  });

  describe('api.joinSession', () => {
    it('should POST to /api/sessions/join with code', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionId: 'session-123' }),
      } as Response);

      const result = await api.joinSession('ABC123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/sessions/join`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ code: 'ABC123' }),
        })
      );
      expect(result).toEqual({ sessionId: 'session-123' });
    });
  });

  describe('api.getSession', () => {
    it('should GET /api/sessions/:id', async () => {
      const mockSession = {
        id: 'session-123',
        code: 'ABC123',
        status: 'lobby',
        participants: [],
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSession),
      } as Response);

      const result = await api.getSession('session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/sessions/session-123`,
        expect.any(Object)
      );
      expect(result).toEqual(mockSession);
    });
  });

  describe('api.startSession', () => {
    it('should POST to /api/sessions/:id/start', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await api.startSession('session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/sessions/session-123/start`,
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('api.swipeInSession', () => {
    it('should POST to /api/sessions/:id/swipe', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await api.swipeInSession('session-123', 456, true);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/sessions/session-123/swipe`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ movieId: 456, liked: true }),
        })
      );
    });
  });

  describe('api.revealMatches', () => {
    it('should POST then GET /api/sessions/:id/reveal', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ matches: [{ id: 1, title: 'Movie' }] }),
        } as Response);

      const result = await api.revealMatches('session-123');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ matches: [{ id: 1, title: 'Movie' }] });
    });
  });

  describe('api.getPrematches', () => {
    it('should GET /api/sessions/:id/prematches', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ movies: [{ id: 1, title: 'Common Movie' }] }),
      } as Response);

      const result = await api.getPrematches('session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/sessions/session-123/prematches`,
        expect.any(Object)
      );
      expect(result).toEqual({ movies: [{ id: 1, title: 'Common Movie' }] });
    });
  });

  describe('api.selectMovie', () => {
    it('should POST to /api/sessions/:id/select', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await api.selectMovie('session-123', 456);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/sessions/session-123/select`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ movieId: 456 }),
        })
      );
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/diyagamah/Documents/cinematch-mobile/.worktrees/group-sessions && npm test -- __tests__/lib/sessions-api.test.ts`

Expected: FAIL with "api.createSession is not a function" (or similar)

**Step 3: Implement session API methods**

Add to `lib/api.ts` after existing methods:

```typescript
// Session types
export interface SessionSource {
  type: 'filters' | 'url' | 'text';
  filters?: {
    genres?: number[];
    yearFrom?: number;
    yearTo?: number;
  };
  url?: string;
  textList?: string;
}

export interface SessionParticipant {
  id: string;
  userId: string;
  nickname: string;
  completed: boolean;
  user: { id: string; name: string; image: string };
}

export interface Session {
  id: string;
  code: string;
  status: 'lobby' | 'swiping' | 'revealed';
  hostId: string;
  participants: SessionParticipant[];
  movies: Movie[];
  userSwipes: Record<number, boolean>;
  isHost: boolean;
}

// Add to api object:
  // Sessions
  createSession: async (source: SessionSource) => {
    return fetchAPI('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ source }),
    });
  },

  joinSession: async (code: string) => {
    return fetchAPI('/api/sessions/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  getSession: async (sessionId: string): Promise<Session> => {
    return fetchAPI(`/api/sessions/${sessionId}`);
  },

  startSession: async (sessionId: string) => {
    return fetchAPI(`/api/sessions/${sessionId}/start`, {
      method: 'POST',
    });
  },

  swipeInSession: async (sessionId: string, movieId: number, liked: boolean) => {
    return fetchAPI(`/api/sessions/${sessionId}/swipe`, {
      method: 'POST',
      body: JSON.stringify({ movieId, liked }),
    });
  },

  revealMatches: async (sessionId: string) => {
    await fetchAPI(`/api/sessions/${sessionId}/reveal`, { method: 'POST' });
    return fetchAPI(`/api/sessions/${sessionId}/reveal`);
  },

  getPrematches: async (sessionId: string) => {
    return fetchAPI(`/api/sessions/${sessionId}/prematches`);
  },

  selectMovie: async (sessionId: string, movieId: number) => {
    return fetchAPI(`/api/sessions/${sessionId}/select`, {
      method: 'POST',
      body: JSON.stringify({ movieId }),
    });
  },
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/diyagamah/Documents/cinematch-mobile/.worktrees/group-sessions && npm test -- __tests__/lib/sessions-api.test.ts`

Expected: All 8 tests PASS

**Step 5: Commit**

```bash
cd /Users/diyagamah/Documents/cinematch-mobile/.worktrees/group-sessions
git add lib/api.ts __tests__/lib/sessions-api.test.ts
git commit -m "feat: add session API methods"
```

---

## Task 2: Redesign Home Screen

**Files:**
- Modify: `/Users/diyagamah/Documents/cinematch-mobile/.worktrees/group-sessions/app/(tabs)/index.tsx`

**Step 1: Implement new home screen layout**

Replace contents of `app/(tabs)/index.tsx`:

```typescript
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../contexts/AuthContext';
import { api } from '../../lib/api';

export default function HomeScreen() {
  const { user, signOut } = useAuthContext();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoinSession = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);

    try {
      const data = await api.joinSession(joinCode.trim().toUpperCase());
      router.push(`/session/${data.sessionId}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to join session. Check the code and try again.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            {user?.image ? (
              <Image source={{ uri: user.image }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={24} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Hero Card - Create Session */}
      <TouchableOpacity
        style={styles.heroCard}
        onPress={() => router.push('/session/create')}
      >
        <View style={styles.heroIconContainer}>
          <Ionicons name="add" size={32} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>New Session</Text>
        <Text style={styles.heroSubtitle}>
          Start a movie night with friends
        </Text>
        <View style={styles.heroButton}>
          <Text style={styles.heroButtonText}>Create Session</Text>
        </View>
      </TouchableOpacity>

      {/* Join Session Card */}
      <View style={styles.joinCard}>
        <Text style={styles.joinTitle}>Join Session</Text>
        <Text style={styles.joinSubtitle}>Enter a room code to join</Text>
        <View style={styles.joinInputRow}>
          <TextInput
            style={styles.codeInput}
            placeholder="CODE"
            placeholderTextColor="#666"
            value={joinCode}
            onChangeText={(text) => setJoinCode(text.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[
              styles.joinButton,
              (!joinCode.trim() || joining) && styles.joinButtonDisabled,
            ]}
            onPress={handleJoinSession}
            disabled={!joinCode.trim() || joining}
          >
            {joining ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.joinButtonText}>Join</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  welcomeText: {
    color: '#888',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  signOutButton: {
    padding: 8,
  },
  heroCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  heroIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#e50914',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#888',
    fontSize: 16,
    marginBottom: 20,
  },
  heroButton: {
    backgroundColor: '#e50914',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  heroButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  joinCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  joinTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  joinSubtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  joinInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  codeInput: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 18,
    fontFamily: 'monospace',
    letterSpacing: 4,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  joinButton: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

**Step 2: Test manually**

Run: `cd /Users/diyagamah/Documents/cinematch-mobile/.worktrees/group-sessions && npx expo start`

Verify:
- Header shows avatar, welcome text, user name, sign out button
- Hero card shows "New Session" with red create button
- Join card shows code input and Join button
- Tapping "Create Session" navigates to `/session/create` (will 404 for now - expected)

**Step 3: Commit**

```bash
cd /Users/diyagamah/Documents/cinematch-mobile/.worktrees/group-sessions
git add "app/(tabs)/index.tsx"
git commit -m "feat: redesign home screen for group sessions"
```

---

## Task 3: Create Session Creation Screen

**Files:**
- Create: `/Users/diyagamah/Documents/cinematch-mobile/.worktrees/group-sessions/app/session/create.tsx`
- Create: `/Users/diyagamah/Documents/cinematch-mobile/.worktrees/group-sessions/app/session/_layout.tsx`

**Step 1: Create session layout**

Create `app/session/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';

export default function SessionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
```

**Step 2: Create session creation screen**

Create `app/session/create.tsx`:

```typescript
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, SessionSource } from '../../lib/api';
import { GENRES } from '../../lib/genres';

type Tab = 'filters' | 'url' | 'text';

export default function CreateSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('filters');
  const [loading, setLoading] = useState(false);

  // Filters state
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');

  // URL state
  const [url, setUrl] = useState('');

  // Text state
  const [textList, setTextList] = useState('');

  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    setLoading(true);

    try {
      let source: SessionSource = { type: activeTab };

      if (activeTab === 'filters') {
        source.filters = {
          genres: selectedGenres.length > 0 ? selectedGenres : undefined,
          yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
          yearTo: yearTo ? parseInt(yearTo) : undefined,
        };
      } else if (activeTab === 'url') {
        if (!url.trim()) {
          Alert.alert('Error', 'Please enter a URL');
          setLoading(false);
          return;
        }
        source.url = url.trim();
      } else if (activeTab === 'text') {
        if (!textList.trim()) {
          Alert.alert('Error', 'Please enter movie titles');
          setLoading(false);
          return;
        }
        source.textList = textList.trim();
      }

      const data = await api.createSession(source);
      router.replace(`/session/${data.id}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Session</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabs}>
        {[
          { id: 'filters' as Tab, icon: 'options', label: 'Filters' },
          { id: 'url' as Tab, icon: 'link', label: 'URL' },
          { id: 'text' as Tab, icon: 'document-text', label: 'List' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.id ? '#fff' : '#888'}
            />
            <Text
              style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Filters Tab */}
        {activeTab === 'filters' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Genres</Text>
            <View style={styles.genreGrid}>
              {GENRES.map((genre) => (
                <TouchableOpacity
                  key={genre.id}
                  style={[
                    styles.genreChip,
                    selectedGenres.includes(genre.id) && styles.genreChipSelected,
                  ]}
                  onPress={() => toggleGenre(genre.id)}
                >
                  <Text
                    style={[
                      styles.genreChipText,
                      selectedGenres.includes(genre.id) && styles.genreChipTextSelected,
                    ]}
                  >
                    {genre.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Year Range</Text>
            <View style={styles.yearRow}>
              <TextInput
                style={styles.yearInput}
                placeholder="From"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                value={yearFrom}
                onChangeText={setYearFrom}
                maxLength={4}
              />
              <Text style={styles.yearDash}>—</Text>
              <TextInput
                style={styles.yearInput}
                placeholder="To"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                value={yearTo}
                onChangeText={setYearTo}
                maxLength={4}
              />
            </View>
          </View>
        )}

        {/* URL Tab */}
        {activeTab === 'url' && (
          <View style={styles.tabContent}>
            <Text style={styles.helpText}>
              Paste any URL with a movie list — our AI will extract the titles
            </Text>
            <TextInput
              style={styles.urlInput}
              placeholder="https://example.com/movie-list"
              placeholderTextColor="#666"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        )}

        {/* Text Tab */}
        {activeTab === 'text' && (
          <View style={styles.tabContent}>
            <Text style={styles.helpText}>
              Enter movie titles, one per line or comma-separated
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={"The Shawshank Redemption\nPulp Fiction\nThe Dark Knight"}
              placeholderTextColor="#666"
              value={textList}
              onChangeText={setTextList}
              multiline
              textAlignVertical="top"
            />
          </View>
        )}
      </ScrollView>

      {/* Create Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Session</Text>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: '#e50914',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabContent: {
    paddingBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  genreChipSelected: {
    backgroundColor: '#e50914',
    borderColor: '#e50914',
  },
  genreChipText: {
    color: '#888',
    fontSize: 14,
  },
  genreChipTextSelected: {
    color: '#fff',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  yearInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  yearDash: {
    color: '#666',
    fontSize: 18,
  },
  helpText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  urlInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    height: 200,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  createButton: {
    backgroundColor: '#e50914',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
```

**Step 3: Test manually**

Run: `cd /Users/diyagamah/Documents/cinematch-mobile/.worktrees/group-sessions && npx expo start`

Verify:
- Navigate from Home → Create Session
- Three tabs work (Filters, URL, List)
- Genre chips toggle selection
- Year inputs accept numbers
- URL input works
- Text list accepts multiline input
- Create button shows loading state

**Step 4: Commit**

```bash
cd /Users/diyagamah/Documents/cinematch-mobile/.worktrees/group-sessions
git add app/session/_layout.tsx app/session/create.tsx
git commit -m "feat: add session creation screen with filters, URL, and text list tabs"
```

---

## Task 4: Create Session Screen (All Phases)

**Files:**
- Create: `/Users/diyagamah/Documents/cinematch-mobile/.worktrees/group-sessions/app/session/[id].tsx`

**Step 1: Create the multi-phase session screen**

Create `app/session/[id].tsx`:

```typescript
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useAuthContext } from '../../contexts/AuthContext';
import { api, Session } from '../../lib/api';
import { Movie } from '../../types';
import SwipeDeck from '../../components/SwipeDeck';

interface PrematchData {
  movies: Movie[];
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthContext();

  const [session, setSession] = useState<Session | null>(null);
  const [prematches, setPrematches] = useState<PrematchData | null>(null);
  const [matches, setMatches] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<number | null>(null);
  const [showPrematches, setShowPrematches] = useState(true);

  const fetchSession = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getSession(id);
      setSession(data);

      // Fetch prematches when entering swiping phase
      if (data.status === 'swiping' && !prematches) {
        try {
          const prematchData = await api.getPrematches(id);
          setPrematches(prematchData);
        } catch {
          setPrematches({ movies: [] });
        }
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  }, [id, prematches]);

  // Poll for updates
  useEffect(() => {
    fetchSession();
    const interval = setInterval(fetchSession, 3000);
    return () => clearInterval(interval);
  }, [fetchSession]);

  const copyCode = async () => {
    if (session?.code) {
      await Clipboard.setStringAsync(session.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startSession = async () => {
    if (!id) return;
    try {
      await api.startSession(id);
      fetchSession();
    } catch {
      Alert.alert('Error', 'Failed to start session');
    }
  };

  const handleSwipe = async (movie: Movie, liked: boolean) => {
    if (!id) return;
    await api.swipeInSession(id, movie.tmdbId || movie.id, liked);
  };

  const handleSwipeComplete = () => {
    fetchSession();
  };

  const revealMatches = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.revealMatches(id);
      setMatches(data.matches || []);
      fetchSession();
    } catch {
      Alert.alert('Error', 'Failed to reveal matches');
    }
  }, [id, fetchSession]);

  const selectMovie = async (movieId: number) => {
    if (!id || !session?.isHost) return;
    try {
      await api.selectMovie(id, movieId);
      setSelectedMovie(movieId);
    } catch {
      Alert.alert('Error', 'Failed to select movie');
    }
  };

  // Get current user's participant data
  const userParticipant = session?.participants.find(
    (p) => p.user?.id === user?.id
  );
  const isCompleted = userParticipant?.completed ?? false;
  const allCompleted = session?.participants.every((p) => p.completed) ?? false;

  // Auto-reveal when everyone is done
  useEffect(() => {
    if (session?.status === 'swiping' && allCompleted && isCompleted) {
      revealMatches();
    }
  }, [session?.status, allCompleted, isCompleted, revealMatches]);

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#e50914" />
        <Text style={styles.loadingText}>Loading session...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Session not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // LOBBY PHASE
  if (session.status === 'lobby') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Session Lobby</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.lobbyContent}>
          <Text style={styles.lobbySubtitle}>Share the code with friends</Text>

          <View style={styles.codeCard}>
            <Text style={styles.codeText}>{session.code}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={copyCode}>
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={20}
                color="#fff"
              />
              <Text style={styles.copyButtonText}>
                {copied ? 'Copied!' : 'Copy Code'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.participantsSection}>
            <View style={styles.participantsHeader}>
              <Ionicons name="people" size={20} color="#888" />
              <Text style={styles.participantsCount}>
                {session.participants.length} joined
              </Text>
            </View>
            <View style={styles.participantsList}>
              {session.participants.map((p) => (
                <View key={p.id} style={styles.participantChip}>
                  <View style={styles.participantAvatar}>
                    {p.user?.image ? (
                      <Image
                        source={{ uri: p.user.image }}
                        style={styles.participantAvatarImage}
                      />
                    ) : (
                      <Text style={styles.participantAvatarText}>
                        {p.nickname.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.participantName}>{p.nickname}</Text>
                </View>
              ))}
            </View>
          </View>

          {session.isHost ? (
            <TouchableOpacity style={styles.startButton} onPress={startSession}>
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.startButtonText}>
                Start Swiping ({session.movies.length} movies)
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.waitingText}>Waiting for host to start...</Text>
          )}
        </View>
      </View>
    );
  }

  // PRE-MATCHES PHASE (shown before swiping starts)
  if (
    session.status === 'swiping' &&
    showPrematches &&
    prematches &&
    prematches.movies.length > 0 &&
    !isCompleted
  ) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.prematchContent}>
          <Text style={styles.prematchTitle}>Before you swipe...</Text>
          <Text style={styles.prematchEmoji}>🎉</Text>
          <Text style={styles.prematchText}>
            You already have {prematches.movies.length} movie
            {prematches.movies.length > 1 ? 's' : ''} in common!
          </Text>

          <View style={styles.prematchPosters}>
            {prematches.movies.slice(0, 5).map((movie) => (
              <View key={movie.id} style={styles.prematchPoster}>
                {movie.posterUrl ? (
                  <Image
                    source={{ uri: movie.posterUrl }}
                    style={styles.prematchPosterImage}
                  />
                ) : (
                  <View style={styles.prematchPosterPlaceholder}>
                    <Ionicons name="film" size={24} color="#666" />
                  </View>
                )}
              </View>
            ))}
          </View>

          <Text style={styles.prematchSubtext}>
            These are already on everyone's watchlist
          </Text>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => setShowPrematches(false)}
          >
            <Text style={styles.continueButtonText}>Continue to Swiping</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // SWIPING PHASE - Completed waiting
  if (session.status === 'swiping' && isCompleted) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.doneTitle}>All done! 🎉</Text>
        <Text style={styles.doneSubtitle}>
          {allCompleted ? 'Revealing matches...' : 'Waiting for others...'}
        </Text>

        <View style={styles.completionList}>
          {session.participants.map((p) => (
            <View key={p.id} style={styles.completionItem}>
              <View style={styles.participantAvatar}>
                {p.user?.image ? (
                  <Image
                    source={{ uri: p.user.image }}
                    style={styles.participantAvatarImage}
                  />
                ) : (
                  <Text style={styles.participantAvatarText}>
                    {p.nickname.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <Text style={styles.completionName}>{p.nickname}</Text>
              {p.completed ? (
                <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
              ) : (
                <ActivityIndicator size="small" color="#888" />
              )}
            </View>
          ))}
        </View>
      </View>
    );
  }

  // SWIPING PHASE - Active swiping
  if (session.status === 'swiping') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <SwipeDeck
          movies={session.movies}
          onSwipeRight={(movie) => handleSwipe(movie, true)}
          onSwipeLeft={(movie) => handleSwipe(movie, false)}
          onComplete={handleSwipeComplete}
          initialIndex={Object.keys(session.userSwipes || {}).length}
        />
      </View>
    );
  }

  // REVEALED PHASE
  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.revealContent}
    >
      <View style={styles.revealHeader}>
        <Text style={styles.revealEmoji}>
          {matches.length > 0 || (prematches?.movies.length ?? 0) > 0 ? '🎉' : '😢'}
        </Text>
        <Text style={styles.revealTitle}>
          {matches.length > 0 || (prematches?.movies.length ?? 0) > 0
            ? 'You matched!'
            : 'No matches'}
        </Text>
        <Text style={styles.revealSubtitle}>
          {matches.length > 0 || (prematches?.movies.length ?? 0) > 0
            ? `${(prematches?.movies.length ?? 0) + matches.length} movie${
                (prematches?.movies.length ?? 0) + matches.length > 1 ? 's' : ''
              } everyone liked`
            : 'Try again with different filters'}
        </Text>
      </View>

      {/* Pre-matches section */}
      {prematches && prematches.movies.length > 0 && (
        <View style={styles.matchSection}>
          <Text style={styles.matchSectionTitle}>
            ALREADY ON YOUR LISTS ({prematches.movies.length})
          </Text>
          {prematches.movies.map((movie) => (
            <TouchableOpacity
              key={movie.id}
              style={[
                styles.matchCard,
                selectedMovie === movie.id && styles.matchCardSelected,
              ]}
              onPress={() => selectMovie(movie.id)}
              disabled={!session.isHost}
            >
              {movie.posterUrl && (
                <Image
                  source={{ uri: movie.posterUrl }}
                  style={styles.matchPoster}
                />
              )}
              <View style={styles.matchInfo}>
                <Text style={styles.matchTitle}>{movie.title}</Text>
                <Text style={styles.matchMeta}>
                  {movie.year} • {movie.genres?.slice(0, 2).join(', ')}
                </Text>
                {movie.imdbRating && (
                  <Text style={styles.matchRating}>⭐ {movie.imdbRating}</Text>
                )}
              </View>
              {selectedMovie === movie.id && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* New matches section */}
      {matches.length > 0 && (
        <View style={styles.matchSection}>
          <Text style={styles.matchSectionTitle}>
            NEW MATCHES ({matches.length})
          </Text>
          {matches.map((movie) => (
            <TouchableOpacity
              key={movie.id}
              style={[
                styles.matchCard,
                selectedMovie === movie.id && styles.matchCardSelected,
              ]}
              onPress={() => selectMovie(movie.id)}
              disabled={!session.isHost}
            >
              {movie.posterUrl && (
                <Image
                  source={{ uri: movie.posterUrl }}
                  style={styles.matchPoster}
                />
              )}
              <View style={styles.matchInfo}>
                <Text style={styles.matchTitle}>{movie.title}</Text>
                <Text style={styles.matchMeta}>
                  {movie.year} • {movie.genres?.slice(0, 2).join(', ')}
                </Text>
                {movie.imdbRating && (
                  <Text style={styles.matchRating}>⭐ {movie.imdbRating}</Text>
                )}
              </View>
              {selectedMovie === movie.id && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={styles.homeButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
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
    padding: 24,
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 18,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

  // Lobby styles
  lobbyContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  lobbySubtitle: {
    color: '#888',
    fontSize: 16,
    marginBottom: 24,
  },
  codeCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  codeText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 8,
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  participantsSection: {
    width: '100%',
    marginBottom: 32,
  },
  participantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  participantsCount: {
    color: '#888',
    fontSize: 16,
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    gap: 8,
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  participantAvatarImage: {
    width: '100%',
    height: '100%',
  },
  participantAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  participantName: {
    color: '#fff',
    fontSize: 14,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e50914',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  waitingText: {
    color: '#888',
    fontSize: 16,
  },

  // Pre-match styles
  prematchContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  prematchTitle: {
    color: '#888',
    fontSize: 16,
    marginBottom: 16,
  },
  prematchEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  prematchText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  prematchPosters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  prematchPoster: {
    width: 60,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
  },
  prematchPosterImage: {
    width: '100%',
    height: '100%',
  },
  prematchPosterPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prematchSubtext: {
    color: '#888',
    fontSize: 14,
    marginBottom: 32,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e50914',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Completion styles
  doneTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  doneSubtitle: {
    color: '#888',
    fontSize: 16,
    marginBottom: 32,
  },
  completionList: {
    gap: 12,
  },
  completionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 200,
  },
  completionName: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },

  // Reveal styles
  revealContent: {
    padding: 24,
    paddingBottom: 48,
  },
  revealHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  revealEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  revealTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  revealSubtitle: {
    color: '#888',
    fontSize: 16,
  },
  matchSection: {
    marginBottom: 24,
  },
  matchSectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  matchCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  matchCardSelected: {
    borderWidth: 2,
    borderColor: '#e50914',
  },
  matchPoster: {
    width: 70,
    height: 105,
  },
  matchInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  matchTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  matchMeta: {
    color: '#888',
    fontSize: 14,
  },
  matchRating: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e50914',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    alignSelf: 'center',
  },
  homeButton: {
    backgroundColor: '#333',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

**Step 2: Update SwipeDeck to accept initialIndex**

Modify `components/SwipeDeck.tsx` to accept an optional `initialIndex` prop:

In the props interface, add:
```typescript
initialIndex?: number;
```

In the component, initialize currentIndex with:
```typescript
const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
```

**Step 3: Test manually**

This requires the backend to be running. Test:
- Create session from home
- Lobby shows code and participants
- Join session with code from another device/browser
- Host can start session
- Swiping works
- Completion waiting screen shows
- Reveal shows matches

**Step 4: Commit**

```bash
cd /Users/diyagamah/Documents/cinematch-mobile/.worktrees/group-sessions
git add app/session/[id].tsx components/SwipeDeck.tsx
git commit -m "feat: add multi-phase session screen (lobby, pre-matches, swiping, reveal)"
```

---

## Task 5: Add Backend Pre-matches Endpoint (if needed)

**Note:** Check if `/api/sessions/[id]/prematches` exists in the backend. If not, create it:

**Files (in cinematch web repo):**
- Create: `/Users/diyagamah/Documents/cinematch/app/api/sessions/[id]/prematches/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  // Get all participants in this session
  const gameSession = await prisma.session.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!gameSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const participantUserIds = gameSession.participants.map((p) => p.userId);

  // Find movies that are on ALL participants' watchlists
  const watchlistItems = await prisma.watchlistItem.findMany({
    where: {
      userId: { in: participantUserIds },
    },
    include: {
      movie: true,
    },
  });

  // Group by movieId and count
  const movieCounts: Record<number, { count: number; movie: any }> = {};
  for (const item of watchlistItems) {
    if (!movieCounts[item.movieId]) {
      movieCounts[item.movieId] = { count: 0, movie: item.movie };
    }
    movieCounts[item.movieId].count++;
  }

  // Filter to movies on ALL participants' lists
  const commonMovies = Object.values(movieCounts)
    .filter((m) => m.count === participantUserIds.length)
    .map((m) => m.movie);

  return NextResponse.json({ movies: commonMovies });
}
```

---

## Task 6: Run Full Test Suite

**Step 1: Run all tests**

```bash
cd /Users/diyagamah/Documents/cinematch-mobile/.worktrees/group-sessions
npm test
```

Expected: All tests pass

**Step 2: Run Maestro E2E tests (optional)**

If you have the backend running and simulators set up:
```bash
maestro test .maestro/
```

---

## Task 7: Final Commit and Summary

**Step 1: Ensure all changes committed**

```bash
cd /Users/diyagamah/Documents/cinematch-mobile/.worktrees/group-sessions
git status
git log --oneline -10
```

**Step 2: Create summary commit if needed**

If there are uncommitted changes:
```bash
git add .
git commit -m "chore: final cleanup for group sessions feature"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Session API methods | `lib/api.ts`, `__tests__/lib/sessions-api.test.ts` |
| 2 | Home screen redesign | `app/(tabs)/index.tsx` |
| 3 | Session creation screen | `app/session/create.tsx`, `app/session/_layout.tsx` |
| 4 | Multi-phase session screen | `app/session/[id].tsx` |
| 5 | Backend pre-matches endpoint | `api/sessions/[id]/prematches/route.ts` (web repo) |
| 6 | Test suite | Run `npm test` |
| 7 | Final commit | Cleanup |
