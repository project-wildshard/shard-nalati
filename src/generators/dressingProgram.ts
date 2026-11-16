import type { ProjectGenerationContext } from '@wildshard/sharddev/projectGeneration';
import { buildDressingWire } from './dressingWire';

/** Own the original native dressing geometry and metadata; no public/source file is read or published. */
export async function nalatiDressingProgram(ctx: Pick<ProjectGenerationContext, 'cached'>): Promise<ReadonlyMap<string, Uint8Array>> {
  const files = await ctx.cached({ id: 'dressing-geometry', native: true, inputs: [] }, () => {
    const made = buildDressingWire();
    return new Map([['dressing.bin', made.binary], ['dressing.json', made.document]]);
  });
  const names = ['dressing.bin', 'dressing.json'];
  if (files.size !== names.length || [...files.keys()].some(name => !names.includes(name)) || names.some(name => (files.get(name)?.length ?? 0) === 0)) {
    throw new Error('Owned Nalati dressing inventory differs');
  }
  return files;
}
