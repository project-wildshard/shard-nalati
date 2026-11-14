// oxlint-disable-next-line import/no-nodejs-modules -- The committed lattice and placement inputs feed the grass construction.
import { readFileSync } from 'node:fs';
import { nativeNalatiDressingPlacements } from '../../src/generators/nativeDressingPlacements.mjs';
import { nalatiGrassBake, type NalatiGrass } from '../../src/generators/grassBake.mjs';

/** The grass as the shard build makes it (GR6), over the committed inputs. */
export const nalatiGrass: NalatiGrass = nalatiGrassBake(new Uint8Array(readFileSync('public/assets/baked/nalati-grasslands/terrain.bin')),
  await nativeNalatiDressingPlacements(file => new Uint8Array(readFileSync(file))));
/** Its rows as the retired job's JSON carried them, for readers that parse them as unknown input. */
export const nalatiGrassJson = (): unknown => structuredClone(nalatiGrass.rows);
