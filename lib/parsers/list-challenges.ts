import type { MovieListParser, ParsedMovieList } from "./types";

export const listChallengesParser: MovieListParser = {
  name: "ListChallenges",

  canParse(url: string): boolean {
    return url.includes("listchallenges.com");
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
        source: "ListChallenges",
        error: `Failed to fetch: ${response.status}`,
      };
    }

    const html = await response.text();
    const titles: string[] = [];

    // ListChallenges uses item-name class for titles
    const patterns = [
      /class="[^"]*item-name[^"]*"[^>]*>([^<]+)</g,
      /<h3[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h3>/g,
      /data-name="([^"]+)"/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const title = match[1].trim();
        if (title && !titles.includes(title)) {
          titles.push(title);
        }
      }
    }

    return {
      titles: titles.slice(0, 50),
      source: "ListChallenges",
    };
  },
};
