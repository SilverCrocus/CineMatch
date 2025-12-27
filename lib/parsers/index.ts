import type { ParsedMovieList, MovieListParser } from "./types";
import { parseWithLLM } from "./llm-parser";

/**
 * Parse movie titles from any URL using Gemini 3 Flash.
 * Works on any website containing movie lists.
 */
export async function parseMovieListUrl(url: string): Promise<ParsedMovieList> {
  return parseWithLLM(url);
}

export function parseTextList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.match(/^\d+\.?\s*$/)) // Remove standalone numbered list markers
    .map((line) => {
      // Only strip numbered list patterns (1-3 digits followed by . or ) and space)
      // Don't strip years like "2001:" which are part of movie titles
      const listMatch = line.match(/^(\d{1,3})[\.\)]\s+(.+)$/);
      if (listMatch) {
        return listMatch[2];
      }
      // Also handle "1 Movie" pattern but only for small numbers
      const simpleMatch = line.match(/^(\d{1,2})\s+([A-Za-z].+)$/);
      if (simpleMatch) {
        return simpleMatch[2];
      }
      return line;
    });
}

export type { ParsedMovieList, MovieListParser };
