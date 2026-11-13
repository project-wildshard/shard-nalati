import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const root = 'src/shards/nalati-grasslands';
const commands = [
  ['crag bank', 'scripts/bake-nalati-crags.mjs'],
  ['POI contact banks', `${root}/bake/bake-nalati-poi-contacts.mjs`, '--rebake-contacts'],
];

function bake(script, args) {
  const result = spawnSync(process.execPath, [
    '--experimental-transform-types', '--no-warnings', '--import', '@wildshard/engine/scripts/bake-loader.mjs',
    script, ...args,
  ], { encoding: 'utf8', timeout: 30_000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}

for (const [name, script, ...args] of commands) {
  test(`the real Nalati author command reproduces the shipped ${name}`, () => {
    bake(script, [...args, '--check']);
  });
}

test('the real headless sign baker emits a lettered atlas for every shipped board', () => {
  mkdirSync('tmp', { recursive: true });
  const output = mkdtempSync(resolve('tmp/nalati-author-sign-'));
  try {
    bake(`${root}/bake/bake-nalati-sign-atlases.mjs`, [`--output-root=${output}`]);
    const manifest = 'data/signAtlases.json';
    const expected = JSON.parse(readFileSync(join(root, manifest), 'utf8'));
    const emitted = JSON.parse(readFileSync(join(output, manifest), 'utf8'));
    assert.deepEqual(emitted, expected);
    for (const { width, height, source } of Object.values(expected)) {
      const pixels = readFileSync(join(output, source));
      assert.equal(pixels.length, width * height * 4);
      // The manifest's rows each correspond to a 64-pixel board. Font
      // rasterization can vary, but every board must contain painted lettering.
      for (let top = 0; top < height; top += 64) {
        const board = pixels.subarray(top * width * 4, (top + 64) * width * 4);
        assert.ok(board.some((red, index) => index % 4 === 0 && red > 220
          && board[index + 1] > 200 && board[index + 2] > 175 && board[index + 3] === 255), `${source} has an unlettered board at ${top}`);
      }
    }
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});
