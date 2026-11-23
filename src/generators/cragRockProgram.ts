import type { ProjectGenerationContext } from '@wildshard/sdk/projectGeneration';
import { nalatiCragRock, type NalatiCragRows } from './cragRockRows';

const LATTICE = '/assets/baked/nalati-grasslands/terrain.bin', BANK = '/assets/nalati/baked/crags.bin';

/** The crag rows at build time over the lattice, after checking the committed bank is this construction's bytes. */
export async function nalatiCragRockProgram(ctx: Pick<ProjectGenerationContext, 'cached'>): Promise<NalatiCragRows> {
  const files = await ctx.cached({ id: 'crag-rock-inputs', inputs: [LATTICE, BANK] }, inputs => {
    const lattice = inputs.get(LATTICE), bank = inputs.get(BANK);
    if (lattice === undefined || bank === undefined) throw new Error('Missing Nalati crag inputs');
    return new Map([['lattice.bin', lattice], ['crags.bin', bank]]);
  });
  const lattice = files.get('lattice.bin'), committed = files.get('crags.bin');
  if (lattice === undefined || committed === undefined) throw new Error('Missing Nalati crag inputs');
  const made = nalatiCragRock(lattice);
  if (made.bin.length !== committed.length || made.bin.some((value, i) => value !== committed[i]))
    throw new Error('Committed crags.bin differs from the crag construction: run scripts/bake-nalati-crags.mjs');
  return made.rows;
}
