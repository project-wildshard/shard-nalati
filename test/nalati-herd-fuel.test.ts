// SENTRY-TRIAGE S3 (WILDSHARD-GAME-82): the herd group's ABI-2 step ran out of its 400,000 fuel inside one call and the
// meter trapped as `RuntimeError: unreachable` in `Read.context`. A herd near the map's edge picks a graze spot up to 16
// times out of bounds with no native operation to yield on, and each pick's four bound reads charged `Read.context`'s
// whole body (about 11,500 fuel apiece). This drives the pasture module's herd profile, compiled from this checkout,
// through the engine's own group host segment by segment, as `GroupBrain.runGuest` does. Before the fix the 50 m scenes
// trap at the same frames Sentry recorded (`wasm-function[65]` to `[7]`, `0x1c34`).
import { describe, expect, test } from 'vitest';
import { parseReturnProjectionV2, returnProjectionV2Layout } from '@wildshard/format/returnProjectionV2';
import { GroupStepV2 } from '@wildshard/engine/script/groupStepV2';
import { ScriptModuleV2 } from '@wildshard/engine/script/moduleV2';
import { Scope } from '@wildshard/engine/app/scope';
import { Rng } from '@wildshard/engine/core/rng';
import herdRows from '../src/shards/nalati-grasslands/data/herdGroup.json' with { type: 'json' };
import herdGuest from '../src/shards/nalati-grasslands/data/herdGuest.json' with { type: 'json' };
import { readDecisionSources } from '@wildshard/sharddev/buildDecisionScripts';
import { compileReturnProjectionV2 } from '@wildshard/sharddev/returnProjectionV2';
import { nalatiTitanRows } from '../src/shards/nalati-grasslands/generators/stormTitanRows.mjs';

// the pasture module and its rows, compiled from this checkout's behaviour/*.as the way the build does
const built = await nalatiTitanRows((input: unknown, registries: unknown, authored: unknown, options: object) =>
  compileReturnProjectionV2(input as never, registries as never, authored as never, options as never),
readDecisionSources('src/shards/nalati-grasslands'));
const PASTURE_ROW: unknown = (built.programs.wind as { v2: unknown }).v2, PASTURE_WASM = built.pasture.wasm as Uint8Array;

type Prepared = ReturnType<GroupStepV2['prepare']>;
type Input = Parameters<GroupStepV2['prepare']>[0];
type Owners = Input['members'][number];
interface Internals { readonly profiles: readonly { readonly bank: { encode: (values: Prepared['values'], group: string, refs: Input['references']) => Float64Array };
  readonly columns: { captureNumeric: (owners: Owners, selected: unknown, destination: Float64Array) => Float64Array } }[] }

const FUEL = herdRows.fuel, DECLARED = new Set(herdGuest.resume.values), bankNames = herdRows.bank.map(row => row.name), columnNames = herdRows.columns.map(row => row.name);
const at = (name: string): number => { const index = bankNames.indexOf(name); if (index < 0) throw new Error(`No herd bank field ${name}`); return index; };
const column = (name: string): number => { const index = columnNames.indexOf(name); if (index < 0) throw new Error(`No herd column ${name}`); return index; };

interface Scene { readonly members: number; readonly seed: number; readonly bounds: number; readonly calm: (frame: number) => boolean;
  readonly player: (frame: number) => readonly [number, number] }

/** One group host over the pasture module. Each member's numeric row is loaned without a live actor behind it: memory
 *  writes land in it, and the sense replies say the player is seen and heard, so a near player raises awareness, alarms
 *  and flights. Bodies don't move. */
