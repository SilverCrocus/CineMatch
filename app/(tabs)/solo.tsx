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
