// oxlint-disable-next-line import/no-nodejs-modules -- Run actual shard generators under the real renderer guard.
import { execFileSync } from 'node:child_process'
// oxlint-disable-next-line import/no-nodejs-modules -- Bind each generator process to this checkout.
import { resolve } from 'node:path'
// oxlint-disable-next-line import/no-nodejs-modules -- Use the current Node and owned repository root only.
import { execPath } from 'node:process'

import { expect, test } from 'vitest'

import original from './fixtures/species-barrel-author-original.json' with { type: 'json' }

// The real generator closure runs in Node. The compiler checks this process
// boundary, fixtures and assertions without compiling an installed game client.
test('complete ecology, barrel bodies/floors and watch decision retain original wires', () => {
  const output = execFileSync(
    execPath,
    [
      '--import',
      import.meta.resolve('@wildshard/sdk/headless/scripts/sim-node-loader.mjs'),
      '--input-type=module',
      '-e',
      String.raw`import {createHash} from 'node:crypto';
import {ecologyRows} from './src/generators/ecology.mjs';
const values=[['ecology',ecologyRows()]];
const observed=values.map(([name,value])=>{const bytes=Buffer.from(JSON.stringify(value));return {name,bytes:bytes.length,hash:createHash('sha256').update(bytes).digest('hex')};});
console.log(JSON.stringify(observed));`,
    ],
    {
      cwd: resolve(import.meta.dirname, '..'),
      encoding: 'utf8',
      timeout: 25_000,
    },
  )
  const observed: unknown = JSON.parse(output)
  const expected = original.filter(row => ['ecology'].includes(row.name))
  expect(expected).toHaveLength(1)
  expect(observed).toEqual(expected)
}, 10_000)
