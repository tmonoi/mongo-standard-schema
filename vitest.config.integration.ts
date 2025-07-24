import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/mongodb-memory-server.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['node_modules/', 'dist/'],
  },
});
