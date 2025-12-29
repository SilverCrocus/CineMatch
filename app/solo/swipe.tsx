import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import SwipeDeck from '../../components/SwipeDeck';
import { api, MovieFilterParams } from '../../lib/api';
import { Movie } from '../../types';

export default function SwipeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    source?: string;
    genres?: string;
    match?: string;
    yearFrom?: string;
    yearTo?: string;
    movie?: string;
  }>();

  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [lastDismissed, setLastDismissed] = useState<Movie | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastOpacity = useSharedValue(0);

  // Build filter params from URL
  const filterParams: MovieFilterParams = {
    source: (params.source as MovieFilterParams['source']) || 'random',
    genres: params.genres,
    match: params.match as MovieFilterParams['match'],
    yearFrom: params.yearFrom ? parseInt(params.yearFrom) : undefined,
    yearTo: params.yearTo ? parseInt(params.yearTo) : undefined,
    movie: params.movie,
  };

  const { isLoading, error, refetch, data } = useQuery({
    queryKey: ['movies', filterParams],
    queryFn: () => api.getMovies(filterParams),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Update allMovies when data changes
  useEffect(() => {
    if (data?.movies) {
      setAllMovies((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMovies = data.movies.filter((m: Movie) => !existingIds.has(m.id));
        if (newMovies.length === 0) return prev;
        return [...prev, ...newMovies];
      });
    }
  }, [data]);

  const likeMutation = useMutation({
    mutationFn: (movieId: number) => api.likeMovie(movieId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myList'] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (movieId: number) => api.dismissMovie(movieId),
  });

  const undoDismissMutation = useMutation({
    mutationFn: (movieId: number) => api.undoDismiss(movieId),
  });

  const currentMovies = allMovies.slice(currentIndex);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const showToast = useCallback(() => {
    setShowUndoToast(true);
    toastOpacity.value = withTiming(1, { duration: 200 });

    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    undoTimeoutRef.current = setTimeout(() => {
      hideToast();
    }, 3000);
  }, []);

  const hideToast = useCallback(() => {
    toastOpacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => {
      setShowUndoToast(false);
      setLastDismissed(null);
    }, 200);
  }, []);

  const handleUndo = useCallback(async () => {
    if (!lastDismissed) return;

    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    try {
      await undoDismissMutation.mutateAsync(lastDismissed.tmdbId || lastDismissed.id);
    } catch (e) {
      // Ignore error, still restore locally
    }

    setCurrentIndex((prev) => Math.max(0, prev - 1));
    hideToast();
  }, [lastDismissed, hideToast]);

  const handleSwipeRight = useCallback((movie: Movie) => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    setShowUndoToast(false);
    setLastDismissed(null);

    likeMutation.mutate(movie.tmdbId || movie.id);
    setSavedCount((prev) => prev + 1);
    setCurrentIndex((prev) => prev + 1);

    if (currentMovies.length < 5) {
      refetch();
    }
  }, [currentMovies.length, refetch]);

  const handleSwipeLeft = useCallback((movie: Movie) => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    dismissMutation.mutate(movie.tmdbId || movie.id);
    setLastDismissed(movie);
    setCurrentIndex((prev) => prev + 1);
    showToast();

    if (currentMovies.length < 5) {
      refetch();
    }
  }, [currentMovies.length, refetch, showToast]);

  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
    transform: [
      {
        translateY: withTiming(showUndoToast ? 0 : 50, { duration: 200 }),
      },
    ],
  }));

  // Get title based on source
  const getTitle = () => {
    switch (params.source) {
      case 'similar':
        return `Similar to "${params.movie}"`;
      case 'browse':
        return 'Browse Movies';
      default:
        return 'Surprise Me';
    }
  };

  if ((isLoading || !data) && allMovies.length === 0) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#00b894" />
        <Text style={styles.loadingText}>Loading movies...</Text>
      </View>
    );
  }

  if (error && allMovies.length === 0) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Failed to load movies</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isDone = currentMovies.length === 0;

  if (isDone) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.doneTitle}>All done!</Text>
        <Text style={styles.doneSubtitle}>
          You saved {savedCount} movies to your list
        </Text>
        <View style={styles.doneButtons}>
          <TouchableOpacity
            style={[styles.doneButton, styles.secondaryButton]}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryButtonText}>Browse more</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.doneButton, styles.primaryButton]}
            onPress={() => router.push('/solo/list')}
          >
            <Text style={styles.primaryButtonText}>View my list</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{getTitle()}</Text>
        <Text style={styles.savedCount}>{savedCount} saved</Text>
      </View>

      {/* Swipe Deck */}
      <View style={styles.deckContainer}>
        <SwipeDeck
          movies={currentMovies}
          onSwipeRight={handleSwipeRight}
          onSwipeLeft={handleSwipeLeft}
        />
      </View>

      {/* Action buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, styles.dismissButton]}
          onPress={() => currentMovies[0] && handleSwipeLeft(currentMovies[0])}
        >
          <Ionicons name="close" size={32} color="#f87171" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.likeButton]}
          onPress={() => currentMovies[0] && handleSwipeRight(currentMovies[0])}
        >
          <Ionicons name="heart" size={32} color="#4ade80" />
        </TouchableOpacity>
      </View>

      {/* Progress counter */}
      <Text style={styles.progress}>
        {currentIndex + 1} / {allMovies.length}
      </Text>

      {/* Undo Toast */}
      {showUndoToast && (
        <Animated.View style={[styles.undoToast, toastStyle]}>
          <Text style={styles.undoText}>Dismissed</Text>
          <TouchableOpacity onPress={handleUndo}>
            <Text style={styles.undoButtonText}>Undo</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
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
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#00b894',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  doneTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  doneSubtitle: {
    color: '#888',
    fontSize: 16,
    marginBottom: 24,
  },
  doneButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  doneButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryButton: {
    backgroundColor: '#333',
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#00b894',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  savedCount: {
    color: '#888',
    fontSize: 14,
  },
  deckContainer: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 16,
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
  progress: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    paddingBottom: 16,
  },
  undoToast: {
    position: 'absolute',
    bottom: 120,
    left: '50%',
    transform: [{ translateX: -80 }],
    backgroundColor: '#27272a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  undoText: {
    color: '#fff',
    fontSize: 14,
  },
  undoButtonText: {
    color: '#00b894',
    fontSize: 14,
    fontWeight: '600',
  },
});
