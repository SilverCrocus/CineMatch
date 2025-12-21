const OMDB_BASE_URL = "https://www.omdbapi.com";

interface OMDbMovie {
  Title: string;
  Year: string;
  imdbID: string;
  imdbRating: string;
  Ratings: {
    Source: string;
    Value: string;
  }[];
  Response: "True" | "False";
  Error?: string;
}

export interface OMDbRatings {
  imdbRating: string | null;
  rtCriticScore: string | null;
}

export async function getOMDbRatings(imdbId: string): Promise<OMDbRatings> {
  const url = new URL(OMDB_BASE_URL);
  url.searchParams.append("apikey", process.env.OMDB_API_KEY!);
  url.searchParams.append("i", imdbId);

  const response = await fetch(url.toString(), {
    next: { revalidate: 86400 }, // Cache for 24 hours
  });

  if (!response.ok) {
    throw new Error(`OMDb API error: ${response.status}`);
  }

  const data: OMDbMovie = await response.json();

  if (data.Response === "False") {
    return { imdbRating: null, rtCriticScore: null };
  }

  // Find Rotten Tomatoes rating
  const rtRating = data.Ratings?.find(
    (r) => r.Source === "Rotten Tomatoes"
  )?.Value;

  return {
    imdbRating: data.imdbRating !== "N/A" ? data.imdbRating : null,
    rtCriticScore: rtRating || null,
  };
}

export async function searchOMDb(title: string, year?: number): Promise<string | null> {
  const url = new URL(OMDB_BASE_URL);
  url.searchParams.append("apikey", process.env.OMDB_API_KEY!);
  url.searchParams.append("t", title);
  if (year) {
    url.searchParams.append("y", String(year));
  }

  const response = await fetch(url.toString(), {
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    return null;
  }

  const data: OMDbMovie = await response.json();

  if (data.Response === "False") {
    return null;
  }

  return data.imdbID;
}
