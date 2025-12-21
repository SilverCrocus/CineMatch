import type { ParsedMovieList, MovieListParser } from "./types";
import { rottenTomatoesParser } from "./rotten-tomatoes";
import { letterboxdParser } from "./letterboxd";
import { listChallengesParser } from "./list-challenges";
import { imdbParser } from "./imdb";
import { genericParser } from "./generic";

const parsers: MovieListParser[] = [
  rottenTomatoesParser,
  letterboxdParser,
  listChallengesParser,
  imdbParser,
  genericParser, // Fallback - must be last
];

export async function parseMovieListUrl(url: string): Promise<ParsedMovieList> {
  for (const parser of parsers) {
    if (parser.canParse(url)) {
      try {
        return await parser.parse(url);
      } catch (error) {
        console.error(`Parser ${parser.name} failed:`, error);
        continue;
      }
    }
  }

  return {
    titles: [],
    source: "unknown",
    error: "No parser could handle this URL",
  };
}

export function parseTextList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.match(/^\d+\.?\s*$/)) // Remove numbered list markers
    .map((line) => line.replace(/^\d+\.?\s*/, "")); // Remove leading numbers
}

export type { ParsedMovieList, MovieListParser };
