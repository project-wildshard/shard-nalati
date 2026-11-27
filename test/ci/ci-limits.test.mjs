// J439: the cook-play limit moves with content, and the jobs that run it must move with it. CI 46050865905's cold
// images-only cook took 1845.83 s against a 1800 s limit; raising one number without the job and wait-step timeouts
// would cancel the job instead.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const minutes = (text, after) => {
  const at = text.indexOf(after)
  assert.ok(at >= 0, `missing ${after}`)
  const found = /timeout-minutes: (\d+)/u.exec(text.slice(at))
  assert.ok(found, `no timeout-minutes after ${after}`)
  return Number(found[1])
}

test('the jobs and the wait step cover the cook-play test limit', () => {
  const play = readFileSync('test/ci/cook-play.test.mjs', 'utf8')
  const limit =
    Number(/\{timeout:([\d_]+)\}/u.exec(play)?.[1]?.replaceAll('_', '')) /
    60_000
  assert.ok(
    limit >= 45,
    `cook-play limit ${limit} min is under 1.5x the measured 1845.83 s`,
  )
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8')
  const wait = minutes(ci, '- name: Cook and play only served live-herd files')
  assert.ok(
    wait >= limit + 1,
    `the wait step (${wait} min) must outlast the cook limit (${limit} min)`,
  )
  assert.ok(
    minutes(ci, '  ring-2-content:\n') >= wait + 15,
    'ring-2-content needs setup time before the cook',
  )
  const nightly = readFileSync('.github/workflows/ring-2-content.yml', 'utf8')
  assert.ok(
    minutes(nightly, 'jobs:') >= limit + 20,
    'the nightly runs the cook after its journeys',
  )
  assert.ok(
    minutes(ci, '  ci21-source:\n') >= 70,
    'ci21-source measured about 47 min (run 46050865905)',
  )
})
