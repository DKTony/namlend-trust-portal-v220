import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { login, baseURL } from './helpers/auth';

test('Header Dashboard button navigates correctly', async ({ page }) => {
  await login(page, true);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(baseURL);
  // Ensure header is visible before clicking
  await expect(page.getByTestId('dashboard-button-header')).toBeVisible();
  await page.getByTestId('dashboard-button-header').click();
  await page.waitForURL(/\/(admin|dashboard)/);
  expect(/\/(admin|dashboard)/.test(page.url())).toBeTruthy();
});
