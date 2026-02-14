import { Page } from '@playwright/test';

export async function ensureAdminReady(page: Page): Promise<void> {
  await page.waitForURL(/\/admin/);
  await page.getByTestId('sidebar-trigger').waitFor({ state: 'visible', timeout: 30000 });
}

export async function openAdminTab(page: Page, tabId: string): Promise<void> {
  await ensureAdminReady(page);
  const sidebarTrigger = page.getByTestId('sidebar-trigger');
  if (await sidebarTrigger.isVisible().catch(() => false)) {
    await sidebarTrigger.click();
  }
  const nav = page.getByTestId(`sidebar-nav-${tabId}`);
  await nav.waitFor({ state: 'visible', timeout: 20000 });
  await nav.click();
}
