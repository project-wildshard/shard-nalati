import { nalatiSpearPool, type SpearPoolRows } from '../../src/generators/spearPool';

/** The spear pool as the shard build makes it (GR6). */
export const nalatiSpear: { glb: Uint8Array; rows: SpearPoolRows } = nalatiSpearPool();
