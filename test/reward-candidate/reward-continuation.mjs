// A checkpoint opens a second real world; only the same subsequent player
// inputs reach it. Every suffix compares the whole save and every effect.
import assert from 'node:assert/strict';
const { openWorld } = await import('@wildshard/sdk/internal/engine/host/openWorld');
const { createSimSnapshotSerializer, snapshotSimHostBytes } = await import('@wildshard/sdk/headless/sim/snapshot');

export function rewardContinuations(world, input) {
  const writer = createSimSnapshotSerializer(), checkpoints = [];
  let pending = null;
  const wire = host => writer.serialize(snapshotSimHostBytes(host));
  const compare = () => {
    if (pending === null) return;
    assert.deepEqual(pending.world.resident.effects, world.resident.effects, `${pending.label}: exact effects`);
    assert.equal(wire(pending.world.host) === wire(world.host), true, `${pending.label}: exact whole suffix`);
    if (--pending.left !== 0) return;
    checkpoints.push({ label: pending.label, tick: pending.tick, suffix: 5, immediateWholeSave: true, suffixWholeSave: true, effectsExact: true });
    pending.world.dispose(); pending = null;
  };
  const step = (commands, other, acts) => {
    world.resident.step(commands, other, acts);
    pending?.world.resident.step(commands, other, acts); compare();
  };
  const act = acts => {
    const inputs = [{ player: [...world.host.players.keys()][0], command: null, acts }];
    world.step(inputs); pending?.world.step(inputs); compare();
  };
  return {
    checkpoints, step, act,
    get pending() { return pending !== null; },
    begin: async label => {
      assert.equal(pending, null, 'The prior continuation must finish');
      const saved = wire(world.host), back = await openWorld(input, { room: true, snapshot: saved });
      try {
        assert.equal(wire(back.host) === saved, true, `${label}: immediate whole save`);
        pending = { label, world: back, tick: world.host.state.tick, left: 5 };
      } catch (error) { back.dispose(); throw error; }
    },
    drain: () => { while (pending !== null) step([]); },
    dispose: () => { pending?.world.dispose(); writer.dispose(); },
  };
}
