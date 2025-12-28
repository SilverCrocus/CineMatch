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
