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

    // Report critical/serious violations by default. Make this blocking only
    // when a release explicitly opts into the stricter a11y gate.
    const critical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    if (critical.length > 0) {
      test.info().annotations.push({
        type: 'a11y',
        description: `${name}: ${critical.length} critical/serious violation(s)`,
      });
    }
    if (process.env.E2E_A11Y_STRICT === 'true') {
      expect(critical, `${name} has critical a11y violations`).toHaveLength(0);
    }
  });
}
