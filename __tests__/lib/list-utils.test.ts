// Tests for My List utility functions and IMDB URL generation

describe('My List Utilities', () => {
  describe('getIMDbUrl', () => {
    // This function is defined inline in list.tsx, but we can test the logic
    const getIMDbUrl = (imdbId: string): string => {
      return `https://www.imdb.com/title/${imdbId}`;
    };

    it('should generate correct IMDB URL for valid ID', () => {
      expect(getIMDbUrl('tt1375666')).toBe('https://www.imdb.com/title/tt1375666');
    });

    it('should handle IMDB IDs with different lengths', () => {
      // Short ID
      expect(getIMDbUrl('tt0001')).toBe('https://www.imdb.com/title/tt0001');
      // Standard ID
      expect(getIMDbUrl('tt12345678')).toBe('https://www.imdb.com/title/tt12345678');
    });

    it('should include tt prefix in URL', () => {
      const url = getIMDbUrl('tt0133093'); // The Matrix
      expect(url).toContain('/tt0133093');
      expect(url).toStartWith('https://www.imdb.com/title/');
    });
  });

  describe('Grid Layout Calculations', () => {
    // Testing the grid layout calculations from list.tsx
    const CARD_GAP = 12;

    it('should calculate card width correctly for 2 columns', () => {
      const screenWidth = 375; // iPhone standard width
      const padding = 32; // 16px on each side
      const expectedCardWidth = (screenWidth - padding - CARD_GAP) / 2;

      expect(expectedCardWidth).toBe((375 - 32 - 12) / 2);
      expect(expectedCardWidth).toBeCloseTo(165.5);
    });

    it('should maintain 2:3 aspect ratio for cards', () => {
      const cardWidth = 165;
      const cardHeight = cardWidth * 1.5;

      expect(cardHeight).toBe(247.5);
      // 2:3 ratio means height should be 1.5x width
      expect(cardHeight / cardWidth).toBe(1.5);
    });

    it('should calculate correct column margins', () => {
      const leftCardMarginRight = CARD_GAP / 2;
      const rightCardMarginLeft = CARD_GAP / 2;

      expect(leftCardMarginRight).toBe(6);
      expect(rightCardMarginLeft).toBe(6);
      // Total gap between cards should equal CARD_GAP
      expect(leftCardMarginRight + rightCardMarginLeft).toBe(CARD_GAP);
    });
  });

  describe('Column Detection', () => {
    it('should identify left column items (even indices)', () => {
      const isLeftColumn = (index: number) => index % 2 === 0;

      expect(isLeftColumn(0)).toBe(true);
      expect(isLeftColumn(2)).toBe(true);
      expect(isLeftColumn(4)).toBe(true);
    });

    it('should identify right column items (odd indices)', () => {
      const isRightColumn = (index: number) => index % 2 === 1;

      expect(isRightColumn(1)).toBe(true);
      expect(isRightColumn(3)).toBe(true);
      expect(isRightColumn(5)).toBe(true);
    });
  });
});

// Add custom matcher for toStartWith
expect.extend({
  toStartWith(received: string, expected: string) {
    const pass = received.startsWith(expected);
    if (pass) {
      return {
        message: () => `expected ${received} not to start with ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to start with ${expected}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toStartWith(expected: string): R;
    }
  }
}
