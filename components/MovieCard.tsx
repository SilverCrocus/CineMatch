import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Movie } from '../types';
import { useState, useEffect } from 'react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MovieCardProps {
  movie: Movie;
  index: number;
  totalCards: number;
  translateX: SharedValue<number>;
  isTop: boolean;
}

// Build Rotten Tomatoes search URL as fallback
function buildRTSearchUrl(title: string): string {
  return `https://www.rottentomatoes.com/search?search=${encodeURIComponent(title)}`;
}

// Get the best RT URL
function getRTUrl(movie: Movie): string {
  return movie.rtUrl || buildRTSearchUrl(movie.title);
}

// Get poster URL - handle both new and legacy formats
function getPosterUrl(movie: Movie): string | null {
  if (movie.posterUrl) return movie.posterUrl;
  if (movie.poster_path) return `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
  return null;
}

// Get year - handle both new and legacy formats
function getYear(movie: Movie): string {
  if (movie.year) return String(movie.year);
  if (movie.release_date) return movie.release_date.split('-')[0];
  return 'N/A';
}

// Get synopsis - handle both new and legacy formats
function getSynopsis(movie: Movie): string {
  return movie.synopsis || movie.overview || 'No synopsis available.';
}

export default function MovieCard({
  movie,
  index,
  totalCards,
  translateX,
  isTop,
}: MovieCardProps) {
  const [expanded, setExpanded] = useState(false);
  const expandedAnim = useSharedValue(0);

  const posterUrl = getPosterUrl(movie);
  const year = getYear(movie);
  const synopsis = getSynopsis(movie);

  // Reset expanded when movie changes or card is not on top
  useEffect(() => {
    if (!isTop) {
      setExpanded(false);
      expandedAnim.value = withTiming(0, { duration: 200 });
    }
  }, [isTop, movie.id]);

  const handleCardTap = () => {
    if (!isTop) return;
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    expandedAnim.value = withTiming(newExpanded ? 1 : 0, { duration: 300 });
  };

  const handleLinkPress = (url: string) => {
    Linking.openURL(url);
  };

  // Card styling is now handled by SwipeDeck - this is just for the card's internal content

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

  const hintOpacity = useAnimatedStyle(() => {
    return {
      opacity: withTiming(expanded ? 0 : 1, { duration: 200 }),
    };
  });

  const synopsisStyle = useAnimatedStyle(() => {
    return {
      opacity: expandedAnim.value,
      maxHeight: interpolate(expandedAnim.value, [0, 1], [0, 150]),
    };
  });

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handleCardTap}
        style={styles.cardTouchable}
      >
        {/* Poster */}
        {posterUrl ? (
          <Image
            source={posterUrl}
            style={styles.poster}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.poster, styles.noPoster]}>
            <Text style={styles.noPosterText}>No Image</Text>
          </View>
        )}

        {/* Gradient Overlay */}
        <LinearGradient
          colors={
            expanded
              ? ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']
              : ['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']
          }
          locations={expanded ? [0, 1] : [0, 0.5, 1]}
          style={styles.gradient}
        />

        {/* Tap for synopsis hint */}
        <Animated.View style={[styles.hintContainer, hintOpacity]}>
          <View style={styles.hintPill}>
            <Text style={styles.hintText}>Tap for synopsis</Text>
          </View>
        </Animated.View>

        {/* Content */}
        <View style={styles.content}>
          {/* Synopsis - shown when expanded */}
          <Animated.View style={[styles.synopsisContainer, synopsisStyle]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.synopsisText}>{synopsis}</Text>
            </ScrollView>
          </Animated.View>

          {/* Title & Meta */}
          <Text style={styles.title} numberOfLines={2}>
            {movie.title}
          </Text>
          <Text style={styles.meta}>
            {year}
            {movie.runtime ? ` • ${movie.runtime} min` : ''}
            {movie.genres?.length > 0 ? ` • ${movie.genres.slice(0, 2).join(', ')}` : ''}
          </Text>

          {/* Score Badges */}
          <View style={styles.badges}>
            {/* IMDB Badge */}
            {movie.imdbId && (
              <TouchableOpacity
                style={[styles.badge, styles.imdbBadge]}
                onPress={() => handleLinkPress(`https://www.imdb.com/title/${movie.imdbId}`)}
              >
                <Text style={styles.imdbText}>
                  IMDB {movie.imdbRating || ''}
                </Text>
              </TouchableOpacity>
            )}

            {/* RT Critic Score */}
            {movie.rtCriticScore && (
              <TouchableOpacity
                style={[styles.badge, styles.rtCriticBadge]}
                onPress={() => handleLinkPress(getRTUrl(movie))}
              >
                <Text style={styles.rtCriticText}>🍅 {movie.rtCriticScore}</Text>
              </TouchableOpacity>
            )}

            {/* RT Audience Score */}
            {movie.rtAudienceScore && (
              <TouchableOpacity
                style={[styles.badge, styles.rtAudienceBadge]}
                onPress={() => handleLinkPress(getRTUrl(movie))}
              >
                <Text style={styles.rtAudienceText}>🍿 {movie.rtAudienceScore}</Text>
              </TouchableOpacity>
            )}

            {/* Fallback: Show TMDB rating if no other scores */}
            {!movie.imdbId && !movie.rtCriticScore && movie.vote_average !== undefined && (
              <View style={[styles.badge, styles.tmdbBadge]}>
                <Text style={styles.tmdbText}>⭐ {movie.vote_average.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Like/Nope indicators */}
      <Animated.View style={[styles.indicator, styles.likeIndicator, likeOpacity]}>
        <Text style={styles.indicatorText}>LIKE</Text>
      </Animated.View>
      <Animated.View style={[styles.indicator, styles.nopeIndicator, nopeOpacity]}>
        <Text style={styles.indicatorText}>NOPE</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  cardTouchable: {
    flex: 1,
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
  noPosterText: {
    color: '#666',
    fontSize: 16,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  hintContainer: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  hintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  synopsisContainer: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  synopsisText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imdbBadge: {
    backgroundColor: 'rgba(234,179,8,0.2)',
  },
  imdbText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  rtCriticBadge: {
    backgroundColor: 'rgba(239,68,68,0.2)',
  },
  rtCriticText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  rtAudienceBadge: {
    backgroundColor: 'rgba(249,115,22,0.2)',
  },
  rtAudienceText: {
    color: '#fb923c',
    fontSize: 12,
    fontWeight: '600',
  },
  tmdbBadge: {
    backgroundColor: 'rgba(234,179,8,0.2)',
  },
  tmdbText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    top: 50,
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
