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

  const copyCode = () => {
    if (session?.code) {
      // Show the code in an alert for easy copying
      Alert.alert('Session Code', session.code, [{ text: 'OK' }]);
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
        <ActivityIndicator size="large" color="#00b894" />
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
                  {movie.year} {movie.genres?.slice(0, 2).join(', ') ? `• ${movie.genres.slice(0, 2).join(', ')}` : ''}
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
                  {movie.year} {movie.genres?.slice(0, 2).join(', ') ? `• ${movie.genres.slice(0, 2).join(', ')}` : ''}
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
    backgroundColor: '#0a0a0a',
  },
  centered: {
    flex: 1,
    backgroundColor: '#0a0a0a',
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
    backgroundColor: '#141414',
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
    backgroundColor: '#141414',
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
    backgroundColor: '#00b894',
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
    backgroundColor: '#00b894',
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
    backgroundColor: '#00b894',
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
    backgroundColor: '#141414',
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
    backgroundColor: '#141414',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  matchCardSelected: {
    borderWidth: 2,
    borderColor: '#00b894',
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
    backgroundColor: '#00b894',
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
