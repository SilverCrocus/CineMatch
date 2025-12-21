import type { MovieListParser, ParsedMovieList } from "./types";

export const genericParser: MovieListParser = {
  name: "Generic",

  canParse(): boolean {
    return true; // Always matches as fallback
  },

  async parse(url: string): Promise<ParsedMovieList> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Cinematch/1.0)",
      },
    });

    if (!response.ok) {
      return {
        titles: [],
        source: "Generic",
        error: `Failed to fetch: ${response.status}`,
      };
    }

    const html = await response.text();

    // Remove script and style tags
    const cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

    // Extract text that looks like movie titles
    // Look for patterns: "Movie Title (YEAR)" or titles in lists
    const titles: string[] = [];

    // Pattern for "Movie Title (1999)" format
    const yearPattern = /([A-Z][^<\n]{2,50})\s*\((\d{4})\)/g;
    let match;
    while ((match = yearPattern.exec(cleanHtml)) !== null) {
      const title = match[1].trim();
      const year = parseInt(match[2]);
      if (year >= 1900 && year <= 2030 && !titles.includes(title)) {
        titles.push(title);
      }
    }

    // Pattern for numbered lists: "1. Movie Title"
    const listPattern = /^\s*\d+[\.\)]\s*([A-Z][^\n<]{2,50})/gm;
    while ((match = listPattern.exec(cleanHtml)) !== null) {
      const title = match[1].trim();
      if (!titles.includes(title)) {
        titles.push(title);
      }
    }

    return {
      titles: titles.slice(0, 50),
      source: "Generic",
    };
  },
};
