// Candidate runtime only: the pinned producer still builds the actual shard.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { boot, rider } from '../ci/journey-rider.mjs';
import { enterKurgan } from '../ci/kurgan-route.mjs';
import { rewardContinuations } from './reward-continuation.mjs';

test('Nalati: King retry, native adds, Golden Bow and exact continuations', {
  timeout: 240_000, skip: process.env.NALATI_FULL_REWARDS !== '1',
}, async () => {
  const started = performance.now(), { world, resident, input } = await boot(), r = rider(resident);
  const c = rewardContinuations(world, input), report = { complete: false, engine: process.env.NALATI_ENGINE_CANDIDATE, checkpoints: c.checkpoints };
  let heldAdd = null;
  try {
    enterKurgan(r); r.walk([[-40,-80],[-40,-82],[-36,-87],[-35,-91]]);
    await c.begin('King earned intro');
 const state=()=>JSON.parse(r.host.adapters.get('nalati.king').snapshot()),weapon=()=>JSON.parse(r.host.adapters.get('nalati.weapons').snapshot());
 for(let n=0;n<3&&weapon().slot!=='blade';n++)c.step([{kind:'script',actorId:'nalati.weapon.swap',value:1}]);
 const king=[...r.host.entities.values()].find(a=>a.kind==='golden-king'),head=king.position.clone();let dodged=-120,last='';
 for(let t=0;t<12000&&state().boss.state!=='victory';t++){
  const s=state(),phase=s.fight.fight.state,adds=s.fight.fight.adds.map(({id})=>r.host.entities.get(id)).filter(a=>a?.alive);
  const distance=a=>Math.hypot(a.position.x-r.player.position.x,a.position.z-r.player.position.z);
  adds.sort((a,b)=>distance(a)-distance(b));
  const dead=s.fight.fight.adds.find(a=>a.deadT>0); if(heldAdd===null&&phase.mode==='shield'&&adds.length>0&&dead!==undefined)heldAdd=dead.id; const hold=heldAdd!==null&&s.fight.fight.adds.some(a=>a.id===heldAdd&&a.deadT<=2.4);
  const shielded=['toCoffin','shield'].includes(phase.mode),waiting=shielded&&adds.length===0||hold,target=shielded&&adds.length?adds[0]:king;
  const boundary=s.fight.fight.adds.some(a=>a.deadT>2.32&&a.deadT<=2.4),label=phase.mode==='shield'&&adds.length>0?'retire with living add':phase.mode!=='shield'?'retire after shield':null;
  if(boundary&&label!==null&&!c.checkpoints.some(row=>row.label===label)&&!c.pending)await c.begin(label);
  target.headWorld(head);const dx=head.x-r.player.position.x,dz=head.z-r.player.position.z,d=distance(target),pitch=Math.atan2(head.y-r.player.position.y-1.68,Math.hypot(dx,dz));
  const dodge=!waiting&&target.attackPhase>=.35&&target.attackPhase<.68&&d<4&&r.host.state.tick-dodged>=60;
  if(dodge)dodged=r.host.state.tick;
  const jump=!waiting&&target===king&&king.mem.act===2&&king.attackPhase>=.65&&king.attackPhase<.78;
  const heavy=!waiting&&t%75<45&&d<3.5&&s.boss.state==='fight';
  c.step([{kind:'player',moveX:0,moveZ:0,yaw:Math.atan2(-dx,-dz),commandVersion:1,
   steer:{keyX:0,keyY:0,stickX:waiting?0:dodge?(t%2===0?.8:-.8):.2,stickY:waiting?(d<4?-.65:0):d>2.1?.65:d<1.3?-.45:0},
   ...(heavy?{heavy:{}}:{}),...(dodge?{dodge:true}:{}),...(jump?{jump:true}:{})},...(t%12===0?[{kind:'script',actorId:'nalati.weapon.pitch',value:pitch}]:[])]);
  const tag=s.boss.state+':'+s.boss.phase+':'+s.boss.attempts+':'+phase.mode;
  if(tag!==last||t%1000===0){last=tag;console.log(JSON.stringify({t,tag,hp:king.hp,health:r.player.health.attributes.health,adds:adds.length,at:r.player.position.toArray()}));}
 }

    assert.equal(state().boss.state, 'victory', 'Actual blade contacts defeat the King');
    assert.ok(state().boss.attempts > 1, 'The real death/retry path is exercised');
    c.drain();
    assert.ok(c.checkpoints.some(row => row.label === 'retire with living add'));
    assert.ok(c.checkpoints.some(row => row.label === 'retire after shield'));
    await c.begin('King actual victory'); c.drain();
    r.walk([[-45,-93],[-43,-93],[-42,-93],[-42,-99.5],[-40,-101.8]]);
    c.act([{kind:'interact',id:'golden-king.reward'}]);
    const rewards = [...resident.effects].filter(effect => effect.kind === 'item');
    assert.deepEqual(rewards, [{kind:'item',item:'goldenBow',count:1,actorId:r.player.id}]);
    c.act([{kind:'interact',id:'golden-king.reward'}]);
    assert.equal(resident.effects.filter(effect => effect.kind === 'item').length, 0, 'A second press pays nothing');
    assert.equal(r.host.flags.has('boss.nalati.king.paid'), true);
    await c.begin('King claimed Golden Bow'); c.drain();
    Object.assign(report, {complete:true,rewards,attempts:state().boss.attempts,ticks:r.host.state.tick});
  } catch (error) { report.error = error instanceof Error ? error.message : String(error); throw error;
  } finally {
    const directory = process.env.NALATI_JOURNEY_DIR ?? 'tmp/nalati-journeys'; mkdirSync(directory, {recursive:true});
    writeFileSync(join(directory,'king-reward.json'),JSON.stringify({...report,seconds:(performance.now()-started)/1000},null,2)+'\n');
    c.dispose(); world.dispose();
  }
});
