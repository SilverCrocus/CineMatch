import type { MovieListParser, ParsedMovieList } from "./types";

export const rottenTomatoesParser: MovieListParser = {
  name: "Rotten Tomatoes",

  canParse(url: string): boolean {
    return url.includes("rottentomatoes.com");
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
        source: "Rotten Tomatoes",
        error: `Failed to fetch: ${response.status}`,
      };
    }

    const html = await response.text();
    const titles: string[] = [];

    // Match movie titles from RT's browse pages
    // Pattern: data-title="Movie Title" or <span class="p--small">Movie Title</span>
    const titlePatterns = [
      /data-title="([^"]+)"/g,
      /<span[^>]*slot="title"[^>]*>([^<]+)<\/span>/g,
      /class="[^"]*movieTitle[^"]*"[^>]*>([^<]+)</g,
    ];

    for (const pattern of titlePatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const title = match[1].trim();
        if (title && !titles.includes(title)) {
          titles.push(title);
        }
      }
    }

    return {
      titles: titles.slice(0, 50), // Limit to 50 movies
      source: "Rotten Tomatoes",
    };
  },
};
