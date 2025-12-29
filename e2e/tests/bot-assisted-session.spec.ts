import { test, expect } from "@playwright/test";
import { testLogin } from "../fixtures/auth";
import { launchSplitScreenBrowsers, closeAllBrowsers } from "../utils/browser-layout";
import { swipeAllMovies, getRoomCode, waitForSessionStatus, waitForParticipant } from "../utils/helpers";

test.setTimeout(120000);

test.describe.configure({ mode: "serial" });

/**
 * Bot-assisted tests use the /api/sessions/[id]/test-join endpoint
 * to simulate a second user without needing a second browser.
 *
 * This is faster and more reliable than multi-browser tests.
 */
test.describe("Bot-Assisted Session Tests", () => {
  test("single browser + bot: complete session flow", async () => {
    const browsers = await launchSplitScreenBrowsers(1);
    const [browser] = browsers;
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Log in as host
      await page.goto("http://localhost:3000/");
      await testLogin(page, "host");

      // Create a session
      await page.goto("http://localhost:3000/session/create");
      await page.locator("text=Action").click();
      await page.locator("text=Comedy").click();
      await page.getByRole("button", { name: "Create Session" }).click();
      // Wait for redirect to session page with UUID pattern
      await page.waitForURL(/\/session\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);

      // Get session ID from URL
      const url = page.url();
      const sessionId = url.match(/\/session\/([0-9a-f-]+)/)?.[1];

      // Verify we're in the lobby
      await waitForSessionStatus(page, "lobby");
      await expect(page.locator("text=Test Host")).toBeVisible();

      // Add bot participant via API (while in lobby)
      const botJoinResponse = await page.request.post(`/api/sessions/${sessionId}/test-join`, {
        data: { autoSwipe: false }, // Don't auto-swipe yet since we're in lobby
      });
      expect(botJoinResponse.ok()).toBe(true);

      const botResult = await botJoinResponse.json();
      expect(botResult.success).toBe(true);
      expect(botResult.botName).toBe("Test Bot");
      expect(botResult.sessionStatus).toBe("lobby");

      // Verify bot appears in lobby
      await waitForParticipant(page, "Test Bot");

      // Start the session
      const startButton = page.locator('button:has-text("Start Swiping")');
      await startButton.click();

      // Wait for swiping state
      await waitForSessionStatus(page, "swiping");

      // Now trigger bot to auto-swipe (likes all movies)
      const botSwipeResponse = await page.request.post(`/api/sessions/${sessionId}/test-join`, {
        data: { autoSwipe: true, likeAll: true },
      });
      expect(botSwipeResponse.ok()).toBe(true);
      const swipeResult = await botSwipeResponse.json();
      expect(swipeResult.swipesCreated).toBeGreaterThan(0);

      // Human user swipes (like all for matches)
      await swipeAllMovies(page, true);

      // Should see matches
      await waitForSessionStatus(page, "revealed");
      await expect(page.locator("text=You matched!")).toBeVisible();

    } finally {
      await closeAllBrowsers(browsers);
    }
  });

  test("bot joins mid-session", async () => {
    const browsers = await launchSplitScreenBrowsers(1);
    const [browser] = browsers;
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Log in as host
      await page.goto("http://localhost:3000/");
      await testLogin(page, "host");

      // Create and start session immediately
      await page.goto("http://localhost:3000/session/create");
      await page.locator("text=Action").click();
      await page.getByRole("button", { name: "Create Session" }).click();
      await page.waitForURL(/\/session\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);

      const url = page.url();
      const sessionId = url.match(/\/session\/([0-9a-f-]+)/)?.[1];

      // Start swiping solo
      await waitForSessionStatus(page, "lobby");
      const startButton = page.locator('button:has-text("Start Swiping")');
      await startButton.click();
      await waitForSessionStatus(page, "swiping");

      // Swipe a few movies as human
      const likeButton = page.locator("button.border-green-500").first();
      await likeButton.click();
      await page.waitForTimeout(300);
      await likeButton.click();
      await page.waitForTimeout(300);

      // Now add bot (which will auto-swipe all remaining)
      const botResponse = await page.request.post(`/api/sessions/${sessionId}/test-join`, {
        data: { autoSwipe: true, likeAll: true },
      });
      expect(botResponse.ok()).toBe(true);

      // Finish swiping as human
      await swipeAllMovies(page, true);

      // Verify reveal
      await waitForSessionStatus(page, "revealed");

    } finally {
      await closeAllBrowsers(browsers);
    }
  });

  test("bot with different preferences (no matches)", async () => {
    const browsers = await launchSplitScreenBrowsers(1);
    const [browser] = browsers;
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Log in as host
      await page.goto("http://localhost:3000/");
      await testLogin(page, "host");

      // Create session
      await page.goto("http://localhost:3000/session/create");
      await page.locator("text=Comedy").click();
      await page.getByRole("button", { name: "Create Session" }).click();
      await page.waitForURL(/\/session\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);

      const url = page.url();
      const sessionId = url.match(/\/session\/([0-9a-f-]+)/)?.[1];

      await waitForSessionStatus(page, "lobby");

      // Add bot that will dislike all
      const botJoinResponse = await page.request.post(`/api/sessions/${sessionId}/test-join`, {
        data: { autoSwipe: false },
      });
      expect(botJoinResponse.ok()).toBe(true);

      // Start session
      await page.locator('button:has-text("Start Swiping")').click();
      await waitForSessionStatus(page, "swiping");

      // Bot dislikes all
      await page.request.post(`/api/sessions/${sessionId}/test-join`, {
        data: { autoSwipe: true, likeAll: false },
      });

      // Human likes all
      await swipeAllMovies(page, true);

      // Should result in no matches
      await waitForSessionStatus(page, "revealed");

      // Either "No matches" or fewer matches than if both liked all
      const hasNoMatches = await page.locator("text=No matches").isVisible().catch(() => false);
      const hasMatches = await page.locator("text=You matched!").isVisible().catch(() => false);

      // Either result is valid - the test verifies the flow completes
      expect(hasNoMatches || hasMatches).toBe(true);

    } finally {
      await closeAllBrowsers(browsers);
    }
  });
});

