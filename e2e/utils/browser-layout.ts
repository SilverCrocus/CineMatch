import { chromium, Browser } from "@playwright/test";

/**
 * Screen layout configuration for multi-user tests.
 * Positions browser windows in a split-screen layout like co-op gaming.
 *
 * Note: Window positioning via Chrome args may not work on all systems (especially macOS).
 * The viewport sizes are set to help with visual testing even if positioning doesn't auto-work.
 */

interface WindowConfig {
  width: number;
  height: number;
  // Position hints (may not work on all systems)
  x: number;
  y: number;
}

/**
 * Get viewport sizes for N users.
 * Smaller viewports for more users to fit on screen.
 */
function getViewportSizes(userCount: number): { width: number; height: number }[] {
  if (userCount === 1) {
    return [{ width: 800, height: 700 }];
  } else if (userCount === 2) {
    return [
      { width: 600, height: 700 },
      { width: 600, height: 700 },
    ];
  } else if (userCount === 3) {
    return [
      { width: 500, height: 500 },
      { width: 500, height: 500 },
      { width: 500, height: 500 },
    ];
  } else {
    // 4 users - 2x2 grid
    return [
      { width: 450, height: 450 },
      { width: 450, height: 450 },
      { width: 450, height: 450 },
      { width: 450, height: 450 },
    ];
  }
}

/**
 * Launch multiple browsers for split-screen testing.
 * Returns array of browsers with appropriately sized viewports.
 *
 * TIP: On macOS, you may need to manually arrange windows side-by-side.
 * Use macOS Split View (hold green button) or drag windows to edges.
 */
export async function launchSplitScreenBrowsers(count: number): Promise<Browser[]> {
  const viewports = getViewportSizes(count);
  const browsers: Browser[] = [];

  console.log(`\n🎬 Launching ${count} browser${count > 1 ? "s" : ""} for split-screen testing...`);
  if (count > 1) {
    console.log("💡 TIP: Arrange windows side-by-side for best viewing experience\n");
  }

  for (let i = 0; i < count; i++) {
    const viewport = viewports[i];
    // Stagger window positions (may not work on all systems, but worth trying)
    const xOffset = i * (viewport.width + 20);

    const browser = await chromium.launch({
      headless: false,
      args: [
        `--window-position=${xOffset},50`,
        `--window-size=${viewport.width + 50},${viewport.height + 100}`,
        "--disable-infobars",
        "--disable-features=Translate",
      ],
    });
    browsers.push(browser);
  }

  return browsers;
}

/**
 * Close all browsers in the array.
 */
export async function closeAllBrowsers(browsers: Browser[]): Promise<void> {
  await Promise.all(browsers.map((b) => b.close()));
}
