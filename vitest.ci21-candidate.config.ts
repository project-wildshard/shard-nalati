import { defineConfig } from 'vitest/config';
import base from './vitest.config.ts';

// Pending originals retain their engine inventory entry. This separate
// blocking candidate leg admits complete public source before C11.
export default defineConfig({ ...base, test: { ...base.test,
  include: ['test/ci21-candidate/**/*.test.ts'], exclude: ['**/node_modules/**'],
} });
