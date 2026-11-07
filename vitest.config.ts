/**
 * Runs every suite under jsdom with Testing Library's cleanup between tests.
 * A suite that needs no DOM opts into node with a `@vitest-environment node`
 * comment.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['{src,test}/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['test/setup.ts']
  }
});
