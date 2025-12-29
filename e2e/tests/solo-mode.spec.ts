import { test, expect } from "@playwright/test";
import { testLogin } from "../fixtures/auth";
import { launchSplitScreenBrowsers, closeAllBrowsers } from "../utils/browser-layout";

test.setTimeout(120000);

test.describe("Solo Mode", () => {
  test("can navigate to solo mode from dashboard", async () => {
    const browsers = await launchSplitScreenBrowsers(1);
    const [browser] = browsers;
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto("http://localhost:3000/");
      await testLogin(page, "host");

      await page.goto("http://localhost:3000/dashboard");

      // Click solo mode card
      await page.locator("text=Solo Mode").click();

      // Should be on solo mode page
      await expect(page).toHaveURL(/\/solo$/);

      // Should see all four options
      await expect(page.locator("text=Similar to...")).toBeVisible();
      await expect(page.locator("text=By Genre")).toBeVisible();
      await expect(page.locator("text=Surprise Me")).toBeVisible();
      await expect(page.locator("text=My List")).toBeVisible();
    } finally {
      await closeAllBrowsers(browsers);
    }
  });

  test("can swipe movies in surprise me mode", async () => {
    const browsers = await launchSplitScreenBrowsers(1);
    const [browser] = browsers;
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto("http://localhost:3000/");
      await testLogin(page, "host");

      await page.goto("http://localhost:3000/solo");

      // Click surprise me
      await page.locator("text=Surprise Me").click();

      // Should be on swipe page
      await expect(page).toHaveURL(/\/solo\/swipe/);

      // Wait for movies to load
      await page.waitForSelector("text=Loading movies...", { state: "hidden", timeout: 30000 });

      // Swipe right on first movie (save it)
      const likeButton = page.locator("button").filter({ has: page.locator(".text-green-500") });
      await expect(likeButton).toBeVisible();
      await likeButton.click();

      // Should show "1 saved"
      await expect(page.locator("text=1 saved")).toBeVisible();

      // Swipe left on next movie (skip it)
      const skipButton = page.locator("button").filter({ has: page.locator(".text-red-500") });
      await skipButton.click();

      // Should still show "1 saved"
      await expect(page.locator("text=1 saved")).toBeVisible();
    } finally {
      await closeAllBrowsers(browsers);
    }
  });

  test("can view and remove from my list", async () => {
    const browsers = await launchSplitScreenBrowsers(1);
    const [browser] = browsers;
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto("http://localhost:3000/");
      await testLogin(page, "host");

      // First add a movie via swiping
      await page.goto("http://localhost:3000/solo/swipe?source=random");
      await page.waitForSelector("text=Loading movies...", { state: "hidden", timeout: 30000 });

      const likeButton = page.locator("button").filter({ has: page.locator(".text-green-500") });
      await likeButton.click();

      // Go to my list
      await page.goto("http://localhost:3000/solo/list");

      // Wait for list to load (Loading text disappears)
      await page.waitForSelector("text=Loading...", { state: "hidden", timeout: 10000 });

      // Should see the Saved tab with count (shows saved movies)
      await expect(page.locator("text=Saved")).toBeVisible();

      // Click remove on first movie (button is always visible now)
      await page.locator("text=Remove").first().click();

    } finally {
      await closeAllBrowsers(browsers);
    }
  });

  test("can browse by genre", async () => {
    const browsers = await launchSplitScreenBrowsers(1);
    const [browser] = browsers;
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto("http://localhost:3000/");
      await testLogin(page, "host");

      await page.goto("http://localhost:3000/solo");

      // Click by genre
      await page.locator("text=By Genre").click();

      // Should see genre selection UI
      await expect(page.locator("text=Select genres")).toBeVisible();

      // Click action genre badge to select it
      await page.locator("text=Action").click();

      // Click "Start Swiping" button to navigate
      await page.getByRole("button", { name: /Start Swiping/i }).click();

      // Should navigate to swipe with browse source and genres param
      await expect(page).toHaveURL(/\/solo\/swipe\?source=browse&genres=28/);
    } finally {
      await closeAllBrowsers(browsers);
    }
  });
});
