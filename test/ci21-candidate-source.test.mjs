// The candidate engine's source comes from the lockfile when `pnpm list` names no `resolved` (Nalati CI 46047262385).
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  lockedEngineSource,
  lockedEngineSources,
} from '../src/scripts/candidate-engine-source.mjs'

const sha = '922b9d451ef5c86cfbfc91154bb95c58c9af6614'
const codeload = `https://codeload.github.com/project-wildshard/engine/tar.gz/${sha}`
const entry = (key, resolution) =>
  `  '${key}':\n    resolution: {${resolution}}\n    version: 0.1.100\n\n`
const snapshot = `snapshots:\n\n  '@wildshard/engine@git+ssh://git@github.com/project-wildshard/engine.git#${sha}(three@0.186.0)':\n    dependencies:\n      three: 0.186.0\n`

test('a git resolution of project-wildshard/engine reads as its codeload tarball', () => {
  const lock = `packages:\n\n${entry(`@wildshard/engine@git+ssh://git@github.com/project-wildshard/engine.git#${sha}`, `commit: ${sha}, repo: git@github.com:project-wildshard/engine.git, type: git`)}${snapshot}`
  assert.equal(lockedEngineSource(lock), codeload)
})

test('a codeload tarball resolution reads as itself', () => {
  const lock = `packages:\n\n${entry(`@wildshard/engine@${codeload}`, `tarball: ${codeload}`)}`
  assert.equal(lockedEngineSource(lock), codeload)
})

test('the npm prerelease is a registry source, never the candidate', () => {
  const lock = `packages:\n\n${entry('@wildshard/engine@0.1.100-next.922b9d45', 'integrity: sha512-abc==')}`
  assert.equal(lockedEngineSource(lock), 'registry')
})

test('a registry copy beside the candidate, another repo, or no engine is refused', () => {
  const both = `packages:\n\n${entry(`@wildshard/engine@${codeload}`, `tarball: ${codeload}`)}${entry('@wildshard/engine@0.1.100-next.922b9d45', 'integrity: sha512-abc==')}`
  assert.throws(() => lockedEngineSource(both), /2 @wildshard\/engine sources/u)
  const other = `packages:\n\n${entry(`@wildshard/engine@git+ssh://x#${sha}`, `commit: ${sha}, repo: git@github.com:someone/engine.git, type: git`)}`
  assert.deepEqual(lockedEngineSources(other), [
    `git:git@github.com:someone/engine.git#${sha}`,
  ])
  assert.throws(
    () => lockedEngineSource('packages:\n'),
    /0 @wildshard\/engine sources: none/u,
  )
})
