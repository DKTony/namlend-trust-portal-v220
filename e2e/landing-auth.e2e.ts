/**
 * Guest landing → auth CTAs. No credentials: these only assert routing and form mode.
 */
import { expect, test } from '@playwright/test';
import { baseURL } from './helpers/auth';

test.describe('Landing auth CTAs', () => {
  test('desktop Sign In opens the login form', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${baseURL}/`);

    await page.getByTestId('landing-signin-button').click();

    await expect(page).toHaveURL(/\/auth(\?|$)/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId('email-input')).toBeVisible();
  });

  test('desktop Sign Up opens the create-account form', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${baseURL}/`);

    await page.getByTestId('landing-signup-button').click();

    await expect(page).toHaveURL(/\/auth\?mode=signup/);
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId('signup-email-input')).toBeVisible();
  });

  test('desktop Apply Now still reaches /auth for guests', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${baseURL}/`);

    await page.getByTestId('landing-apply-now-button').click();

    await expect(page).toHaveURL(/\/auth(\?|$)/);
    await expect(page.getByTestId('email-input')).toBeVisible({ timeout: 15000 });
  });

  test('compact menu Sign In opens the login form', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/`);

    await page.getByTestId('landing-mobile-menu-trigger').click();
    await expect(page.getByTestId('landing-signin-button-mobile')).toBeVisible();
    await page.getByTestId('landing-signin-button-mobile').click();

    await expect(page).toHaveURL(/\/auth(\?|$)/);
    await expect(page.getByTestId('email-input')).toBeVisible({ timeout: 15000 });
  });
});
