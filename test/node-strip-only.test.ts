// oxlint-disable-next-line import/no-nodejs-modules -- Node's own strip-only parser is the thing under test.
import { stripTypeScriptTypes } from 'node:module';
// oxlint-disable-next-line import/no-nodejs-modules -- Walk the test sources Node runs directly.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

// Meta SF24 (opus-pins, 2026-11-27): Node 26 runs the headless children (test/fixtures/headless/*, test/proof/*) with
// no --experimental-transform-types (4d1676a), so a parameter property, an enum or a namespace in any file they import
// fails at load ("TypeScript parameter property is not supported in strip-only mode", ci21-source on 150727a).
// Every TypeScript file under the folders those children import from must strip with Node's own strip-only parser.
const ROOTS = ['test/fixtures', 'test/proof'];

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsFiles(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') ? [path] : [];
  });
}

test('every headless child source strips with Node strip-only types', () => {
  const refused: string[] = [];
  for (const file of ROOTS.flatMap(tsFiles)) {
    try {
      stripTypeScriptTypes(readFileSync(file, 'utf8'), { mode: 'strip' });
    } catch (error) {
      refused.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  expect(refused).toEqual([]);
});
