/**
 * Utils Tests - Tests for utility functions
 */

import { cn, generateRoomCode, formatRuntime } from '@/lib/utils';

describe('Utils', () => {
  describe('cn (className merge)', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });

    it('should merge Tailwind classes correctly', () => {
      // tailwind-merge should handle conflicting classes
      expect(cn('px-2', 'px-4')).toBe('px-4');
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('should handle arrays', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should handle objects', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });
  });

  describe('generateRoomCode', () => {
    it('should generate 4-character codes by default', () => {
      const code = generateRoomCode();
      expect(code).toHaveLength(4);
    });

    it('should generate codes of specified length', () => {
      expect(generateRoomCode(6)).toHaveLength(6);
      expect(generateRoomCode(8)).toHaveLength(8);
      expect(generateRoomCode(2)).toHaveLength(2);
    });

    it('should only contain uppercase letters and numbers (excluding ambiguous chars)', () => {
      // Characters excluded: 0, 1, I, O (to avoid confusion)
      const validChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
      for (let i = 0; i < 50; i++) {
        const code = generateRoomCode();
        expect(code).toMatch(validChars);
      }
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateRoomCode(6));
      }
      // With 6 chars from 32 possible, collisions should be rare
      expect(codes.size).toBeGreaterThan(95);
    });

    it('should not contain ambiguous characters (0, 1, I, O)', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateRoomCode(10);
        expect(code).not.toMatch(/[01IO]/);
      }
    });
  });

  describe('formatRuntime', () => {
    it('should format minutes only', () => {
      expect(formatRuntime(45)).toBe('45m');
      expect(formatRuntime(30)).toBe('30m');
    });

    it('should format hours only', () => {
      expect(formatRuntime(60)).toBe('1h');
      expect(formatRuntime(120)).toBe('2h');
      expect(formatRuntime(180)).toBe('3h');
    });

    it('should format hours and minutes', () => {
      expect(formatRuntime(90)).toBe('1h 30m');
      expect(formatRuntime(135)).toBe('2h 15m');
      expect(formatRuntime(165)).toBe('2h 45m');
    });

    it('should handle edge cases', () => {
      expect(formatRuntime(0)).toBe('0m');
      expect(formatRuntime(1)).toBe('1m');
      expect(formatRuntime(59)).toBe('59m');
      expect(formatRuntime(61)).toBe('1h 1m');
    });
  });
});
