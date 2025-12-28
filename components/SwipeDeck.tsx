import { View, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
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
