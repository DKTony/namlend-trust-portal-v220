import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Convex backend test project. Runs the in-memory `convex-test` harness against
 * convex/**\/*.test.ts under the edge-runtime environment (Convex functions run
 * in a V8 isolate, not jsdom). The frontend Vitest project (vitest.config.ts)
 * continues to cover src/ under jsdom.
 */
export default defineConfig({
  test: {
    environment: 'edge-runtime',
    include: ['convex/**/*.test.ts'],
    server: { deps: { inline: ['convex-test'] } },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
