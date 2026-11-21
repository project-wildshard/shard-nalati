import { nalatiAdmissionProgram } from './admissionProgram';
import { nalatiWeatherProgram } from './weatherProgram';
import { nalatiNavigationProgram } from './navigation';
import type { ProjectGenerationContext } from '@wildshard/sdk/projectGeneration';
import { nalatiShardfileRows } from './shardfile';
import { prepareSpecies } from './output';
import { nalatiRenderTileProgram } from './renderTileProgram';
import { nalatiQueryTerrainProgram } from './terrain';
import { nalatiKokparProgram } from './kokparProgram';
import { nalatiRidingProgram } from './ridingProgram';
import { nalatiTitanProgram } from './stormTitanProgram';
import { nalatiChargeProgram } from './chargeProgram';
import { declaredCreatureLooks } from './declaredCreatureLook';

/** Owned source programs supply admitted binary charges; no inline executable decoding is needed. */
export async function build(ctx: ProjectGenerationContext): Promise<ReturnType<typeof nalatiShardfileRows>> {
  const species = await prepareSpecies(ctx);
  const render = await nalatiRenderTileProgram(ctx), metadata = render.get('data/renderTiles.json');
  if (metadata === undefined) throw new Error('Missing owned render metadata');
  for (const [name, bytes] of render) {
    if (!/^assets\/[a-f0-9]{64}$/u.test(name)) continue;
    if (ctx.asset(bytes) !== name.slice(7)) throw new Error('Owned render tile identity differs');
  }
  return nalatiShardfileRows(species.rows, {
    program: species.rows.program, stealthProgram: species.rows.program,
    compiledBytes: species.rows.compiled.bytes, projectionPages: species.rows.program.v2.artifact.pages,
  }, JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(metadata)) as unknown, await nalatiQueryTerrainProgram(ctx), await nalatiNavigationProgram(ctx), (await nalatiKokparProgram(ctx)).rows, (await nalatiRidingProgram(ctx)).programs, (await nalatiTitanProgram(ctx)).programs, await nalatiWeatherProgram(ctx), (await nalatiAdmissionProgram(ctx)).program, (await nalatiChargeProgram(ctx)).rows, program => {
    if(program.bytes!=='')throw new Error('Nalati shard file requires file-owned program bytes');
    return 0;
  }, await declaredCreatureLooks(ctx), guestProjectionOf(species.rows.presentation));
}

/** ONE-FORMAT OF30: the balbal look-book row's projection, the night riders' guest view programme, for its declared row. */
function guestProjectionOf(presentation: unknown): unknown {
  const rows: unknown = typeof presentation === 'object' && presentation !== null ? Reflect.get(Reflect.get(presentation, 'lookBook') ?? {}, 'rows') : undefined;
  if (!Array.isArray(rows)) throw new Error('Missing species look book');
  const row: unknown = rows.find((entry: unknown) => typeof entry === 'object' && entry !== null && Reflect.get(Reflect.get(entry, 'metadata') ?? {}, 'kind') === 'balbal');
  const projection: unknown = typeof row === 'object' && row !== null ? Reflect.get(row, 'projection') : undefined;
  if (projection === undefined) throw new Error('Missing balbal guest projection');
  return projection;
}
