import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ParsedMovieList } from "./types";

/**
 * Clean HTML to reduce token count before sending to LLM.
 * Removes scripts, styles, nav elements, and other non-content elements.
 */
function cleanHtml(html: string): string {
  return html
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove style tags and content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    // Remove nav, footer, header elements
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Remove extra whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract movie titles from any URL using Gemini 3 Flash.
 */
export async function parseWithLLM(url: string): Promise<ParsedMovieList> {
  const apiKey = process.env.gemini_flash_key;

  if (!apiKey) {
    return {
      titles: [],
      source: "LLM Parser",
      error: "Gemini API key not configured",
    };
  }

  try {
    // Fetch the page HTML
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Cinematch/1.0)",
      },
    });

    if (!response.ok) {
      return {
        titles: [],
        source: "LLM Parser",
        error: `Failed to fetch URL: ${response.status}`,
      };
    }

    const html = await response.text();
    const cleanedHtml = cleanHtml(html);

    // Truncate if too long (to manage costs)
    const maxLength = 100000; // ~25K tokens
    const truncatedHtml =
      cleanedHtml.length > maxLength
        ? cleanedHtml.slice(0, maxLength)
        : cleanedHtml;

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `Extract all movie titles from this webpage content.
Return ONLY a valid JSON array of strings containing movie titles, nothing else.
Do not include TV shows, only movies.
Example format: ["The Godfather", "Pulp Fiction", "Inception"]

Webpage content:
${truncatedHtml}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse the JSON response
    // Handle potential markdown code blocks in response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return {
        titles: [],
        source: "LLM Parser",
        error: "Could not parse LLM response as JSON array",
      };
    }

    const titles = JSON.parse(jsonMatch[0]) as string[];

    // Validate and clean titles
    const validTitles = titles
      .filter((t) => typeof t === "string" && t.trim().length > 0)
      .map((t) => t.trim())
      .slice(0, 50); // Limit to 50 movies

    return {
      titles: validTitles,
      source: "LLM Parser",
    };
  } catch (error) {
    console.error("LLM Parser error:", error);
    return {
      titles: [],
      source: "LLM Parser",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
