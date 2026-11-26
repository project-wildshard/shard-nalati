import {encodePortableBytes} from '@wildshard/sdk/bake/portableBytes';
import * as THREE from 'three';
import type { InstancedBufferGeometry } from 'three';
import type { worldSceneBuffers } from '@wildshard/sdk/worldScenes';

type SceneBuffers = ReturnType<typeof worldSceneBuffers>;

interface RingCfg { T: number; G: number; s: number; w: number; seg: number }
const MAX_TILES = 256;

/** one tile of blades (`per` a side, `seg` segments): aBlade = the cell's offset in the tile (m), t up the blade, side; the
 *  ring's spacing / width / fade and its card hand-over ride along per vertex, the tile origin and the inner ring's square
 *  per instance (`aTile`, `aHole`: written as the frame culls) */
function bladeTile(per: number, cfg: RingCfg, fade: readonly [number, number], near: readonly [number, number, number]): InstancedBufferGeometry {
  const g = new THREE.InstancedBufferGeometry();
  const nv = cfg.seg * 2 + 1, blade: number[] = [], idx: number[] = [];
  for (let j = 0; j < per; j++) for (let i = 0; i < per; i++) {
    const b = (j * per + i) * nv;
    for (let k = 0; k < cfg.seg; k++) { const t = k / cfg.seg; blade.push(i * cfg.s, j * cfg.s, t, -1, i * cfg.s, j * cfg.s, t, 1); }
    blade.push(i * cfg.s, j * cfg.s, 1, 0);
    for (let k = 0; k < cfg.seg - 1; k++) { const a = b + k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const a = b + (cfg.seg - 1) * 2; idx.push(a, a + 1, a + 2);
  }
  return tileGeometry(g, blade, 'aBlade', idx, [cfg.s, cfg.w, fade[0], fade[1]], near);
}

/** one tile of flower heads: aHead = the cell's offset in the tile (m), the quad corner (−0.5 … 0.5, 0 … 1) */
function flowerTile(per: number, s: number, fade: readonly [number, number], near: readonly [number, number, number]): InstancedBufferGeometry {
  const g = new THREE.InstancedBufferGeometry(), head: number[] = [], idx: number[] = [];
  for (let j = 0; j < per; j++) for (let i = 0; i < per; i++) {
    const b = (j * per + i) * 4;
    for (const [x, y] of [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]] as const) head.push(i * s, j * s, x, y);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return tileGeometry(g, head, 'aHead', idx, [s, 0, fade[0], fade[1]], near);
}

/** QA 11-24 row 71 (J510, Jake 11-26): the near field's real 3D flowers. The painted card clumps carried flowers; the real
 *  blades that replaced them have none, so the near grass read sparse. One tile of `per` × `per` cells, a plant per cell:
 *  NEAR_HEADS heads, each a three-sided stem, PETALS cupped petals (two triangles each) and a three-faced domed centre. The
 *  vertices carry no position: the program (`nalati-grass-near-flowers`, nearFlowerLook.ts) builds every one from
 *  `aRoot` = (cell i, cell j, head) and `aShape` = (angle, t, side, part: 0 stem, 1 petal, 2 centre), the species and
 *  size from the meadow field, so the same metre always grows the same flowers. `aTile` = the `across` × `across` tiles
 *  round the camera's (engine snaps the field to the tile lattice through `cardField`). */
export const NEAR_HEADS = 3, PETALS = 5;
function nearFlowerTile(per: number, across: number): InstancedBufferGeometry {
  const root: number[] = [], shape: number[] = [], idx: number[] = [];
  const vertex = (i: number, j: number, h: number, a: number, t: number, side: number, part: number): number => {
    root.push(i, j, h); shape.push(a, t, side, part); return root.length / 3 - 1;
  };
  for (let j = 0; j < per; j++) for (let i = 0; i < per; i++) for (let h = 0; h < NEAR_HEADS; h++) {
    // the stem: a three-sided prism from the ground (t 0) to the head (t 1)
    const stem = [0, 1, 2].map((k) => [vertex(i, j, h, k * 2 * Math.PI / 3, 0, 0, 0), vertex(i, j, h, k * 2 * Math.PI / 3, 1, 0, 0)] as const);
    for (let k = 0; k < 3; k++) { const [a0, a1] = stem[k] ?? [0, 0], [b0, b1] = stem[(k + 1) % 3] ?? [0, 0]; idx.push(a0, b0, a1, a1, b0, b1); }
    // the petals: base, two sides at mid length, tip (the program cups them up by species)
    for (let k = 0; k < PETALS; k++) {
      const a = k * 2 * Math.PI / PETALS;
      const base = vertex(i, j, h, a, 0, 0, 1), left = vertex(i, j, h, a, 0.5, -1, 1), right = vertex(i, j, h, a, 0.5, 1, 1), tip = vertex(i, j, h, a, 1, 0, 1);
      idx.push(base, left, tip, base, tip, right);
    }
    // the centre: a low dome, apex and three rim points
    const apex = vertex(i, j, h, 0, 0, 0, 2), rim = [0, 1, 2].map((k) => vertex(i, j, h, k * 2 * Math.PI / 3 + Math.PI / 6, 1, 0, 2));
    for (let k = 0; k < 3; k++) idx.push(apex, rim[(k + 1) % 3] ?? 0, rim[k] ?? 0);
  }
  const g = new THREE.InstancedBufferGeometry(), n = root.length / 3;
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aRoot', new THREE.Float32BufferAttribute(root, 3));
  g.setAttribute('aShape', new THREE.Float32BufferAttribute(shape, 4));
  const half = (across - 1) / 2, tiles: number[] = [];
  for (let k = 0; k < across * across; k++) tiles.push((k % across) - half, Math.floor(k / across) - half, 0);
  g.setAttribute('aTile', new THREE.InstancedBufferAttribute(new Float32Array(tiles), 3));
  g.setIndex(idx);
  g.instanceCount = across * across;
  return g;
}

function tileGeometry(g: InstancedBufferGeometry, cells: number[], name: string, idx: number[], ring: readonly number[], near: readonly number[]): InstancedBufferGeometry {
  const n = cells.length / 4;
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute(name, new THREE.Float32BufferAttribute(cells, 4));
  g.setAttribute('aRing', new THREE.Float32BufferAttribute(Array.from({ length: n }, () => ring).flat(), 4));
  g.setAttribute('aNear', new THREE.Float32BufferAttribute(Array.from({ length: n }, () => near).flat(), 3));
  g.setAttribute('aTile', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TILES * 2), 2).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aHole', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TILES * 4), 4).setUsage(THREE.DynamicDrawUsage));
  g.setIndex(idx);
  g.instanceCount = 0;
  return g;
}



