import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Integration tests need DATABASE_URL, which lives in .env.local (never committed) — Vitest
// doesn't auto-load it the way Next.js does for the app itself. Skipped if the file or the
// Node version's native env-file loader isn't available; integration tests then self-skip via
// their own DATABASE_URL check rather than crashing the whole run.
try {
  process.loadEnvFile(path.resolve(import.meta.dirname, '.env.local'));
} catch {
  // no .env.local, or Node version without loadEnvFile — integration tests will skip themselves
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    // Integration tests hit one shared live database and several of them grab "any active
    // product"/"the seeded customer" via findFirst rather than isolated fixtures — running
    // test files in parallel (Vitest's default) lets one file's fixture get consumed by
    // another file's concurrently-running test, causing real cross-test races.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
});
