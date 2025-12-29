import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { Movie } from '../../types';

interface WatchlistItem {
  id: string;
  movieId: number;
  addedAt: string;
  movie?: Movie;
}

interface DismissedItem {
  id: string;
  movieId: number;
  dismissedAt: string;
  movie?: Movie;
}

type Tab = 'saved' | 'dismissed';

export default function MyListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('saved');

  const { data: watchlistData, isLoading: watchlistLoading } = useQuery({
    queryKey: ['myList'],
    queryFn: api.getMyList,
  });

  const { data: dismissedData, isLoading: dismissedLoading } = useQuery({
    queryKey: ['dismissed'],
    queryFn: api.getDismissed,
  });

  const removeFromListMutation = useMutation({
    mutationFn: (movieId: number) => api.removeFromList(movieId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myList'] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (movieId: number) => api.restoreFromDismissed(movieId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myList'] });
      queryClient.invalidateQueries({ queryKey: ['dismissed'] });
    },
  });

  const removeFromDismissedMutation = useMutation({
    mutationFn: (movieId: number) => api.undoDismiss(movieId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dismissed'] });
    },
  });

  const handleRemoveFromList = (movieId: number, title: string) => {
    Alert.alert(
      'Remove Movie',
      `Remove "${title}" from your list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFromListMutation.mutate(movieId),
        },
      ]
    );
  };

  const handleRestore = (movieId: number) => {
    restoreMutation.mutate(movieId);
  };

  const handleRemoveFromDismissed = (movieId: number) => {
    removeFromDismissedMutation.mutate(movieId);
  };

  const watchlist = watchlistData?.watchlist || [];
  const dismissed = dismissedData?.dismissed || [];

  const isLoading = activeTab === 'saved' ? watchlistLoading : dismissedLoading;
  const currentList = activeTab === 'saved' ? watchlist : dismissed;

  const renderSavedItem = ({ item }: { item: WatchlistItem }) => {
    const movie = item.movie;
    if (!movie) return null;

    const posterUrl = movie.posterUrl;
    const year = movie.year || 'N/A';
    const rating = movie.imdbRating || (movie.vote_average ? movie.vote_average.toFixed(1) : null);

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
            {movie.title}
          </Text>
          <Text style={styles.movieMeta}>
            {year}{rating ? ` • ⭐ ${rating}` : ''}
          </Text>
          {movie.rtCriticScore && (
            <Text style={styles.rtScore}>🍅 {movie.rtCriticScore}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleRemoveFromList(item.movieId, movie.title)}
        >
          <Ionicons name="trash-outline" size={20} color="#f87171" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderDismissedItem = ({ item }: { item: DismissedItem }) => {
    const movie = item.movie;
    if (!movie) return null;

    const posterUrl = movie.posterUrl;
    const year = movie.year || 'N/A';
    const rating = movie.imdbRating || (movie.vote_average ? movie.vote_average.toFixed(1) : null);

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
            {movie.title}
          </Text>
          <Text style={styles.movieMeta}>
            {year}{rating ? ` • ⭐ ${rating}` : ''}
          </Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.restoreButton]}
            onPress={() => handleRestore(item.movieId)}
          >
            <Ionicons name="refresh" size={18} color="#4ade80" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRemoveFromDismissed(item.movieId)}
          >
            <Ionicons name="trash-outline" size={18} color="#f87171" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My List</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
          onPress={() => setActiveTab('saved')}
        >
          <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>
            Saved ({watchlist.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dismissed' && styles.activeTab]}
          onPress={() => setActiveTab('dismissed')}
        >
          <Text style={[styles.tabText, activeTab === 'dismissed' && styles.activeTabText]}>
            Dismissed ({dismissed.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e50914" />
        </View>
      ) : currentList.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            {activeTab === 'saved' ? 'No movies saved yet' : 'No dismissed movies'}
          </Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'saved'
              ? 'Start swiping to add movies to your list!'
              : 'Movies you swipe left on will appear here'}
          </Text>
          {activeTab === 'saved' && (
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => router.push('/(tabs)/solo')}
            >
              <Text style={styles.startButtonText}>Start Swiping</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : activeTab === 'saved' ? (
        <FlatList
          data={watchlist}
          renderItem={renderSavedItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList
          data={dismissed}
          renderItem={renderDismissedItem}
          keyExtractor={(item) => item.id}
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
  tabs: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
  },
  activeTab: {
    backgroundColor: '#e50914',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    textAlign: 'center',
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#e50914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '600',
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
  rtScore: {
    fontSize: 12,
    color: '#f87171',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    gap: 4,
  },
  actionButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreButton: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderRadius: 8,
  },
});
