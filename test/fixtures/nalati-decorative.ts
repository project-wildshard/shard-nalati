// oxlint-disable-next-line import/no-nodejs-modules -- Prepare original native author metadata before scene assertions.
import { readFileSync } from 'node:fs';
import { withPortableMath } from '@wildshard/sharddev/commons/bake/portableMath';
import { decorativeRows } from '../../src/generators/decorativeInput';

/** Complete native profiles; no retired generated scene or decorative metadata is read. */
export const nalatiDecorative: ReturnType<typeof decorativeRows> = withPortableMath(() => decorativeRows(readFileSync('public/assets/baked/nalati-grasslands/terrain.bin')));
