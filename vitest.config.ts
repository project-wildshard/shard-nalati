import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { viteTmpRoot } from './scripts/vite-tmp.mjs';

const engine = path.dirname(createRequire(import.meta.url).resolve('@wildshard/engine/package.json'));
const rapierAlias = [
  { find: /^\.\/rapier_wasm3d(\.js)?$/u, replacement: path.join(engine, 'src/server/engine/physics/rapierBindings.ts') },
  { find: /^@dimforge\/rapier3d-simd$/u, replacement: createRequire(path.join(engine, 'package.json')).resolve('@dimforge/rapier3d-simd/rapier.js') },
];

export default defineConfig({
  plugins: [viteTmpRoot()],
  resolve: { alias: rapierAlias, dedupe: ['three', 'valibot'] },
  test: {
    execArgv: ['--import', path.resolve('node_modules/@wildshard/sharddev/src/sharddev/bake/format-hook.mjs')],
    testTimeout: 30_000,
    environment: 'node',
    server: { deps: { inline: [/@wildshard\//u] } },
    include: ['src/shards/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['**/node_modules/**', ...JSON.parse(readFileSync('test/lift-pending.json', 'utf8'))],
    passWithNoTests: true,
  },
});
