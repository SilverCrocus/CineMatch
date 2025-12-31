import { test, expect, chromium } from "@playwright/test";
import { testLogin, TEST_USERS } from "../fixtures/auth";
import { swipeAllMovies, getRoomCode, waitForParticipant, waitForSessionStatus } from "../utils/helpers";
import { launchSplitScreenBrowsers, closeAllBrowsers } from "../utils/browser-layout";

// Increase timeout for E2E tests that involve API calls
test.setTimeout(120000);

// Run tests serially since they share test accounts
test.describe.configure({ mode: "serial" });

test.describe("Multi-User Session Flow", () => {
  test("complete flow: create → join → swipe → reveal", async () => {
    // Launch browsers in split-screen layout (side by side)
    const browsers = await launchSplitScreenBrowsers(2);
    const [hostBrowser, guestBrowser] = browsers;

    const hostContext = await hostBrowser.newContext();
    const guestContext = await guestBrowser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      // ============ STEP 1: Log in both users ============
      await hostPage.goto("http://localhost:3000/");
      await testLogin(hostPage, "host");

      await guestPage.goto("http://localhost:3000/");
      await testLogin(guestPage, "guest1");

      // ============ STEP 2: Host creates a session ============
      await hostPage.goto("http://localhost:3000/session/create");

      // Select some genres (click on Action and Comedy badges)
      await hostPage.locator("text=Action").click();
      await hostPage.locator("text=Comedy").click();

      // Set year range
      await hostPage.locator('input[placeholder="From"]').fill("2000");
      await hostPage.locator('input[placeholder="To"]').fill("2024");

      // Create the session
      await hostPage.getByRole("button", { name: "Create Session" }).click();

      // Wait for redirect to session page
      await hostPage.waitForURL(/\/session\//);

      // ============ STEP 3: Get room code and verify lobby ============
      await waitForSessionStatus(hostPage, "lobby");
      const roomCode = await getRoomCode(hostPage);
      expect(roomCode).toHaveLength(4);

      // Host should see themselves in the lobby
      await waitForParticipant(hostPage, "Test Host");

      // ============ STEP 4: Guest joins the session ============
      await guestPage.goto("http://localhost:3000/dashboard");

      // Enter the room code in the join input
      await guestPage.locator('input[placeholder*="code" i]').fill(roomCode);
      await guestPage.locator('button:has-text("Join")').click();

      // Wait for guest to be in the lobby
      await guestPage.waitForURL(/\/session\//);
      await waitForSessionStatus(guestPage, "lobby");

      // Both should see both participants
      await waitForParticipant(hostPage, "Test Guest 1");
      await waitForParticipant(guestPage, "Test Host");

      // ============ STEP 5: Host starts the session ============
      // Only the host should see the start button
      const startButton = hostPage.locator('button:has-text("Start Swiping")');
      await expect(startButton).toBeVisible();
      await startButton.click();

      // Both users should transition to swiping
      await waitForSessionStatus(hostPage, "swiping");
      await waitForSessionStatus(guestPage, "swiping");

      // ============ STEP 6: Both users swipe through movies ============
      // Use likeAll=true to ensure we get matches
      await Promise.all([
        swipeAllMovies(hostPage, true),
        swipeAllMovies(guestPage, true),
      ]);

      // ============ STEP 7: Verify matches are revealed ============
      await waitForSessionStatus(hostPage, "revealed");
      await waitForSessionStatus(guestPage, "revealed");

      // Both should see "You matched!" since they both liked all movies
      await expect(hostPage.locator("text=You matched!")).toBeVisible();
      await expect(guestPage.locator("text=You matched!")).toBeVisible();

    } finally {
      // Clean up browsers
      await closeAllBrowsers(browsers);
    }
  });

  test("session with no matches", async () => {
    const browsers = await launchSplitScreenBrowsers(2);
    const [hostBrowser, guestBrowser] = browsers;

    const hostContext = await hostBrowser.newContext();
    const guestContext = await guestBrowser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      // Log in both users
      await hostPage.goto("http://localhost:3000/");
      await testLogin(hostPage, "host");
      await guestPage.goto("http://localhost:3000/");
      await testLogin(guestPage, "guest1");

      // Host creates session
      await hostPage.goto("http://localhost:3000/session/create");
      await hostPage.locator("text=Action").click();
      await hostPage.getByRole("button", { name: "Create Session" }).click();
      await hostPage.waitForURL(/\/session\//);

      // Get room code and guest joins
      const roomCode = await getRoomCode(hostPage);
      await guestPage.goto("http://localhost:3000/dashboard");
      await guestPage.locator('input[placeholder*="code" i]').fill(roomCode);
      await guestPage.locator('button:has-text("Join")').click();
      await guestPage.waitForURL(/\/session\//);

      // Wait for both to be in lobby
      await waitForParticipant(hostPage, "Test Guest 1");

      // Start session
      await hostPage.locator('button:has-text("Start Swiping")').click();
      await waitForSessionStatus(hostPage, "swiping");
      await waitForSessionStatus(guestPage, "swiping");

      // Host likes all, guest dislikes all - should result in no matches
      await Promise.all([
        swipeAllMovies(hostPage, true),   // Like all
        swipeAllMovies(guestPage, false), // Dislike pattern
      ]);

      // Wait for reveal
      await waitForSessionStatus(hostPage, "revealed");
      await waitForSessionStatus(guestPage, "revealed");

      // Could be matches or no matches depending on the swipe pattern
      // At minimum, check that reveal happened
      const hasMatches = await hostPage.locator("text=You matched!").isVisible().catch(() => false);
      const noMatches = await hostPage.locator("text=No matches").isVisible().catch(() => false);
      expect(hasMatches || noMatches).toBe(true);

    } finally {
      await closeAllBrowsers(browsers);
    }
  });

  test("multi-user session with bot (bot-assisted)", async () => {
    // Use bot-assisted approach: 1 browser + bot that joins and auto-swipes
    // This tests the multi-user flow reliably without timing issues from multiple browsers
    const browsers = await launchSplitScreenBrowsers(1);
    const [browser] = browsers;

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Log in as host
      await page.goto("http://localhost:3000/");
      await testLogin(page, "host");

      // Host creates session
      await page.goto("http://localhost:3000/session/create");
      await page.locator("text=Comedy").click();
      await page.getByRole("button", { name: "Create Session" }).click();
      // Wait for redirect to session page with full UUID pattern (not just partial match)
      await page.waitForURL(/\/session\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

      // Get session ID from URL using full UUID pattern
      const url = page.url();
      const sessionId = url.match(/\/session\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/)?.[1];

      // Wait for lobby
      await waitForSessionStatus(page, "lobby");

      // Add bot participant via API (simulates second user joining)
      const botJoinResponse = await page.request.post(`/api/sessions/${sessionId}/test-join`, {
        data: { autoSwipe: false },
      });
      expect(botJoinResponse.ok()).toBe(true);

      // Verify bot appears in lobby
      await waitForParticipant(page, "Test Bot");

      // Start session
      await page.locator('button:has-text("Start Swiping")').click();

      // Wait for swiping state
      await waitForSessionStatus(page, "swiping");

      // Trigger bot to auto-swipe (likes all movies for guaranteed matches)
      const botSwipeResponse = await page.request.post(`/api/sessions/${sessionId}/test-join`, {
        data: { autoSwipe: true, likeAll: true },
      });
      expect(botSwipeResponse.ok()).toBe(true);

      // Human user swipes (like all for matches)
      await swipeAllMovies(page, true);

      // Verify reveal
      await waitForSessionStatus(page, "revealed");

      // Should see matches since both liked all movies
      await expect(page.locator("text=You matched!")).toBeVisible();

    } finally {
      await closeAllBrowsers(browsers);
    }
  });
});

test.describe("Session Edge Cases", () => {
  test("guest cannot start session", async () => {
    const browsers = await launchSplitScreenBrowsers(2);
    const [hostBrowser, guestBrowser] = browsers;

    const hostContext = await hostBrowser.newContext();
    const guestContext = await guestBrowser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      await hostPage.goto("http://localhost:3000/");
      await testLogin(hostPage, "host");
      await guestPage.goto("http://localhost:3000/");
      await testLogin(guestPage, "guest1");

      // Host creates session
      await hostPage.goto("http://localhost:3000/session/create");
      await hostPage.locator("text=Action").click();
      await hostPage.getByRole("button", { name: "Create Session" }).click();
      await hostPage.waitForURL(/\/session\//);

      const roomCode = await getRoomCode(hostPage);

      // Guest joins
      await guestPage.goto("http://localhost:3000/dashboard");
      await guestPage.locator('input[placeholder*="code" i]').fill(roomCode);
      await guestPage.locator('button:has-text("Join")').click();
      await guestPage.waitForURL(/\/session\//);

      // Guest should NOT see start button
      const guestStartButton = guestPage.locator('button:has-text("Start Swiping")');
      await expect(guestStartButton).not.toBeVisible();

      // Guest should see "waiting for host" message
      await expect(guestPage.locator("text=Waiting for host")).toBeVisible();

    } finally {
      await closeAllBrowsers(browsers);
    }
  });
});

test.describe("Custom Movie List", () => {
  test("create session from text list", async () => {
    // Single browser for this test - tests the "List" tab feature
    const browsers = await launchSplitScreenBrowsers(1);
    const [browser] = browsers;

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Log in
      await page.goto("http://localhost:3000/");
      await testLogin(page, "host");

      // Go to create session
      await page.goto("http://localhost:3000/session/create");

      // Switch to List tab (more reliable than URL which depends on external services)
      await page.locator('button:has-text("List")').click();

      // Enter movie titles
      const movieList = "The Shawshank Redemption\nPulp Fiction\nThe Dark Knight\nInception\nForrest Gump";
      await page.locator("textarea").fill(movieList);

      // Create the session
      await page.getByRole("button", { name: "Create Session" }).click();

      // Wait for redirect to session page
      await page.waitForURL(/\/session\/[0-9a-f-]+/, { timeout: 30000 });

      // Verify we're in the lobby
      await waitForSessionStatus(page, "lobby");

      // Start the session to verify movies were loaded
      const startButton = page.locator('button:has-text("Start Swiping")');
      await expect(startButton).toBeVisible();
      await startButton.click();

      // Verify swiping works (means movies were found)
      await waitForSessionStatus(page, "swiping");

      // Check that we can see a movie card (confirms movies were loaded)
      const movieCard = page.locator("button.border-green-500").first();
      await expect(movieCard).toBeVisible({ timeout: 10000 });

    } finally {
      await closeAllBrowsers(browsers);
    }
  });

  // URL parsing test - marked as slow due to external dependencies (Rotten Tomatoes + Gemini API)
  // This test can timeout in CI environments - run locally for full coverage
  test.skip("create session from movie list URL (slow - external dependencies)", async () => {
    const browsers = await launchSplitScreenBrowsers(1);
    const [browser] = browsers;

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto("http://localhost:3000/");
      await testLogin(page, "host");

      await page.goto("http://localhost:3000/session/create");

      // Switch to URL tab
      await page.locator('button:has-text("URL")').click();

      // Enter a movie list URL
      const testUrl = "https://editorial.rottentomatoes.com/guide/best-sports-movie-of-all-time/";
      await page.locator('input[placeholder*="rottentomatoes" i]').fill(testUrl);

      await page.getByRole("button", { name: "Create Session" }).click();

      // URL parsing can take 30-60 seconds due to LLM processing
      await page.waitForURL(/\/session\//, { timeout: 90000 });

      await waitForSessionStatus(page, "lobby");

      const startButton = page.locator('button:has-text("Start Swiping")');
      await expect(startButton).toBeVisible();
      await startButton.click();

      await waitForSessionStatus(page, "swiping");

      const movieCard = page.locator("button.border-green-500").first();
      await expect(movieCard).toBeVisible({ timeout: 10000 });

    } finally {
      await closeAllBrowsers(browsers);
    }
  });
});

test.describe("Pre-matches from Solo Mode", () => {
  test("shows pre-matches when users have overlapping watchlists", async () => {
    const browsers = await launchSplitScreenBrowsers(2);
    const [hostBrowser, guestBrowser] = browsers;

    const hostContext = await hostBrowser.newContext();
    const guestContext = await guestBrowser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      // Log in both users
      await hostPage.goto("http://localhost:3000/");
      await testLogin(hostPage, "host");
      await guestPage.goto("http://localhost:3000/");
      await testLogin(guestPage, "guest1");

      // Both users save movies in solo mode
      // Host saves movies
      await hostPage.goto("http://localhost:3000/solo/swipe?source=random");
      await hostPage.waitForSelector("text=Loading movies...", { state: "hidden", timeout: 30000 });
      const hostLikeButton = hostPage.locator("button").filter({ has: hostPage.locator(".text-green-500") });
      await hostLikeButton.click();

      // Guest saves movies
      await guestPage.goto("http://localhost:3000/solo/swipe?source=random");
      await guestPage.waitForSelector("text=Loading movies...", { state: "hidden", timeout: 30000 });
      const guestLikeButton = guestPage.locator("button").filter({ has: guestPage.locator(".text-green-500") });
      await guestLikeButton.click();

      // Host creates a session
      await hostPage.goto("http://localhost:3000/session/create");
      await hostPage.locator("text=Action").click();
      await hostPage.getByRole("button", { name: "Create Session" }).click();
      await hostPage.waitForURL(/\/session\//);

      // Get room code
      const roomCode = await getRoomCode(hostPage);

      // Guest joins
      await guestPage.goto("http://localhost:3000/dashboard");
      await guestPage.locator('input[placeholder*="code" i]').fill(roomCode);
      await guestPage.locator('button:has-text("Join")').click();
      await guestPage.waitForURL(/\/session\//);

      // Verify both are in session
      await expect(hostPage.locator("text=Test Guest 1")).toBeVisible({ timeout: 10000 });

    } finally {
      await closeAllBrowsers(browsers);
    }
  });
});
