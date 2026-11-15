// SH-nalati-1..5: after build:shards, record a genuine uninterrupted
// checkpoint/suffix by running all existing journey assertions:
// TITAN_CHECKPOINT=tmp/<lane>/titan.json node --test test/ci/taming-journey.test.mjs
// Then: node scripts/probe-titan-restore.mjs tmp/<lane>/titan.json
// Recording grants no saved fields and skips no gameplay or assertions.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boot } from '../test/ci/journey-rider.mjs';
const { createSimSnapshotSerializer, snapshotSimHostBytes } = await import('@wildshard/engine/sim/snapshot');
const path = process.argv[2];
if (!path) throw new Error('Expected an earned Titan checkpoint bundle');
const bundle = JSON.parse(readFileSync(path, 'utf8'));
const { resident, world } = await boot(bundle.start), writer = createSimSnapshotSerializer();
try {
  for (let tick = 0; tick < bundle.commands.length; tick++) {
    resident.step(bundle.commands[tick]);
    if (JSON.stringify(resident.effects) !== JSON.stringify(bundle.effects[tick]))
      console.log(`Effects differ at suffix tick ${tick + 1}: ${JSON.stringify(resident.effects)}`);
  }
  const actual = writer.serialize(snapshotSimHostBytes(resident.host));
  if (actual !== bundle.expected) {
    const wanted = JSON.parse(bundle.expected).snapshot.entities.map(row => row.id), got = JSON.parse(actual).snapshot.entities.map(row => row.id);
    const at = wanted.findIndex((id, index) => id !== got[index]);
    console.error(`Opaque continuation differs; first entity-order difference ${at}: ${wanted[at]} versus ${got[at]}`);
  }
  assert.ok(actual === bundle.expected, 'The earned mounted Titan intro does not resume identically');
} finally { writer.dispose(); world.dispose(); }