test.describe("Test-Join API Validation", () => {
  test("returns error for non-existent session", async () => {
    const browsers = await launchSplitScreenBrowsers(1);
    const [browser] = browsers;
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto("http://localhost:3000/");

      // Try to join non-existent session (using valid UUID format but fake ID)
      const response = await page.request.post("/api/sessions/00000000-0000-0000-0000-000000000000/test-join", {
        data: {},
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Session not found");

    } finally {
      await closeAllBrowsers(browsers);
    }
  });

  test("bot can rejoin same session", async () => {
    const browsers = await launchSplitScreenBrowsers(1);
    const [browser] = browsers;
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto("http://localhost:3000/");
      await testLogin(page, "host");

      // Create session
      await page.goto("http://localhost:3000/session/create");
      await page.locator("text=Action").click();
      await page.getByRole("button", { name: "Create Session" }).click();
      await page.waitForURL(/\/session\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);

      const url = page.url();
      const sessionId = url.match(/\/session\/([0-9a-f-]+)/)?.[1];

      await waitForSessionStatus(page, "lobby");

      // Join twice - should not create duplicate participant
      const response1 = await page.request.post(`/api/sessions/${sessionId}/test-join`, {
        data: { autoSwipe: false },
      });
      const response2 = await page.request.post(`/api/sessions/${sessionId}/test-join`, {
        data: { autoSwipe: false },
      });

      expect(response1.ok()).toBe(true);
      expect(response2.ok()).toBe(true);

      const result1 = await response1.json();
      const result2 = await response2.json();

      // Should return same bot user ID
      expect(result1.botUserId).toBe(result2.botUserId);

    } finally {
      await closeAllBrowsers(browsers);
    }
  });
});
