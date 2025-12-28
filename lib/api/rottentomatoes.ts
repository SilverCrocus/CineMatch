const RT_API_BASE_URL = "https://rotten-tomatoes-api-clrb.onrender.com/api/v1";

interface RTMovieResponse {
  imdbId: string;
  rtUrl: string;
  title: string;
  year: number;
  criticScore: number | null;
  audienceScore: number | null;
  criticRating: "certified_fresh" | "fresh" | "rotten" | null;
  audienceRating: "upright" | "spilled" | null;
  status?: "cached" | "stale" | "fetched";
}

export interface RTRatings {
  criticScore: string | null;
  audienceScore: string | null;
  rtUrl: string | null;
}

export interface RTBatchResult {
  imdbId: string;
  criticScore: string | null;
  audienceScore: string | null;
  rtUrl: string | null;
  error?: string;
}

export async function getRTRatings(imdbId: string): Promise<RTRatings> {
  const apiKey = process.env.RT_API_KEY;

  if (!apiKey) {
    console.warn("RT_API_KEY not configured");
    return { criticScore: null, audienceScore: null, rtUrl: null };
  }

  try {
    const response = await fetch(`${RT_API_BASE_URL}/movie/${imdbId}`, {
      headers: {
        "X-API-Key": apiKey,
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Movie not found on RT - not an error
        return { criticScore: null, audienceScore: null, rtUrl: null };
      }
      throw new Error(`RT API error: ${response.status}`);
    }

    const data: RTMovieResponse = await response.json();

    return {
      criticScore: data.criticScore !== null ? `${data.criticScore}%` : null,
      audienceScore: data.audienceScore !== null ? `${data.audienceScore}%` : null,
      rtUrl: data.rtUrl || null,
    };
  } catch (error) {
    console.error(`Failed to fetch RT ratings for ${imdbId}:`, error);
    return { criticScore: null, audienceScore: null, rtUrl: null };
  }
}

/**
 * Fetch RT data for multiple movies using SSE batch endpoint.
 * Yields results as they stream in from the API.
 */
export async function* streamRTBatch(imdbIds: string[]): AsyncGenerator<RTBatchResult> {
  const apiKey = process.env.RT_API_KEY;

  if (!apiKey || imdbIds.length === 0) {
    return;
  }

  try {
    const response = await fetch(`${RT_API_BASE_URL}/movies/batch`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imdbIds }),
    });

    if (!response.ok) {
      console.error(`RT batch API error: ${response.status}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let currentEvent = "";
      for (const line of lines) {
        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith("data:") && currentEvent === "movie") {
          try {
            const data: RTMovieResponse = JSON.parse(line.slice(5).trim());
            yield {
              imdbId: data.imdbId,
              criticScore: data.criticScore !== null ? `${data.criticScore}%` : null,
              audienceScore: data.audienceScore !== null ? `${data.audienceScore}%` : null,
              rtUrl: data.rtUrl || null,
            };
          } catch {
            // Skip malformed JSON
          }
        } else if (line.startsWith("data:") && currentEvent === "error") {
          try {
            const data = JSON.parse(line.slice(5).trim());
            yield {
              imdbId: data.imdbId,
              criticScore: null,
              audienceScore: null,
              rtUrl: null,
              error: data.message,
            };
          } catch {
            // Skip malformed JSON
          }
        } else if (currentEvent === "done") {
          return;
        }
      }
    }
  } catch (error) {
    console.error("RT batch stream error:", error);
  }
}
