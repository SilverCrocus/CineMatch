import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (width - 32 - CARD_GAP) / 2; // 2 columns with padding
const CARD_HEIGHT = CARD_WIDTH * 1.5; // 2:3 aspect ratio

function getIMDbUrl(imdbId: string): string {
  return `https://www.imdb.com/title/${imdbId}`;
}

export default function MyListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    Alert.alert('Remove Movie', `Remove "${title}" from your list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeFromListMutation.mutate(movieId),
      },
    ]);
  };

  const handleRestore = (movieId: number) => {
    restoreMutation.mutate(movieId);
  };

  const handleRemoveFromDismissed = (movieId: number) => {
    removeFromDismissedMutation.mutate(movieId);
  };

  const handleOpenIMDb = (imdbId: string | null) => {
    if (imdbId) {
      Linking.openURL(getIMDbUrl(imdbId));
    }
  };

  const watchlist = watchlistData?.watchlist || [];
  const dismissed = dismissedData?.dismissed || [];

  const isLoading = activeTab === 'saved' ? watchlistLoading : dismissedLoading;
  const currentList = activeTab === 'saved' ? watchlist : dismissed;

  const renderGridItem = ({
    item,
    index,
  }: {
    item: WatchlistItem | DismissedItem;
    index: number;
  }) => {
    const movie = item.movie;
    if (!movie) return null;

    const isLeftColumn = index % 2 === 0;

    return (
      <TouchableOpacity
        style={[
          styles.gridCard,
          isLeftColumn ? styles.gridCardLeft : styles.gridCardRight,
        ]}
        onPress={() => handleOpenIMDb(movie.imdbId)}
        activeOpacity={movie.imdbId ? 0.8 : 1}
      >
        {/* Poster */}
        {movie.posterUrl ? (
          <Image source={{ uri: movie.posterUrl }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.noPoster]}>
            <Ionicons name="film" size={32} color="#666" />
          </View>
        )}

        {/* Gradient Overlay */}
        <View style={styles.gradientOverlay} />

        {/* IMDB Link Indicator */}
        {movie.imdbId && (
          <View style={styles.externalLinkBadge}>
            <Ionicons name="open-outline" size={12} color="#fff" />
          </View>
        )}

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.movieTitle} numberOfLines={2}>
            {movie.title}
          </Text>
          <Text style={styles.movieYear}>{movie.year}</Text>

          {/* Ratings */}
          <View style={styles.ratingsRow}>
            {movie.imdbRating && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>⭐ {movie.imdbRating}</Text>
              </View>
            )}
            {movie.rtCriticScore && (
              <View style={[styles.ratingBadge, styles.rtBadge]}>
                <Text style={styles.ratingText}>🍅 {movie.rtCriticScore}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {activeTab === 'saved' ? (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveFromList(item.movieId, movie.title)}
              >
                <Ionicons name="trash-outline" size={14} color="#f87171" />
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.restoreButton}
                  onPress={() => handleRestore(item.movieId)}
                >
                  <Ionicons name="refresh" size={14} color="#4ade80" />
                  <Text style={styles.restoreButtonText}>Restore</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleRemoveFromDismissed(item.movieId)}
                >
                  <Ionicons name="trash-outline" size={14} color="#f87171" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
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
          <Text
            style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}
          >
            Saved ({watchlist.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dismissed' && styles.activeTab]}
          onPress={() => setActiveTab('dismissed')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'dismissed' && styles.activeTabText,
            ]}
          >
            Dismissed ({dismissed.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00b894" />
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
      ) : (
        <FlatList
          data={currentList}
          renderItem={renderGridItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#141414',
  },
  activeTab: {
    backgroundColor: '#00b894',
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
    backgroundColor: '#00b894',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  gridContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  gridCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: CARD_GAP,
    backgroundColor: '#141414',
  },
  gridCardLeft: {
    marginRight: CARD_GAP / 2,
  },
  gridCardRight: {
    marginLeft: CARD_GAP / 2,
  },
  poster: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  noPoster: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    backgroundColor: 'transparent',
    // Using a simpler approach since LinearGradient needs expo-linear-gradient
    // We'll simulate with a semi-transparent overlay
    backgroundGradient: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
  },
  externalLinkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 6,
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  movieTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  movieYear: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginBottom: 6,
  },
  ratingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  ratingBadge: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rtBadge: {},
  ratingText: {
    color: '#fff',
    fontSize: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  removeButtonText: {
    color: '#f87171',
    fontSize: 11,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  restoreButtonText: {
    color: '#4ade80',
    fontSize: 11,
  },
  deleteButton: {
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});
