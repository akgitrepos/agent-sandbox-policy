import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@asp/schemas': resolve(rootDir, '../schemas/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
  },
});
