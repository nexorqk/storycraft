import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@storycraft/shared': resolve(
        __dirname,
        '../../packages/shared/src/index.ts',
      ),
    },
  },
});
