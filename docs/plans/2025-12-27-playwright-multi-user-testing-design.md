# Playwright Multi-User E2E Testing for CineMatch

## Overview

Add end-to-end testing that simulates multiple users interacting with CineMatch simultaneously. This replaces manual testing (coordinating with friends on separate devices) with automated tests that run locally and in CI.

## Problem

Currently, testing multi-user flows requires:
- Two real people on two devices
- Manual coordination ("okay, now join my room")
- Time-consuming and error-prone

## Solution

Use Playwright's browser contexts to simulate multiple isolated users in a single test. Each context has separate cookies/storage, acting as independent logged-in users.

## Technical Approach

### Test Account Strategy

Create 3 permanent test accounts in the database:

| Email | Name | Purpose |
|-------|------|---------|
| `test-host@cinematch.test` | Test Host | Creates sessions |
| `test-guest1@cinematch.test` | Test Guest 1 | Joins sessions |
| `test-guest2@cinematch.test` | Test Guest 2 | Third participant |

These accounts are seeded once and persist. Tests clean up sessions/swipes between runs, not the accounts themselves.

### Authentication Strategy

Since CineMatch uses Google OAuth, tests cannot log in through Google directly (CAPTCHAs, bot detection). Instead, add a test-only auth bypass:

```typescript
// app/api/auth/test-login/route.ts
// Only available when NODE_ENV !== 'production'

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'Not available' }, { status: 404 });
  }

  const { userId } = await request.json();
  // Set NextAuth session cookie for the test user
  // Return success
}
```

### Test Structure

```typescript
test('complete session: create -> join -> swipe -> reveal', async ({ browser }) => {
  // Create isolated browser contexts
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  // Log in both users via test bypass
  await testLogin(hostPage, 'test-host');
  await testLogin(guestPage, 'test-guest1');

  // Host creates session with filters
  await hostPage.goto('/create');
  await hostPage.click('[data-testid="genre-action"]');
  await hostPage.fill('[data-testid="year-from"]', '2000');
  await hostPage.click('[data-testid="create-session"]');

  const roomCode = await hostPage.textContent('[data-testid="room-code"]');

  // Guest joins
  await guestPage.goto('/join');
  await guestPage.fill('[data-testid="code-input"]', roomCode);
  await guestPage.click('[data-testid="join-button"]');

  // Host starts session
  await hostPage.click('[data-testid="start-session"]');

  // Both swipe through movies
  await swipeAllMovies(hostPage);
  await swipeAllMovies(guestPage);

  // Verify matches revealed
  await expect(hostPage.locator('[data-testid="matches-list"]')).toBeVisible();
  await expect(guestPage.locator('[data-testid="matches-list"]')).toBeVisible();
});
```

### Running Tests

```bash
# Visual mode - watch both browser windows
npm run test:e2e:headed

# Debug mode - step through line by line
npm run test:e2e:debug

# CI mode - headless, fast
npm run test:e2e
```

## File Structure

```
cinematch/
├── e2e/
│   ├── fixtures/
│   │   └── auth.ts               # testLogin() helper
│   ├── tests/
│   │   ├── session-flow.spec.ts  # Main multi-user test
│   │   ├── create-session.spec.ts
│   │   ├── join-session.spec.ts
│   │   └── swipe-and-reveal.spec.ts
│   └── utils/
│       └── helpers.ts            # Shared helpers
│
├── app/api/auth/test-login/
│   └── route.ts                  # Test-only auth bypass
│
├── scripts/
│   └── seed-test-users.ts        # Creates test accounts
│
├── playwright.config.ts
└── package.json                  # New e2e scripts
```

## Implementation Steps

1. **Install Playwright**
   - `npm init playwright@latest`
   - Configure for Next.js (webServer, baseURL)

2. **Create test auth bypass**
   - Add `/api/auth/test-login` route
   - Only enabled in dev/test environments
   - Sets NextAuth session directly

3. **Seed test users**
   - Write `scripts/seed-test-users.ts`
   - Run locally and on Render database

4. **Write test utilities**
   - `testLogin(page, userId)` - authenticates via bypass
   - `swipeAllMovies(page)` - swipes through entire deck
   - Other shared helpers as needed

5. **Add data-testid attributes**
   - Add to components as tests require them
   - Examples: `room-code`, `join-button`, `swipe-deck`, `matches-list`

6. **Write tests**
   - Start with main session flow
   - Add edge cases (no matches, user leaves, etc.)

7. **Add npm scripts**
   ```json
   {
     "test:e2e": "playwright test",
     "test:e2e:headed": "playwright test --headed",
     "test:e2e:debug": "playwright test --debug"
   }
   ```

8. **(Optional) GitHub Actions**
   - Add `.github/workflows/playwright.yml`
   - Run on push/PR

## Benefits

- **No more manual testing** with friends on multiple devices
- **Visual debugging** - watch tests run in real browsers
- **CI integration** - catch regressions automatically
- **Fast iteration** - run full flow in seconds

## References

- [Playwright Browser Contexts](https://playwright.dev/docs/browser-contexts)
- [Playwright with Next.js](https://nextjs.org/docs/testing#playwright)
- Research validated this as industry standard (see Tavily search results)
