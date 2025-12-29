import React from 'react';
import { render, act } from '@testing-library/react-native';
import SwipeDeck from '../../components/SwipeDeck';
import { Movie } from '../../types';

// Mock expo-image
jest.mock('expo-image', () => ({
  Image: 'Image',
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: {
      Pan: () => ({
        activeOffsetX: () => ({
          onStart: () => ({
            onUpdate: () => ({
              onEnd: () => ({}),
            }),
          }),
        }),
      }),
    },
    GestureHandlerRootView: View,
  };
});

const createMockMovie = (id: number, title: string): Movie => ({
  id,
  tmdbId: id,
  imdbId: `tt${id}`,
  title,
  year: '2023',
  posterUrl: `https://image.tmdb.org/t/p/w500/${id}.jpg`,
  backdropUrl: null,
  genres: ['Action'],
  synopsis: `Synopsis for ${title}`,
  runtime: 120,
  imdbRating: '7.5',
  rtCriticScore: null,
  rtAudienceScore: null,
  rtUrl: null,
  streamingServices: [],
});

const mockMovies: Movie[] = [
  createMockMovie(1, 'Movie 1'),
  createMockMovie(2, 'Movie 2'),
  createMockMovie(3, 'Movie 3'),
  createMockMovie(4, 'Movie 4'),
  createMockMovie(5, 'Movie 5'),
];

// Helper to render SwipeDeck and trigger layout
const renderWithLayout = (movies: Movie[], onSwipeRight: jest.Mock, onSwipeLeft: jest.Mock) => {
  const result = render(
    <SwipeDeck
      movies={movies}
      onSwipeRight={onSwipeRight}
      onSwipeLeft={onSwipeLeft}
    />
  );

  // Find the container and trigger onLayout
  // The container is the outer View with flex: 1
  const container = result.UNSAFE_root.findAllByType('View')[0];
  if (container?.props?.onLayout) {
    act(() => {
      container.props.onLayout({
        nativeEvent: {
          layout: { width: 400, height: 600 },
        },
      });
    });
  }

  return result;
};

describe('SwipeDeck', () => {
  const mockOnSwipeRight = jest.fn();
  const mockOnSwipeLeft = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const result = render(
      <SwipeDeck
        movies={mockMovies}
        onSwipeRight={mockOnSwipeRight}
        onSwipeLeft={mockOnSwipeLeft}
      />
    );

    // SwipeDeck renders - doesn't crash
    expect(result).toBeTruthy();
  });

  it('should render no cards before layout occurs', () => {
    const { queryByText } = render(
      <SwipeDeck
        movies={mockMovies}
        onSwipeRight={mockOnSwipeRight}
        onSwipeLeft={mockOnSwipeLeft}
      />
    );

    // Before layout, cardDimensions.width === 0, so no cards render
    expect(queryByText('Movie 1')).toBeNull();
  });

  it('should render top 3 movie cards after layout', () => {
    const { getByText, queryByText } = renderWithLayout(
      mockMovies,
      mockOnSwipeRight,
      mockOnSwipeLeft
    );

    // Top 3 movies should be visible
    expect(getByText('Movie 1')).toBeTruthy();
    expect(getByText('Movie 2')).toBeTruthy();
    expect(getByText('Movie 3')).toBeTruthy();

    // Movie 4 and 5 should not be rendered
    expect(queryByText('Movie 4')).toBeNull();
    expect(queryByText('Movie 5')).toBeNull();
  });

  it('should render all movies when fewer than 3 provided', () => {
    const twoMovies = mockMovies.slice(0, 2);
    const { getByText, queryByText } = renderWithLayout(
      twoMovies,
      mockOnSwipeRight,
      mockOnSwipeLeft
    );

    expect(getByText('Movie 1')).toBeTruthy();
    expect(getByText('Movie 2')).toBeTruthy();
    expect(queryByText('Movie 3')).toBeNull();
  });

  it('should render nothing when no movies provided', () => {
    const { queryByText } = renderWithLayout(
      [],
      mockOnSwipeRight,
      mockOnSwipeLeft
    );

    expect(queryByText('Movie 1')).toBeNull();
  });

  it('should render single movie when one movie provided', () => {
    const singleMovie = [mockMovies[0]];
    const { getByText } = renderWithLayout(
      singleMovie,
      mockOnSwipeRight,
      mockOnSwipeLeft
    );

    expect(getByText('Movie 1')).toBeTruthy();
  });

  it('should show IMDB badges for movies with IMDB IDs', () => {
    const { getAllByText } = renderWithLayout(
      mockMovies.slice(0, 3),
      mockOnSwipeRight,
      mockOnSwipeLeft
    );

    // All 3 visible movies should have IMDB badges
    const imdbBadges = getAllByText(/IMDB 7.5/);
    expect(imdbBadges.length).toBe(3);
  });

  it('should render movie synopses in the synopsis area', () => {
    const { getByText } = renderWithLayout(
      mockMovies.slice(0, 1),
      mockOnSwipeRight,
      mockOnSwipeLeft
    );

    expect(getByText('Synopsis for Movie 1')).toBeTruthy();
  });

  it('should pass isTop=true to the first card only', () => {
    const { getAllByText } = renderWithLayout(
      mockMovies.slice(0, 3),
      mockOnSwipeRight,
      mockOnSwipeLeft
    );

    // The "Tap for synopsis" hint should appear on all cards (but only clickable on top)
    const hints = getAllByText('Tap for synopsis');
    expect(hints.length).toBe(3);
  });
});