type GrassBufferPublisher = (id: string, bytes: Uint8Array) => { file: string; byteOffset: number };
function scene(list: readonly THREE.InstancedBufferGeometry[], prefix: string, publish: GrassBufferPublisher): SceneBuffers {
  const source = (id: string, array: ArrayBufferView): Pick<SceneBuffers['buffers'][number], 'bytes' | 'file' | 'byteOffset' | 'byteLength'> => {
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength).slice();
    return { ...publish(`${prefix}-${id}`, bytes), byteLength: array.byteLength };
  };
  const buffers: SceneBuffers['buffers'] = [], attributes: SceneBuffers['attributes'] = [], geometries: SceneBuffers['geometries'] = [], draws: SceneBuffers['draws'] = [];
  for (const [i, geo] of list.entries()) {
    const id = String(i), refs: Record<string,string> = {};
    for (const [name, value] of Object.entries(geo.attributes)) {
      if (!(value instanceof THREE.BufferAttribute)) throw new Error('Grass geometry needs plain channels');
      const key = `${id}.${name}`; refs[name] = key;
      buffers.push({ id: key, storage: 'f32', ...source(key, value.array), instanced: value instanceof THREE.InstancedBufferAttribute });
      attributes.push({ id: key, buffer: key, size: value.itemSize, offset: 0, normalized: false });
    }
    const index = geo.getIndex(); if (index === null) throw new Error('Grass triangles missing');
    const key = `${id}.index`; buffers.push({ id: key, storage: 'u16', ...source(key, Uint16Array.from(index.array)), instanced: false });
    attributes.push({ id: key, buffer: key, size: 1, offset: 0, normalized: false });
    geometries.push({ id, attributes: refs, index: key, instances: geo.instanceCount });
    draws.push({ id, name: id, at: [0,0,0], draw: { kind: 'mesh', geometry: id, at: [0,0,0], frustum: false } });
    geo.dispose();
  }
  return { version: 1, name: 'grass-field', buffers, attributes, geometries, draws };
}
/** Publish detached raw channels; the scene contains only named, bounded binary ranges. */
export function grassRows(phone: boolean, publish: GrassBufferPublisher): { rings: RingCfg[]; flowers: { T: number; G: number; s: number }; cards: { T: number; s: number }; near: readonly [number,number]; per: number; scenes: { blades: SceneBuffers; flowers: SceneBuffers; cards: SceneBuffers } } {

const RINGS: RingCfg[] = phone
  ? [{ T: 4, G: 8, s: 0.085, w: 0.047, seg: 3 }, { T: 8, G: 12, s: 0.2, w: 0.1, seg: 2 }, { T: 16, G: 14, s: 0.45, w: 0.2, seg: 1 }]
  : [{ T: 4, G: 8, s: 0.06, w: 0.034, seg: 3 }, { T: 8, G: 14, s: 0.15, w: 0.08, seg: 3 }, { T: 16, G: 18, s: 0.34, w: 0.16, seg: 2 }];
const FLOWERS = phone ? { T: 8, G: 10, s: 0.3 } : { T: 8, G: 14, s: 0.22 };
/** the near field (0 – ~3 m) was painted card clumps, 3 crossed quads each. QA 11-24 row 54 (J510: no flat image stands
 *  in for a 3D object) stopped drawing them and row 70 dropped them: the inner ring's real blades stay full to the camera.
 *  Row 71 fills the format's near-field slot (its `cards` rows) with real 3D flowers instead: `NEAR_FLOWERS.per` cells a
 *  side in each `T` m tile, `across` tiles round the camera's (10 m square). */
const NEAR_FLOWERS = phone ? { T: 2, across: 5, per: 5 } : { T: 2, across: 5, per: 6 };
/** the hand-over (m from the camera): the near 3D flowers full inside NEAR[0], gone past NEAR[1]; the far flower heads
 *  come in from just inside it */
const NEAR = [2.3, 3.4] as const;



  const blades = RINGS.map((cfg, index) => { const half = cfg.G * cfg.T / 2; return bladeTile(Math.round(cfg.T / cfg.s), cfg, index === RINGS.length - 1 ? [half * .6,half * .95] : [1e4,1e4], [-1,0,1]); });
  const cfg = FLOWERS, half = cfg.G * cfg.T / 2;
  const flowers = flowerTile(Math.round(cfg.T / cfg.s), cfg.s, [half * .6,half * .96], [NEAR[0]-.4,NEAR[1]-.2,0]);
  const tier = phone ? 'phone' : 'desktop', near = NEAR_FLOWERS, per = near.per;
  return { rings: RINGS, flowers: FLOWERS, cards: { T: near.T, s: near.T / per }, near: NEAR, per, scenes: {
    blades: scene(blades, `${tier}-blades`, publish), flowers: scene([flowers], `${tier}-flowers`, publish),
    cards: scene([nearFlowerTile(per, near.across)], `${tier}-near-flowers`, publish),
  } };
}

/** The build receives owned compressed channel bytes; no generated bank is written under source. */
export function grassChannelBytes():readonly {name:string;bytes:Uint8Array;decoded:number}[]{
  return [true,false].map(phone=>{
    const tier=phone?'phone':'desktop',file=`look/grass/${tier}-channels.bin`,parts:{offset:number;bytes:Uint8Array}[]=[];
    let length=0;
    grassRows(phone,(_id,bytes)=>{const byteOffset=Math.ceil(length/4)*4;length=byteOffset+bytes.byteLength;parts.push({offset:byteOffset,bytes});return {file,byteOffset};});
    const bank=new Uint8Array(length);for(const part of parts)bank.set(part.bytes,part.offset);
    return {name:file,bytes:encodePortableBytes(bank,6),decoded:bank.byteLength};
  });
}
