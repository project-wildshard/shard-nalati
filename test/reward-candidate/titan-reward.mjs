import assert from 'node:assert/strict';
import { rider } from '../ci/journey-rider.mjs';
import { rewardContinuations } from './reward-continuation.mjs';
import { titanBowPilot, titanRidersPilot } from './titan-reward-pilot.mjs';
const { openArenaOf } = await import('@wildshard/engine/game/boss/openArenaNative');
const { mountedPlayerOf } = await import('@wildshard/engine/game/riding/native');

// Continue the same actual tamed horse/kokpar/intro world. Calls name only
// player controls and public interaction acts; no encounter state is written.
export async function earnTitanRewards(world, input) {
  const { resident, host } = world, r = rider(resident), arena = openArenaOf(host), mount = mountedPlayerOf(host);
  assert.ok(arena); assert.ok(mount);
  const c = rewardContinuations(world, input);
  const step = commands => {
    const controls = commands.filter(command => command.kind === 'script' && ['nalati.whistle', 'nalati.companion.use'].includes(command.actorId));
    const acts = controls.map(command => command.actorId === 'nalati.whistle' ? {kind:'interact',id:'ride.whistle'} : {kind:'ride',action:mount.mounted?'dismount':'mount'});
    const body = commands.filter(command => !controls.includes(command));
    c.step(body, undefined, acts.length === 0 ? undefined : new Map([[r.player.id, acts]]));
  };
  try {
    await c.begin('Titan earned mounted intro');
    await titanBowPilot(input.product, host, step, 1);
    c.drain(); await c.begin('Titan real support phase');
    await titanRidersPilot(input.product, host, step);
    c.drain(); await c.begin('Titan support riders defeated');
    await titanBowPilot(input.product, host, step, 2);
    c.drain(); await c.begin('Titan exposed final heart');
    await titanBowPilot(input.product, host, step, 3);
    c.drain();
    assert.equal(host.flags.has('dead:storm-titan'), true, 'The world records the victory on the current tick');
    assert.equal(host.questFlags.has('dead:storm-titan'), false, 'Personal credit is still pending at the saved victory');
    await c.begin('Titan actual victory'); c.drain();
    assert.equal(host.questFlags.has('dead:storm-titan'), true, 'The exact continuation settles personal credit');
    assert.equal(arena.boss.state, 'victory');
    assert.equal(arena.boss.snapshot().saved.rewardTaken, false);
    // Reach the cairn on its known walkable west approach, away from the steep
    // direct face. The same route is used by the existing threshold journey.
    let reached = false;
    for (let tick = 0; tick < 4000; tick++) {
      const p = r.player.position, dx = -40-p.x, dz = -25-p.z, distance = Math.hypot(dx,dz);
      if (distance < 5) { reached = true; break; }
      const target = Math.atan2(dx,dz), turn = Math.atan2(Math.sin(mount.body.heading-target),Math.cos(mount.body.heading-target));
      const brake = Math.abs(turn) > .9 && mount.body.speed > 3;
      step([{kind:'player',moveX:0,moveZ:0,yaw:mount.body.heading-Math.PI,commandVersion:1,
        steer:{keyX:0,keyY:0,stickX:brake?0:Math.max(-1,Math.min(1,turn*2.5)),stickY:brake?-.3:Math.abs(turn)>.9?0:distance<10?.35:1}}]);
    }
    assert.equal(reached, true, 'The real ride reaches the west approach');
    for (let tick=0;tick<120;tick++) step([{kind:'player',moveX:0,moveZ:0,yaw:r.player.yaw,commandVersion:1,steer:{keyX:0,keyY:0,stickX:0,stickY:-.3}}]);
    if (mount.mounted) c.act([{kind:'ride',action:'dismount'}]);
    r.walk([[-40,-25],[-35,-25],[-30,-25],[-28,-35],[-26.4,-42],[-27,-40],[-30,-38.5]]);
    c.act([{kind:'interact',id:'storm-titan.reward'}]);
    const rewards = [...resident.effects].filter(effect => effect.kind === 'item');
    assert.deepEqual(rewards, [
      {kind:'item',item:'naizagai',count:1,actorId:r.player.id},
      {kind:'item',item:'sky-marked-saddle',count:1,actorId:r.player.id},
    ]);
    c.act([{kind:'interact',id:'storm-titan.reward'}]);
    assert.equal(resident.effects.filter(effect => effect.kind === 'item').length, 0, 'A second press pays nothing');
    assert.equal(arena.boss.snapshot().saved.rewardTaken, true);
    await c.begin('Titan claimed Naizagai and saddle'); c.drain();
    return {rewards,checkpoints:c.checkpoints,attempts:arena.boss.attempts,ticks:host.state.tick};
  } finally { c.dispose(); }
}
