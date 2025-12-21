import type { MovieListParser, ParsedMovieList } from "./types";

export const imdbParser: MovieListParser = {
  name: "IMDb",

  canParse(url: string): boolean {
    return url.includes("imdb.com");
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
        source: "IMDb",
        error: `Failed to fetch: ${response.status}`,
      };
    }

    const html = await response.text();
    const titles: string[] = [];

    // IMDb list pages have various formats
    const patterns = [
      /<h3[^>]*class="[^"]*lister-item-header[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/g,
      /class="[^"]*titleColumn[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/g,
      /<img[^>]*alt="([^"]+)"[^>]*class="[^"]*loadlate[^"]*"/g,
      /data-title="([^"]+)"/g,
      /<a[^>]*href="\/title\/[^"]*"[^>]*>([^<]+)<\/a>/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        let title = match[1].trim();
        // Clean up IMDb-specific formatting
        title = title.replace(/\s*\(\d{4}\)\s*$/, ""); // Remove year
        if (title && !titles.includes(title) && title.length > 1) {
          titles.push(title);
        }
      }
    }

    return {
      titles: [...new Set(titles)].slice(0, 50), // Dedupe and limit
      source: "IMDb",
    };
  },
};
