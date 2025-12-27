import { Page } from "@playwright/test";

/**
 * Test user emails - must match the seeded test users
 */
export const TEST_USERS = {
  host: "test-host@cinematch.test",
  guest1: "test-guest1@cinematch.test",
  guest2: "test-guest2@cinematch.test",
} as const;

export type TestUserKey = keyof typeof TEST_USERS;

/**
 * Log in as a test user by calling the test-login API endpoint.
 * This bypasses Google OAuth for testing purposes.
 */
export async function testLogin(page: Page, user: TestUserKey): Promise<void> {
  const email = TEST_USERS[user];

  const response = await page.request.post("/api/auth/test-login", {
    data: { email },
  });

  if (!response.ok()) {
    const body = await response.json();
    throw new Error(`Failed to log in as ${user}: ${body.error || response.status()}`);
  }

  // Reload the page to pick up the new session cookie
  await page.reload();
}

/**
 * Log out the current user
 */
export async function testLogout(page: Page): Promise<void> {
  await page.goto("/api/auth/signout");
  await page.reload();
}
