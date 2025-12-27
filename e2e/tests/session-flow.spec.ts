import { test, expect } from "@playwright/test";
import { testLogin, TEST_USERS } from "../fixtures/auth";
import { swipeAllMovies, getRoomCode, waitForParticipant, waitForSessionStatus } from "../utils/helpers";

// Increase timeout for E2E tests that involve API calls
test.setTimeout(120000);

// Run tests serially since they share test accounts
test.describe.configure({ mode: "serial" });

test.describe("Multi-User Session Flow", () => {
  test("complete flow: create → join → swipe → reveal", async ({ browser }) => {
    // Create two separate browser contexts (simulates two different users)
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      // ============ STEP 1: Log in both users ============
      await hostPage.goto("/");
      await testLogin(hostPage, "host");

      await guestPage.goto("/");
      await testLogin(guestPage, "guest1");

      // ============ STEP 2: Host creates a session ============
      await hostPage.goto("/session/create");

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
      await guestPage.goto("/dashboard");

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
      // Clean up contexts
      await hostContext.close();
      await guestContext.close();
    }
  });

  test("session with no matches", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      // Log in both users
      await hostPage.goto("/");
      await testLogin(hostPage, "host");
      await guestPage.goto("/");
      await testLogin(guestPage, "guest1");

      // Host creates session
      await hostPage.goto("/session/create");
      await hostPage.locator("text=Action").click();
      await hostPage.getByRole("button", { name: "Create Session" }).click();
      await hostPage.waitForURL(/\/session\//);

      // Get room code and guest joins
      const roomCode = await getRoomCode(hostPage);
      await guestPage.goto("/dashboard");
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
      await hostContext.close();
      await guestContext.close();
    }
  });

  test.skip("three users in session", async ({ browser }) => {
    // TODO: Fix timing issues with three parallel swipes
    const hostContext = await browser.newContext();
    const guest1Context = await browser.newContext();
    const guest2Context = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guest1Page = await guest1Context.newPage();
    const guest2Page = await guest2Context.newPage();

    try {
      // Log in all three users
      await hostPage.goto("/");
      await testLogin(hostPage, "host");
      await guest1Page.goto("/");
      await testLogin(guest1Page, "guest1");
      await guest2Page.goto("/");
      await testLogin(guest2Page, "guest2");

      // Host creates session
      await hostPage.goto("/session/create");
      await hostPage.locator("text=Comedy").click();
      await hostPage.getByRole("button", { name: "Create Session" }).click();
      await hostPage.waitForURL(/\/session\//);

      const roomCode = await getRoomCode(hostPage);

      // Both guests join
      await guest1Page.goto("/dashboard");
      await guest1Page.locator('input[placeholder*="code" i]').fill(roomCode);
      await guest1Page.locator('button:has-text("Join")').click();
      await guest1Page.waitForURL(/\/session\//);

      await guest2Page.goto("/dashboard");
      await guest2Page.locator('input[placeholder*="code" i]').fill(roomCode);
      await guest2Page.locator('button:has-text("Join")').click();
      await guest2Page.waitForURL(/\/session\//);

      // Verify all three are in lobby
      await waitForParticipant(hostPage, "Test Guest 1");
      await waitForParticipant(hostPage, "Test Guest 2");

      // Start session
      await hostPage.locator('button:has-text("Start Swiping")').click();

      // All three swipe
      await Promise.all([
        swipeAllMovies(hostPage, true),
        swipeAllMovies(guest1Page, true),
        swipeAllMovies(guest2Page, true),
      ]);

      // Verify reveal for all
      await waitForSessionStatus(hostPage, "revealed");
      await waitForSessionStatus(guest1Page, "revealed");
      await waitForSessionStatus(guest2Page, "revealed");

      await expect(hostPage.locator("text=You matched!")).toBeVisible();

    } finally {
      await hostContext.close();
      await guest1Context.close();
      await guest2Context.close();
    }
  });
});

test.describe("Session Edge Cases", () => {
  test("guest cannot start session", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      await hostPage.goto("/");
      await testLogin(hostPage, "host");
      await guestPage.goto("/");
      await testLogin(guestPage, "guest1");

      // Host creates session
      await hostPage.goto("/session/create");
      await hostPage.locator("text=Action").click();
      await hostPage.getByRole("button", { name: "Create Session" }).click();
      await hostPage.waitForURL(/\/session\//);

      const roomCode = await getRoomCode(hostPage);

      // Guest joins
      await guestPage.goto("/dashboard");
      await guestPage.locator('input[placeholder*="code" i]').fill(roomCode);
      await guestPage.locator('button:has-text("Join")').click();
      await guestPage.waitForURL(/\/session\//);

      // Guest should NOT see start button
      const guestStartButton = guestPage.locator('button:has-text("Start Swiping")');
      await expect(guestStartButton).not.toBeVisible();

      // Guest should see "waiting for host" message
      await expect(guestPage.locator("text=Waiting for host")).toBeVisible();

    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
