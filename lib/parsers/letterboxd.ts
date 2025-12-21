import type { MovieListParser, ParsedMovieList } from "./types";

export const letterboxdParser: MovieListParser = {
  name: "Letterboxd",

  canParse(url: string): boolean {
    return url.includes("letterboxd.com");
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
        source: "Letterboxd",
        error: `Failed to fetch: ${response.status}`,
      };
    }

    const html = await response.text();
    const titles: string[] = [];

    // Letterboxd uses data-film-slug and alt text for posters
    const patterns = [
      /data-film-name="([^"]+)"/g,
      /alt="([^"]+)"[^>]*class="[^"]*image[^"]*"/g,
      /<h2[^>]*class="[^"]*headline-2[^"]*"[^>]*>([^<]+)<\/h2>/g,
      /data-original-title="([^"]+)"/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const title = match[1].trim();
        if (title && !titles.includes(title) && title.length > 1) {
          titles.push(title);
        }
      }
    }

    return {
      titles: titles.slice(0, 50),
      source: "Letterboxd",
    };
  },
};
