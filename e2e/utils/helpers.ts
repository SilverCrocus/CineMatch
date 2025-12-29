import { Page, expect } from "@playwright/test";

/**
 * Swipe through all movies in the deck.
 * Alternates between like and dislike to ensure some matches.
 *
 * @param page - Playwright page
 * @param likeAll - If true, likes all movies (useful for ensuring matches)
 */
export async function swipeAllMovies(page: Page, likeAll = false): Promise<void> {
  let swipeCount = 0;

  // Wait for swipe deck to be ready
  await page.waitForTimeout(1000);

  while (true) {
    // Check if we're done (completed state shows "All done!")
    const doneText = page.locator("text=All done!");
    if (await doneText.isVisible({ timeout: 1000 }).catch(() => false)) {
      break;
    }

    // Check if waiting for others
    const waitingText = page.locator("text=Waiting for others");
    if (await waitingText.isVisible({ timeout: 500 }).catch(() => false)) {
      break;
    }

    // Find the like/dislike buttons by their distinctive styling
    const likeButton = page.locator("button.border-green-500").first();
    const dislikeButton = page.locator("button.border-red-500").first();

    const isLikeVisible = await likeButton.isVisible({ timeout: 1000 }).catch(() => false);
    if (!isLikeVisible) {
      // Maybe we're already done or transitioned to another state
      break;
    }

    // Decide whether to like or dislike
    if (likeAll || swipeCount % 3 !== 2) {
      // Like (2 out of 3 swipes, or all if likeAll)
      await likeButton.click();
    } else {
      // Dislike (1 out of 3 swipes)
      await dislikeButton.click();
    }

    swipeCount++;

    // Wait for animation and API call to complete
    await page.waitForTimeout(300);

    // Safety limit
    if (swipeCount > 100) {
      throw new Error("Swipe limit exceeded - possible infinite loop");
    }
  }
}

/**
 * Wait for a specific session status by checking the page content
 */
export async function waitForSessionStatus(
  page: Page,
  status: "lobby" | "swiping" | "revealed",
  timeout = 60000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (status === "lobby") {
      // Lobby has the room code display
      const codeVisible = await page.locator("text=Session Lobby").isVisible({ timeout: 500 }).catch(() => false);
      if (codeVisible) return;
    }

    if (status === "swiping") {
      // Swiping shows the swipe deck or "All done"
      const swipeVisible = await page.locator("button.border-green-500").isVisible({ timeout: 500 }).catch(() => false);
      const doneVisible = await page.locator("text=All done!").isVisible({ timeout: 500 }).catch(() => false);
      if (swipeVisible || doneVisible) return;
    }

    if (status === "revealed") {
      // Revealed shows matches or "No matches"
      const matchedVisible = await page.locator("text=You matched!").isVisible({ timeout: 500 }).catch(() => false);
      const noMatchVisible = await page.locator("text=No matches").isVisible({ timeout: 500 }).catch(() => false);
      if (matchedVisible || noMatchVisible) return;
    }

    await page.waitForTimeout(1000);
  }

  throw new Error(`Timed out waiting for session status: ${status}`);
}

/**
 * Extract the room code from the lobby page
 */
export async function getRoomCode(page: Page): Promise<string> {
  // Wait for the lobby to fully load first
  await expect(page.locator("text=Session Lobby")).toBeVisible({ timeout: 30000 });

  // The room code is displayed in a large font-mono element (handles various tracking styles)
  const codeElement = page.locator(".text-4xl.font-mono.font-bold").first();
  await expect(codeElement).toBeVisible({ timeout: 10000 });
  const code = await codeElement.textContent();
  if (!code) {
    throw new Error("Could not find room code");
  }
  return code.trim();
}

/**
 * Wait for a participant to appear in the lobby
 */
export async function waitForParticipant(page: Page, name: string, timeout = 10000): Promise<void> {
  await expect(page.locator(`text=${name}`)).toBeVisible({ timeout });
}
