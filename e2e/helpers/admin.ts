import { Page } from '@playwright/test';

export async function ensureAdminReady(page: Page): Promise<void> {
  await page.waitForURL(/\/admin/);
  await page.getByTestId('sidebar-trigger').waitFor({ state: 'visible', timeout: 30000 });
}

export async function openAdminTab(page: Page, tabId: string): Promise<void> {
  await ensureAdminReady(page);

  // Open the drawer first; navigation items live inside it.
  const sidebarTrigger = page.getByTestId('sidebar-trigger');
  await sidebarTrigger.click();

  const nav = page.getByTestId(`sidebar-nav-${tabId}`);
  await nav.waitFor({ state: 'visible', timeout: 20000 });
  await nav.scrollIntoViewIfNeeded();

  // Some themed transforms can make Playwright consider the element outside viewport.
  // Fallback to DOM click for stability in E2E.
  try {
    await nav.click({ timeout: 10000 });
  } catch {
    await nav.evaluate((el: HTMLElement) => el.click());
  }

  // Wait for drawer overlay to close before interacting with page content.
  const backdrop = page.getByTestId('sidebar-backdrop');
  await backdrop.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
}
