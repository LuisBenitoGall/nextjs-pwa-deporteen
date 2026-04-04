import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

// Unit tests run in Node environment (default).
// Component tests use // @vitest-environment jsdom at the top of each file.
export default defineConfig({
  esbuild: {
    // Use React 17+ automatic JSX transform (no need to import React in test files)
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/i18n/**'],
      exclude: [
        'src/lib/supabase/**',
        'src/lib/stripe/**',
        'src/lib/database.types.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // 'server-only' is a Next.js compile-time guard; in tests it's a no-op.
      'server-only': resolve(__dirname, './src/test/server-only-mock.ts'),
    },
  },
})
