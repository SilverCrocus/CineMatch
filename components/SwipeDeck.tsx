import { View, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { useState } from 'react';
import MovieCard from './MovieCard';
import { Movie } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface SwipeDeckProps {
  movies: Movie[];
  onSwipeRight: (movie: Movie) => void;
  onSwipeLeft: (movie: Movie) => void;
  onComplete?: () => void;
}

export default function SwipeDeck({
  movies,
  onSwipeRight,
  onSwipeLeft,
  onComplete,
}: SwipeDeckProps) {
  // No internal index - parent manages the index by slicing the movies array
  // movies[0] is always the top card
  const translateX = useSharedValue(0);
  const isAnimating = useSharedValue(false);
  const [cardDimensions, setCardDimensions] = useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    // Calculate card size to fit within container with padding
    const padding = 20;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;

    // Use 90% of available width, and height that maintains aspect ratio or fits
    const cardWidth = availableWidth * 0.95;
    const idealHeight = cardWidth * 1.5; // Poster aspect ratio
    const cardHeight = Math.min(idealHeight, availableHeight * 0.95);

    setCardDimensions({ width: cardWidth, height: cardHeight });
  };

  const handleSwipeComplete = (direction: 'left' | 'right') => {
    // Top card is always movies[0] since parent slices the array
    const movie = movies[0];
    if (!movie) return;

    if (direction === 'right') {
      onSwipeRight(movie);
    } else {
      onSwipeLeft(movie);
    }

    // Parent will update the movies array, which triggers re-render
    // If no more movies, parent handles the completion state
    if (movies.length <= 1) {
      onComplete?.();
    }
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) // Require 10px movement before activating
    .onStart(() => {
      isAnimating.value = false;
    })
    .onUpdate((event) => {
      if (!isAnimating.value) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (isAnimating.value) return;

      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - like
        isAnimating.value = true;
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 }, () => {
          runOnJS(handleSwipeComplete)('right');
          translateX.value = 0;
          isAnimating.value = false;
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - dismiss
        isAnimating.value = true;
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 }, () => {
          runOnJS(handleSwipeComplete)('left');
          translateX.value = 0;
          isAnimating.value = false;
        });
      } else {
        // Return to center
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
    });

  // Show top 3 cards - movies[0] is always the top card (parent manages index)
  const visibleMovies = movies.slice(0, 3);

  // Animated style for the top card
  const topCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-15, 0, 15]
    );
    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Only render cards once we have dimensions */}
      {cardDimensions.width > 0 && visibleMovies.slice().reverse().map((movie, reverseIndex) => {
        const index = visibleMovies.length - 1 - reverseIndex;
        const isTop = index === 0;

        const cardWrapperStyle = {
          width: cardDimensions.width,
          height: cardDimensions.height,
        };

        if (isTop) {
          return (
            <GestureDetector key={movie.id} gesture={panGesture}>
              <Animated.View style={[styles.cardWrapper, cardWrapperStyle, { zIndex: 10 }, topCardStyle]}>
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

        // Background cards - stacked behind
        const stackOffset = index * 8;
        const stackScale = 1 - index * 0.05;

        return (
          <View
            key={movie.id}
            style={[
              styles.cardWrapper,
              cardWrapperStyle,
              {
                zIndex: 10 - index,
                transform: [
                  { translateY: -stackOffset },
                  { scale: stackScale },
                ],
              },
            ]}
          >
            <MovieCard
              movie={movie}
              index={index}
              totalCards={visibleMovies.length}
              translateX={translateX}
              isTop={false}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    position: 'absolute',
  },
});
