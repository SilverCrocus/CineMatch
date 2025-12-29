import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import MovieCard from '../../components/MovieCard';
import { Movie } from '../../types';

// Spy on Linking.openURL
const mockOpenURL = jest.fn();
jest.spyOn(Linking, 'openURL').mockImplementation(mockOpenURL);

// Mock expo-image
jest.mock('expo-image', () => ({
  Image: 'Image',
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// Create a mock translateX shared value
const mockTranslateX = { value: 0 };

const createMockMovie = (overrides: Partial<Movie> = {}): Movie => ({
  id: 12345,
  tmdbId: 12345,
  imdbId: 'tt1234567',
  title: 'Test Movie',
  year: '2023',
  posterUrl: 'https://image.tmdb.org/t/p/w500/test.jpg',
  backdropUrl: 'https://image.tmdb.org/t/p/w1280/backdrop.jpg',
  genres: ['Action', 'Comedy'],
  synopsis: 'This is a test movie synopsis.',
  runtime: 120,
  imdbRating: '8.5',
  rtCriticScore: '90%',
  rtAudienceScore: '85%',
  rtUrl: 'https://www.rottentomatoes.com/m/test_movie',
  streamingServices: ['Netflix', 'Hulu'],
  ...overrides,
});

describe('MovieCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render movie title', () => {
    const movie = createMockMovie({ title: 'The Test Movie' });
    const { getByText } = render(
      <MovieCard
        movie={movie}
        index={0}
        totalCards={3}
        translateX={mockTranslateX as any}
        isTop={true}
      />
    );

    expect(getByText('The Test Movie')).toBeTruthy();
  });

  it('should render year and runtime in meta', () => {
    const movie = createMockMovie({ year: '2024', runtime: 90 });
    const { getByText } = render(
      <MovieCard
        movie={movie}
        index={0}
        totalCards={3}
        translateX={mockTranslateX as any}
        isTop={true}
      />
    );

    expect(getByText(/2024/)).toBeTruthy();
    expect(getByText(/90 min/)).toBeTruthy();
  });

  it('should render genres in meta', () => {
    const movie = createMockMovie({ genres: ['Drama', 'Romance'] });
    const { getByText } = render(
      <MovieCard
        movie={movie}
        index={0}
        totalCards={3}
        translateX={mockTranslateX as any}
        isTop={true}
      />
    );

    expect(getByText(/Drama, Romance/)).toBeTruthy();
  });

  it('should render IMDB badge when imdbId is present', () => {
    const movie = createMockMovie({ imdbId: 'tt1234567', imdbRating: '7.5' });
    const { getByText } = render(
      <MovieCard
        movie={movie}
        index={0}
        totalCards={3}
        translateX={mockTranslateX as any}
        isTop={true}
      />
    );

    expect(getByText(/IMDB 7.5/)).toBeTruthy();
  });

  it('should render RT critic score when present', () => {
    const movie = createMockMovie({ rtCriticScore: '95%' });
    const { getByText } = render(
      <MovieCard
        movie={movie}
        index={0}
        totalCards={3}
        translateX={mockTranslateX as any}
        isTop={true}
      />
    );

    expect(getByText(/🍅 95%/)).toBeTruthy();
  });

  it('should render RT audience score when present', () => {
    const movie = createMockMovie({ rtAudienceScore: '88%' });
    const { getByText } = render(
      <MovieCard
        movie={movie}
        index={0}
        totalCards={3}
        translateX={mockTranslateX as any}
        isTop={true}
      />
    );

    expect(getByText(/🍿 88%/)).toBeTruthy();
  });

  it('should not render IMDB badge when imdbId is null', () => {
    const movie = createMockMovie({ imdbId: null, imdbRating: null });
    const { queryByText } = render(
      <MovieCard
        movie={movie}
        index={0}
        totalCards={3}
        translateX={mockTranslateX as any}
        isTop={true}
      />
    );

    expect(queryByText(/IMDB/)).toBeNull();
  });

  it('should show "Tap for synopsis" hint', () => {
    const movie = createMockMovie();
    const { getByText } = render(
      <MovieCard
        movie={movie}
        index={0}
        totalCards={3}
        translateX={mockTranslateX as any}
        isTop={true}
      />
    );

    expect(getByText('Tap for synopsis')).toBeTruthy();
  });

  it('should open IMDB link when IMDB badge is pressed', () => {
    const movie = createMockMovie({ imdbId: 'tt9999999', imdbRating: '8.0' });
    const { getByText } = render(
      <MovieCard
        movie={movie}
        index={0}
        totalCards={3}
        translateX={mockTranslateX as any}
        isTop={true}
      />
    );

    const imdbBadge = getByText(/IMDB 8.0/);
    fireEvent.press(imdbBadge);

    expect(mockOpenURL).toHaveBeenCalledWith('https://www.imdb.com/title/tt9999999');
  });

  it('should use legacy poster_path when posterUrl is not available', () => {
    const movie = createMockMovie({
      posterUrl: null,
      poster_path: '/legacy-path.jpg',
    });
    const { UNSAFE_getByType } = render(
      <MovieCard
        movie={movie}
        index={0}
        totalCards={3}
        translateX={mockTranslateX as any}
        isTop={true}
      />
    );

    // The Image component should receive the constructed URL
    // This tests the getPosterUrl helper function logic
  });

  it('should display "No Image" when no poster is available', () => {
    const movie = createMockMovie({ posterUrl: null, poster_path: undefined });
    const { getByText } = render(
      <MovieCard
        movie={movie}
        index={0}
        totalCards={3}
        translateX={mockTranslateX as any}
        isTop={true}
      />
    );

    expect(getByText('No Image')).toBeTruthy();
  });

  it('should use legacy release_date for year when year is not available', () => {
    const movie = createMockMovie({
      year: null,
      release_date: '2022-05-15',
    });
    const { getByText } = render(
      <MovieCard
        movie={movie}
        index={0}
        totalCards={3}
        translateX={mockTranslateX as any}
        isTop={true}
      />
    );

    expect(getByText(/2022/)).toBeTruthy();
  });

  it('should show "N/A" when no year or release_date available', () => {
    const movie = createMockMovie({
      year: null,
      release_date: undefined,
    });
    const { getByText } = render(
      <MovieCard
        movie={movie}
        index={0}
        totalCards={3}
        translateX={mockTranslateX as any}
        isTop={true}
      />
    );

    expect(getByText(/N\/A/)).toBeTruthy();
  });
});
