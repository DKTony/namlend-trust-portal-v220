import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility (a11y) tests using axe-core.
 * Scans key pages for WCAG 2.1 Level A & AA violations.
 * Non-blocking in CI — violations are reported but don't fail the build yet.
 */

const pages = [
  { name: 'Landing Page', path: '/' },
  { name: 'Auth Page', path: '/auth' },
];

for (const { name, path } of pages) {
  test(`${name} has no critical a11y violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    // Log violations for debugging
    if (results.violations.length > 0) {
      console.log(`\n[a11y] ${name} — ${results.violations.length} violation(s):`);
      for (const v of results.violations) {
        console.log(`  - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
      }
    }

    // Only fail on critical/serious violations
    const critical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(critical, `${name} has critical a11y violations`).toHaveLength(0);
  });
}
