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
