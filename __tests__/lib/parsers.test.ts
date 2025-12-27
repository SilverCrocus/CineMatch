/**
 * Parser Tests - Tests for URL parsers and text list parsing
 */

import { parseTextList } from '@/lib/parsers';

// Mock fetch for parser tests
global.fetch = jest.fn();

describe('Parsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseTextList', () => {
    it('should parse newline-separated list', () => {
      const input = `The Shawshank Redemption
The Godfather
The Dark Knight`;
      const result = parseTextList(input);
      expect(result).toEqual([
        'The Shawshank Redemption',
        'The Godfather',
        'The Dark Knight',
      ]);
    });

    it('should parse comma-separated list', () => {
      const input = 'Inception, Interstellar, The Prestige';
      const result = parseTextList(input);
      expect(result).toEqual(['Inception', 'Interstellar', 'The Prestige']);
    });

    it('should handle mixed separators', () => {
      const input = `Pulp Fiction, Fight Club
Memento, Se7en`;
      const result = parseTextList(input);
      expect(result).toEqual(['Pulp Fiction', 'Fight Club', 'Memento', 'Se7en']);
    });

    it('should trim whitespace', () => {
      const input = `  The Matrix
  Blade Runner  `;
      const result = parseTextList(input);
      expect(result).toEqual(['The Matrix', 'Blade Runner']);
    });

    it('should filter empty lines', () => {
      const input = `Movie 1

Movie 2

Movie 3`;
      const result = parseTextList(input);
      expect(result).toEqual(['Movie 1', 'Movie 2', 'Movie 3']);
    });

    it('should handle numbered lists', () => {
      const input = `1. The Shawshank Redemption
2. The Godfather
3. The Dark Knight
4. Pulp Fiction`;
      const result = parseTextList(input);
      expect(result).toEqual([
        'The Shawshank Redemption',
        'The Godfather',
        'The Dark Knight',
        'Pulp Fiction',
      ]);
    });

    it('should handle numbered lists without dots', () => {
      const input = `1 Inception
2 Interstellar
3 Dunkirk`;
      const result = parseTextList(input);
      expect(result).toEqual(['Inception', 'Interstellar', 'Dunkirk']);
    });

    it('should filter standalone numbers', () => {
      const input = `1.
Movie Title
2.
Another Movie`;
      const result = parseTextList(input);
      expect(result).toEqual(['Movie Title', 'Another Movie']);
    });

    it('should handle empty input', () => {
      expect(parseTextList('')).toEqual([]);
      expect(parseTextList('   ')).toEqual([]);
      expect(parseTextList('\n\n\n')).toEqual([]);
    });

    it('should preserve movie titles with numbers', () => {
      const input = `2001: A Space Odyssey
Se7en
Ocean's Eleven`;
      const result = parseTextList(input);
      expect(result).toEqual([
        '2001: A Space Odyssey',
        'Se7en',
        "Ocean's Eleven",
      ]);
    });
  });

  describe('Parser URL Detection', () => {
    // Import parsers dynamically to test canParse
    const { letterboxdParser } = require('@/lib/parsers/letterboxd');
    const { rottenTomatoesParser } = require('@/lib/parsers/rotten-tomatoes');
    const { imdbParser } = require('@/lib/parsers/imdb');
    const { listChallengesParser } = require('@/lib/parsers/list-challenges');

    describe('Letterboxd Parser', () => {
      it('should detect Letterboxd URLs', () => {
        expect(letterboxdParser.canParse('https://letterboxd.com/user/list/my-favorites')).toBe(true);
        expect(letterboxdParser.canParse('https://letterboxd.com/film/inception')).toBe(true);
        expect(letterboxdParser.canParse('http://letterboxd.com/user/watchlist')).toBe(true);
      });

      it('should not detect non-Letterboxd URLs', () => {
        expect(letterboxdParser.canParse('https://imdb.com/list/123')).toBe(false);
        expect(letterboxdParser.canParse('https://example.com')).toBe(false);
      });
    });

    describe('Rotten Tomatoes Parser', () => {
      it('should detect Rotten Tomatoes URLs', () => {
        expect(rottenTomatoesParser.canParse('https://www.rottentomatoes.com/browse/movies')).toBe(true);
        expect(rottenTomatoesParser.canParse('https://rottentomatoes.com/m/inception')).toBe(true);
      });

      it('should not detect non-RT URLs', () => {
        expect(rottenTomatoesParser.canParse('https://letterboxd.com/list')).toBe(false);
      });
    });

    describe('IMDb Parser', () => {
      it('should detect IMDb URLs', () => {
        expect(imdbParser.canParse('https://www.imdb.com/list/ls123456789')).toBe(true);
        expect(imdbParser.canParse('https://imdb.com/chart/top')).toBe(true);
      });

      it('should not detect non-IMDb URLs', () => {
        expect(imdbParser.canParse('https://letterboxd.com')).toBe(false);
      });
    });

    describe('ListChallenges Parser', () => {
      it('should detect ListChallenges URLs', () => {
        expect(listChallengesParser.canParse('https://www.listchallenges.com/list/12345')).toBe(true);
        expect(listChallengesParser.canParse('https://listchallenges.com/best-movies')).toBe(true);
      });

      it('should not detect non-ListChallenges URLs', () => {
        expect(listChallengesParser.canParse('https://imdb.com')).toBe(false);
      });
    });
  });

  describe('Parser HTML Extraction', () => {
    describe('Letterboxd Parser', () => {
      const { letterboxdParser } = require('@/lib/parsers/letterboxd');

      it('should extract movie titles from Letterboxd HTML', async () => {
        const mockHtml = `
          <div data-film-name="Inception"></div>
          <div data-film-name="The Dark Knight"></div>
          <div data-film-name="Interstellar"></div>
        `;

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(mockHtml),
        });

        const result = await letterboxdParser.parse('https://letterboxd.com/user/list/favorites');

        expect(result.titles).toContain('Inception');
        expect(result.titles).toContain('The Dark Knight');
        expect(result.titles).toContain('Interstellar');
        expect(result.source).toBe('Letterboxd');
      });

      it('should handle fetch errors gracefully', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

        const result = await letterboxdParser.parse('https://letterboxd.com/invalid');

        expect(result.titles).toEqual([]);
        expect(result.error).toContain('404');
      });

      it('should limit results to 50 movies', async () => {
        const titles = Array.from({ length: 100 }, (_, i) => `Movie ${i + 1}`);
        const mockHtml = titles.map(t => `<div data-film-name="${t}"></div>`).join('');

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(mockHtml),
        });

        const result = await letterboxdParser.parse('https://letterboxd.com/user/list/big-list');

        expect(result.titles.length).toBeLessThanOrEqual(50);
      });
    });
  });
});
