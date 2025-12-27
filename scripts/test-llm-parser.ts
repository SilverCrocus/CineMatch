/**
 * Quick test script for the LLM parser.
 * Run with: npx tsx scripts/test-llm-parser.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { parseMovieListUrl } from "../lib/parsers";

const TEST_URL =
  "https://editorial.rottentomatoes.com/guide/best-sports-movie-of-all-time/";

async function main() {
  console.log("Testing LLM Parser...");
  console.log(`URL: ${TEST_URL}\n`);

  const result = await parseMovieListUrl(TEST_URL);

  if (result.error) {
    console.error("Error:", result.error);
    process.exit(1);
  }

  console.log(`Source: ${result.source}`);
  console.log(`Found ${result.titles.length} movies:\n`);

  result.titles.slice(0, 20).forEach((title, i) => {
    console.log(`  ${i + 1}. ${title}`);
  });

  if (result.titles.length > 20) {
    console.log(`  ... and ${result.titles.length - 20} more`);
  }
}

main().catch(console.error);
