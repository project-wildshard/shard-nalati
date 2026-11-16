import { expect, test } from 'vitest'

import original from './fixtures/spruce-author-original.json' with { type: 'json' }

function observation(value: unknown): value is () => unknown {
  return typeof value === 'function'
}

test('all twenty original spruce geometries retain every channel bit, group and bound', async () => {
  // Producer/helper closure type coverage remains row36/H4; the real
  // complete observation executes in the normal test module runner.
  const path = './fixtures/spruce-author-observation.ts'
  const module: unknown = await import(path)
  if (
    typeof module !== 'object' ||
    module === null ||
    !('spruceAuthorObservation' in module) ||
    !observation(module.spruceAuthorObservation)
  )
    throw new Error('Missing actual spruce observation')
  expect(module.spruceAuthorObservation()).toEqual(original)
}, 10_000)
