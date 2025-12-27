/**
 * SwipeDeck Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SwipeDeck } from '@/components/swipe/swipe-deck';
import type { Movie } from '@/types';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
  useTransform: () => 0,
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}));

describe('SwipeDeck', () => {
  const mockMovies: Movie[] = [
    {
      id: 'tmdb-27205',
      tmdbId: 27205,
      imdbId: 'tt1375666',
      title: 'Inception',
      year: 2010,
      posterUrl: 'https://image.tmdb.org/t/p/w500/poster1.jpg',
      backdropUrl: null,
      genres: ['Action', 'Science Fiction'],
      synopsis: 'A thief who steals corporate secrets.',
      runtime: 148,
      imdbRating: '8.8',
      rtCriticScore: '87%',
      streamingServices: ['Netflix'],
    },
    {
      id: 'tmdb-155',
      tmdbId: 155,
      imdbId: 'tt0468569',
      title: 'The Dark Knight',
      year: 2008,
      posterUrl: 'https://image.tmdb.org/t/p/w500/poster2.jpg',
      backdropUrl: null,
      genres: ['Action', 'Crime', 'Drama'],
      synopsis: 'Batman faces the Joker.',
      runtime: 152,
      imdbRating: '9.0',
      rtCriticScore: '94%',
      streamingServices: ['HBO Max'],
    },
    {
      id: 'tmdb-157336',
      tmdbId: 157336,
      imdbId: 'tt0816692',
      title: 'Interstellar',
      year: 2014,
      posterUrl: 'https://image.tmdb.org/t/p/w500/poster3.jpg',
      backdropUrl: null,
      genres: ['Adventure', 'Drama', 'Science Fiction'],
      synopsis: 'A team of explorers travel through a wormhole.',
      runtime: 169,
      imdbRating: '8.6',
      rtCriticScore: '73%',
      streamingServices: ['Paramount+'],
    },
  ];

  const mockOnSwipe = jest.fn();
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the first movie initially', () => {
    render(
      <SwipeDeck
        movies={mockMovies}
        onSwipe={mockOnSwipe}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
  });

  it('should display progress indicator', () => {
    render(
      <SwipeDeck
        movies={mockMovies}
        onSwipe={mockOnSwipe}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('0 / 3')).toBeInTheDocument();
    expect(screen.getByText('3 left')).toBeInTheDocument();
  });

  it('should call onSwipe with true when like button clicked', () => {
    render(
      <SwipeDeck
        movies={mockMovies}
        onSwipe={mockOnSwipe}
        onComplete={mockOnComplete}
      />
    );

    const buttons = screen.getAllByRole('button');
    const likeButton = buttons[1]; // Second button is like (green)
    fireEvent.click(likeButton);

    expect(mockOnSwipe).toHaveBeenCalledWith(27205, true);
  });

  it('should call onSwipe with false when dislike button clicked', () => {
    render(
      <SwipeDeck
        movies={mockMovies}
        onSwipe={mockOnSwipe}
        onComplete={mockOnComplete}
      />
    );

    const buttons = screen.getAllByRole('button');
    const dislikeButton = buttons[0]; // First button is dislike (red)
    fireEvent.click(dislikeButton);

    expect(mockOnSwipe).toHaveBeenCalledWith(27205, false);
  });

  it('should advance to next movie after swipe', () => {
    render(
      <SwipeDeck
        movies={mockMovies}
        onSwipe={mockOnSwipe}
        onComplete={mockOnComplete}
      />
    );

    // Like the first movie
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);

    // Progress should update
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText('2 left')).toBeInTheDocument();
  });

  it('should show completion message after all movies swiped', () => {
    render(
      <SwipeDeck
        movies={mockMovies}
        onSwipe={mockOnSwipe}
        onComplete={mockOnComplete}
      />
    );

    // Swipe through all movies
    for (let i = 0; i < mockMovies.length; i++) {
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]); // Like all
    }

    expect(screen.getByText('All done!')).toBeInTheDocument();
    expect(screen.getByText('Waiting for others to finish...')).toBeInTheDocument();
  });

  it('should call onComplete after last swipe', () => {
    render(
      <SwipeDeck
        movies={mockMovies}
        onSwipe={mockOnSwipe}
        onComplete={mockOnComplete}
      />
    );

    // Swipe through all movies
    for (let i = 0; i < mockMovies.length; i++) {
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);
    }

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('should start from first unswiped movie with initialSwipes', () => {
    const initialSwipes = {
      27205: true, // Inception already swiped
    };

    render(
      <SwipeDeck
        movies={mockMovies}
        onSwipe={mockOnSwipe}
        onComplete={mockOnComplete}
        initialSwipes={initialSwipes}
      />
    );

    // Should show The Dark Knight (second movie) since Inception was already swiped
    expect(screen.getByText('The Dark Knight')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('should show completion if all movies already swiped', () => {
    const initialSwipes = {
      27205: true,
      155: false,
      157336: true,
    };

    render(
      <SwipeDeck
        movies={mockMovies}
        onSwipe={mockOnSwipe}
        onComplete={mockOnComplete}
        initialSwipes={initialSwipes}
      />
    );

    expect(screen.getByText('All done!')).toBeInTheDocument();
  });

  it('should display movie genres', () => {
    render(
      <SwipeDeck
        movies={mockMovies}
        onSwipe={mockOnSwipe}
        onComplete={mockOnComplete}
      />
    );

    // Use getAllByText since multiple cards may be visible
    expect(screen.getAllByText('Action').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Science Fiction').length).toBeGreaterThan(0);
  });

  it('should display movie ratings', () => {
    render(
      <SwipeDeck
        movies={mockMovies}
        onSwipe={mockOnSwipe}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('8.8')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('should display streaming services', () => {
    render(
      <SwipeDeck
        movies={mockMovies}
        onSwipe={mockOnSwipe}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('should handle empty movie list', () => {
    render(
      <SwipeDeck
        movies={[]}
        onSwipe={mockOnSwipe}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('All done!')).toBeInTheDocument();
  });

  it('should display synopsis', () => {
    render(
      <SwipeDeck
        movies={mockMovies}
        onSwipe={mockOnSwipe}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('A thief who steals corporate secrets.')).toBeInTheDocument();
  });

  it('should track swipe counts correctly through multiple swipes', () => {
    render(
      <SwipeDeck
        movies={mockMovies}
        onSwipe={mockOnSwipe}
        onComplete={mockOnComplete}
      />
    );

    // First swipe
    fireEvent.click(screen.getAllByRole('button')[0]); // Dislike
    expect(mockOnSwipe).toHaveBeenLastCalledWith(27205, false);

    // Second swipe
    fireEvent.click(screen.getAllByRole('button')[1]); // Like
    expect(mockOnSwipe).toHaveBeenLastCalledWith(155, true);

    // Third swipe
    fireEvent.click(screen.getAllByRole('button')[1]); // Like
    expect(mockOnSwipe).toHaveBeenLastCalledWith(157336, true);

    expect(mockOnSwipe).toHaveBeenCalledTimes(3);
  });
});

describe('SwipeDeck Edge Cases', () => {
  const singleMovie: Movie[] = [
    {
      id: 'tmdb-550',
      tmdbId: 550,
      imdbId: 'tt0137523',
      title: 'Fight Club',
      year: 1999,
      posterUrl: null, // No poster
      backdropUrl: null,
      genres: ['Drama'],
      synopsis: 'An insomniac office worker forms an underground fight club.',
      runtime: 139,
      imdbRating: null, // No rating
      rtCriticScore: null,
      streamingServices: [], // No streaming
    },
  ];

  it('should handle movie without poster', () => {
    render(
      <SwipeDeck
        movies={singleMovie}
        onSwipe={jest.fn()}
        onComplete={jest.fn()}
      />
    );

    expect(screen.getByText('No poster')).toBeInTheDocument();
  });

  it('should handle movie without ratings', () => {
    render(
      <SwipeDeck
        movies={singleMovie}
        onSwipe={jest.fn()}
        onComplete={jest.fn()}
      />
    );

    // Should not crash, ratings section just won't show
    expect(screen.getByText('Fight Club')).toBeInTheDocument();
  });

  it('should handle movie without streaming services', () => {
    render(
      <SwipeDeck
        movies={singleMovie}
        onSwipe={jest.fn()}
        onComplete={jest.fn()}
      />
    );

    // "Available on:" should not appear
    expect(screen.queryByText('Available on:')).not.toBeInTheDocument();
  });

  it('should handle single movie deck', () => {
    const mockOnComplete = jest.fn();

    render(
      <SwipeDeck
        movies={singleMovie}
        onSwipe={jest.fn()}
        onComplete={mockOnComplete}
      />
    );

    // Progress shows 1 movie
    expect(screen.getByText('0 / 1')).toBeInTheDocument();

    // Swipe the only movie
    fireEvent.click(screen.getAllByRole('button')[1]);

    expect(mockOnComplete).toHaveBeenCalled();
    expect(screen.getByText('All done!')).toBeInTheDocument();
  });
});
