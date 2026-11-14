import { NALATI_ADMISSION } from './nalati-admission';
import { nalatiHeadlessAssembly, type NalatiHeadlessAssembly } from '../../src/generators/nativeGroups';
import { NALATI_PASTURE } from './nalati-titan';

/** GR6: Nalati's headless assembly around the build's compiled pasture programme (the shard build makes the same). */
export const NALATI_HEADLESS_ASSEMBLY: NalatiHeadlessAssembly = nalatiHeadlessAssembly(NALATI_PASTURE, NALATI_ADMISSION);
