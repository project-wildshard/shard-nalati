// oxlint-disable-next-line import/no-nodejs-modules -- Execute the actual producer with its unchanged original observation helper.
import { execFileSync } from 'node:child_process'
// oxlint-disable-next-line import/no-nodejs-modules -- Resolve this fixture's own source tree.
import { resolve } from 'node:path'
// oxlint-disable-next-line import/no-nodejs-modules -- Bind native generator execution to this checkout's Node.
import { execPath } from 'node:process'
// oxlint-disable-next-line import/no-nodejs-modules -- Preserve typed arrays, signed zero and all original nested values.
import { deserialize } from 'node:v8'

import { expect, test } from 'vitest'

import original from './fixtures/geometry-cache-author-original.json' with { type: 'json' }

test('granite and ordinary/scrambled blobs retain all original geometry bits and stream state', () => {
  const wire = execFileSync(
    execPath,
    [
      '--import',
      import.meta.resolve('@wildshard/engine/scripts/sim-node-loader.mjs'),
      '--input-type=module',
      '-e',
      String.raw`import {serialize} from 'node:v8';
import {geometryCacheAuthorObservation} from './test/fixtures/geometry-cache-author-observation.ts';
process.stdout.write(serialize(geometryCacheAuthorObservation()));`,
    ],
    { cwd: resolve(import.meta.dirname, '..'), timeout: 9000 },
  )
  const actual: unknown = deserialize(wire)
  expect(actual).toEqual(original)
}, 10_000)
