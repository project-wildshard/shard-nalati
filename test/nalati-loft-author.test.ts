import { expect, test } from 'vitest'

import original from './fixtures/nalati-ambient-original.json' with { type: 'json' }

function observation(value: unknown): value is () => unknown {
  return typeof value === 'function'
}

test('the owned loft compiler retains every original ambient channel, bound and topology bit', async () => {
  // The offline author uses material shader metadata. The original golden
  // runs on Vitest's Node module runner and makes no simulation-closure claim.
  // Producer/helper closure type coverage remains row36/H4; this gate checks
  // the test boundary while the real helper executes here.
  const path = './fixtures/nalati-ambient-observation.ts'
  const module: unknown = await import(path)
  if (
    typeof module !== 'object' ||
    module === null ||
    !('nalatiAmbientObservation' in module) ||
    !observation(module.nalatiAmbientObservation)
  )
    throw new Error('Missing actual ambient observation')
  expect(module.nalatiAmbientObservation()).toEqual(original)
}, 10_000)