function herdHost(scene: Scene) {
  const row = parseReturnProjectionV2(PASTURE_ROW), layout = returnProjectionV2Layout(row.fields.length, row.artifact.pages, row.outputCapacity, row.groups);
  const scope = new Scope('herd-fuel');
  const module = new ScriptModuleV2(PASTURE_WASM, { seed: [0, 0], initFuel: FUEL, output: [], ioBytes: layout.bytes, owner: scope });
  const project = module.project.bind(module), spent: number[] = [];
  module.project = ((fuel: number, write: never, read: never) => { const result = project(fuel, write, read); spent.push(fuel - result.remaining); return result; }) as never;
  const host = new GroupStepV2(PASTURE_WASM, row.groups, scope, { module, layout });
  const profile = (host as unknown as Internals).profiles[0];
  if (profile === undefined) throw new Error('Missing herd profile');
  const values = new WeakMap<object, Float64Array>(), random = new Rng(scene.seed);
  profile.columns.captureNumeric = (owners, _selected, destination) => { destination.set(values.get(owners) ?? []); return destination; };
  const references: Input['references'][number][] = [], rows: Float64Array[] = [];
  const owners: Owners[] = Array.from({ length: scene.members }, (_, slot) => {
    const actor = { entityId: `horse-${slot}` }, identity = `horse-${slot}`;
    const loan = { scope, self: { group: 'herd', slot, actor, identity }, player: { position: { x: 0, z: 0 } }, observed: new Map(), t: 0, dt: 0.1 } as unknown as Owners;
    const numbers = new Float64Array(columnNames.length);
    numbers[column('alive')] = 1; numbers[column('handle')] = slot + 1; numbers[column('hp')] = 100; numbers[column('maxHp')] = 100;
    numbers[column('scale')] = 1; numbers[column('speed')] = 1; numbers[column('speedMod')] = 1; numbers[column('seed')] = random.next();
    numbers[column('foal')] = slot >= scene.members - 3 ? 1 : 0; numbers[column('grazing')] = slot % 2;
    numbers[column('x')] = (slot % 4) * 3 + random.next(); numbers[column('z')] = Math.floor(slot / 4) * 3 + random.next(); numbers[column('yaw')] = random.next() * 6;
    numbers[column('zzSeen')] = 1; numbers[column('zzHeard')] = 30;
    values.set(loan, numbers); rows.push(numbers);
    references.push({ group: 'herd', slot, identity, wire: identity, handle: slot + 1, body: actor } as never);
    return loan;
  });
  let state = new Float64Array(bankNames.length);
  state[at('initialized')] = 1; state[at('stallion')] = 1; state[at('lead')] = 2; state[at('trust')] = 10;
  const context: Record<string, number> = { dt: 0.1, sight: 60, grazingSight: 30, cone: 2, alertThreshold: 0.6, walk: 1.5, trot: 4, gallop: 9,
    flightMin: 30, flightMax: 60, minX: -scene.bounds, maxX: scene.bounds, minZ: -scene.bounds, maxZ: scene.bounds, playerSpeed: 6 };
  for (const [name, value] of Object.entries(context)) state[at(`context.${name}`)] = value;
  const contextRandom = new Rng(scene.seed + 1), continuation = at('continuation');
  /** One `tick` across its continuation segments; returns the most fuel any one segment spent. */
  const tick = (frame: number): number => {
    const [px, pz] = scene.player(frame);
    state[at('context.time')] = frame * 0.1; state[at('context.calm')] = scene.calm(frame) ? 1 : 0; state[at('context.px')] = px; state[at('context.pz')] = pz;
    let most = 0;
    for (let segment = 0; segment < 256; segment++) {
      const prepared = host.prepare({ group: 'herd', handle: 1, signal: 'tick', tick: frame * 6 + 1, state, members: owners, references, random, contextRandom });
      try {
        most = Math.max(most, spent.at(-1) ?? 0);
        prepared.validate(); prepared.accept();
        state = profile.bank.encode(prepared.values, 'herd', references);
        for (const operation of prepared.operations) {
          const native = operation.native as { readonly kind: string; readonly key?: string } | undefined, [slot, value] = operation.values;
          const row = slot === undefined ? undefined : rows[slot];
          if (native?.kind === 'memory' && native.key !== undefined && row !== undefined && value !== undefined) row[column(native.key)] = value;
        }
      } finally { prepared.discard(); }
      // `GroupBrain.runGuest` refuses a continuation the guest binding doesn't declare
      if (!DECLARED.has(state[continuation] ?? -1)) throw new Error(`Undeclared herd continuation ${String(state[continuation])}`);
      if (state[continuation] === 0) return most;
    }
    throw new Error('Herd tick exceeded its 256 segments');
  };
  return { tick, dispose: () => { scope.dispose(); } };
}

/** The most fuel one segment spent across `frames` ticks; a fuel trap throws out of `prepare`. */
function session(scene: Scene, frames: number): number {
  const herd = herdHost(scene);
  try { let most = 0; for (let frame = 1; frame <= frames; frame++) most = Math.max(most, herd.tick(frame)); return most; }
  finally { herd.dispose(); }
}

describe('Nalati herd group fuel (S3)', () => {
  test('a herd of 16 runs a long session, calm and alarmed, inside its call fuel', () => {
    const scenes: Scene[] = [];
    // odd seeds graze a wide map; even seeds sit within 50 m of the edge, so every graze-spot pick lands out of bounds
    for (let seed = 1; seed <= 6; seed++) scenes.push({ members: 16, seed, bounds: seed % 2 === 0 ? 50 : 400,
      calm: frame => Math.floor(frame / (40 + seed * 7)) % 2 === 1,
      player: frame => { const a = frame * 0.02 * seed, r = 4 + (frame * 0.37 * seed) % 40; return [5 + Math.sin(a) * r, 5 + Math.cos(a) * r]; } });
    const most = scenes.map(scene => session(scene, 600));
    for (const value of most) expect(value).toBeLessThan(FUEL);
  });
});
