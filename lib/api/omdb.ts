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

// Rate limit detection and retry logic
class RateLimitError extends Error {
  constructor() {
    super("OMDb API rate limit reached");
    this.name = "RateLimitError";
  }
}

async function fetchWithRetry(
  url: string,
  maxRetries: number = 2,
  initialDelay: number = 500
): Promise<OMDbMovie> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff
      const delay = initialDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const response = await fetch(url, {
      // Don't use Next.js caching for retry scenarios - we handle caching ourselves
      cache: "no-store",
    });

    if (!response.ok) {
      lastError = new Error(`OMDb API error: ${response.status}`);
      continue;
    }

    const data: OMDbMovie = await response.json();

    // Check for rate limit in response body
    if (data.Response === "False" && data.Error?.includes("limit")) {
      lastError = new RateLimitError();
      continue; // Retry
    }

    return data;
  }

  throw lastError || new Error("OMDb fetch failed");
}

export async function getOMDbRatings(imdbId: string): Promise<OMDbRatings> {
  const url = new URL(OMDB_BASE_URL);
  url.searchParams.append("apikey", process.env.OMDB_API_KEY!);
  url.searchParams.append("i", imdbId);

  try {
    const data = await fetchWithRetry(url.toString());

    if (data.Response === "False") {
      // Movie not found - return null (but this is different from rate limit)
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
  } catch (error) {
    // Don't swallow errors silently - let caller know we failed
    // This prevents caching null results when API is rate limited
    if (error instanceof RateLimitError) {
      console.warn(`[OMDb] Rate limit hit for ${imdbId}`);
    }
    throw error;
  }
}

export async function searchOMDb(title: string, year?: number): Promise<string | null> {
  const url = new URL(OMDB_BASE_URL);
  url.searchParams.append("apikey", process.env.OMDB_API_KEY!);
  url.searchParams.append("t", title);
  if (year) {
    url.searchParams.append("y", String(year));
  }

  try {
    const data = await fetchWithRetry(url.toString());

    if (data.Response === "False") {
      return null;
    }

    return data.imdbID;
  } catch (error) {
    if (error instanceof RateLimitError) {
      console.warn(`[OMDb] Rate limit hit for search: ${title}`);
    }
    return null; // Return null on failure for search (non-critical)
  }
}
