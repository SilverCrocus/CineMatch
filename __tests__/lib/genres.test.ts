import { GENRE_MAP, GENRES, YEAR_PRESETS, YEAR_OPTIONS } from '../../lib/genres';

describe('Genre Utilities', () => {
  describe('GENRE_MAP', () => {
    it('should contain common genres', () => {
      expect(GENRE_MAP[28]).toBe('Action');
      expect(GENRE_MAP[35]).toBe('Comedy');
      expect(GENRE_MAP[18]).toBe('Drama');
      expect(GENRE_MAP[27]).toBe('Horror');
      expect(GENRE_MAP[878]).toBe('Sci-Fi');
    });

    it('should have correct number of genres', () => {
      // TMDB has 19 main movie genres
      expect(Object.keys(GENRE_MAP).length).toBeGreaterThanOrEqual(19);
    });
  });

  describe('GENRES array', () => {
    it('should have id and name for each genre', () => {
      GENRES.forEach((genre) => {
        expect(genre).toHaveProperty('id');
        expect(genre).toHaveProperty('name');
        expect(typeof genre.id).toBe('number');
        expect(typeof genre.name).toBe('string');
      });
    });

    it('should match GENRE_MAP', () => {
      GENRES.forEach((genre) => {
        expect(GENRE_MAP[genre.id]).toBe(genre.name);
      });
    });

    it('should have same length as GENRE_MAP', () => {
      expect(GENRES.length).toBe(Object.keys(GENRE_MAP).length);
    });
  });

  describe('YEAR_PRESETS', () => {
    it('should have "Any" as first option', () => {
      expect(YEAR_PRESETS[0].label).toBe('Any');
      expect(YEAR_PRESETS[0].value).toBe('any');
    });

    it('should have decade presets with correct ranges', () => {
      const preset2020s = YEAR_PRESETS.find((p) => p.value === '2020s');
      expect(preset2020s?.from).toBe(2020);
      expect(preset2020s?.to).toBe(2029);

      const preset2010s = YEAR_PRESETS.find((p) => p.value === '2010s');
      expect(preset2010s?.from).toBe(2010);
      expect(preset2010s?.to).toBe(2019);
    });

    it('should have classic preset for older movies', () => {
      const classic = YEAR_PRESETS.find((p) => p.value === 'classic');
      expect(classic).toBeDefined();
      expect(classic?.to).toBe(1989);
      expect(classic?.from).toBeUndefined();
    });

    it('should have custom preset for user-defined ranges', () => {
      const custom = YEAR_PRESETS.find((p) => p.value === 'custom');
      expect(custom).toBeDefined();
      expect(custom?.label).toBe('Custom');
      // Custom preset should not have predefined from/to values
      expect(custom?.from).toBeUndefined();
      expect(custom?.to).toBeUndefined();
    });

    it('should have label for each preset', () => {
      YEAR_PRESETS.forEach((preset) => {
        expect(preset.label).toBeTruthy();
        expect(preset.value).toBeTruthy();
      });
    });
  });

  describe('YEAR_OPTIONS', () => {
    it('should contain years from current year down to 1950', () => {
      const currentYear = new Date().getFullYear();
      expect(YEAR_OPTIONS[0]).toBe(currentYear);
      expect(YEAR_OPTIONS[YEAR_OPTIONS.length - 1]).toBe(1950);
    });

    it('should have correct number of years', () => {
      const currentYear = new Date().getFullYear();
      const expectedLength = currentYear - 1949; // 1950 to currentYear inclusive
      expect(YEAR_OPTIONS.length).toBe(expectedLength);
    });

    it('should be in descending order', () => {
      for (let i = 1; i < YEAR_OPTIONS.length; i++) {
        expect(YEAR_OPTIONS[i]).toBeLessThan(YEAR_OPTIONS[i - 1]);
      }
    });

    it('should contain all consecutive years', () => {
      for (let i = 1; i < YEAR_OPTIONS.length; i++) {
        expect(YEAR_OPTIONS[i - 1] - YEAR_OPTIONS[i]).toBe(1);
      }
    });
  });
});
