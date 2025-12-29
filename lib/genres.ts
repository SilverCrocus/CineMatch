// Genre ID to name mapping (from TMDB)
export const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

// Array format for easier iteration in UI
export const GENRES = Object.entries(GENRE_MAP).map(([id, name]) => ({
  id: parseInt(id),
  name,
}));

// Year presets for filtering
export const YEAR_PRESETS: { label: string; value: string; from?: number; to?: number }[] = [
  { label: "Any", value: "any" },
  { label: "2020s", value: "2020s", from: 2020, to: 2029 },
  { label: "2010s", value: "2010s", from: 2010, to: 2019 },
  { label: "2000s", value: "2000s", from: 2000, to: 2009 },
  { label: "90s", value: "90s", from: 1990, to: 1999 },
  { label: "80s & older", value: "classic", from: undefined, to: 1989 },
];
