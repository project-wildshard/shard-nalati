// Meta QA 11-25 row 87: a run of src/scripts/solid-owners.mjs without the page put the pieces' wood back over the page's
// own materials (the hay pile's grass, the Kunes bridge's planks, the dungeon's metal and stone). The page's choices are
// recorded in src/data/solid-materials.json; the rows and the tool must agree, so a drift fails here.
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
// @ts-expect-error -- a plain .mjs tool with no declarations
import { expectedSolids, layoutNames, withChoices } from '../src/scripts/solid-owners.mjs';

const read = (path: string): unknown => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
type Rows = { solids: { ownerId?: string; material?: string }[] };

test('the committed physics rows are what solid-owners writes', () => {
  const rows = read('src/data/physicsRows.json') as Rows;
  const { materials } = read('src/data/solid-materials.json') as { materials: Record<string, { owner: string; material: string }> };
  const expected = expectedSolids(rows, materials) as Rows['solids'];
  const drift = expected.flatMap((solid, index) => {
    const row = rows.solids[index];
    return row?.ownerId === solid.ownerId && row?.material === solid.material ? [] : [`#${index} ${row?.ownerId} ${row?.material} -> ${solid.material}`];
  });
  expect(drift).toEqual([]);
  expect(materials['855']).toEqual({ owner: 'piece:nalati-grasslands/hay-pile', material: 'grass' });
});

test('a recorded choice the layout no longer puts there fails', () => {
  const rows = read('src/data/physicsRows.json') as Rows;
  expect(() => withChoices(layoutNames(rows), { 855: { owner: 'piece:nalati-grasslands/elsewhere', material: 'grass' } })).toThrow(/solid #855/u);
});
