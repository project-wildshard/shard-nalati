import { app } from '@wildshard/engine/app/runtime';
import { ActorProjectionV2 } from '@wildshard/engine/game/population/actorProjectionV2';
import rows from './balbal-projection-original.json' with { type: 'json' };

/** Frozen author rows feed the real production binder and its scoped cache. */
export const projection = new ActorProjectionV2('balbal', structuredClone(rows), app);
export const BALBAL_SPECIES = projection.binding;
export function program(): ReturnType<ActorProjectionV2['program']> { return projection.program(); }
