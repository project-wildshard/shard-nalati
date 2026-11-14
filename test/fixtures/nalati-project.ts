import { readProjectAssets } from '@wildshard/sharddev/project';
import { runSnapshot } from './runSnapshot';

/** Nalati's project read over its author folder and public/assets, as the shipped-output suites read it (CI7: once per
 *  CI run, else per importing file). */
export function readNalatiProject(): ReturnType<typeof readProjectAssets> {
  return runSnapshot('nalati-project', () => readProjectAssets('src', undefined, { folder: 'nalati-grasslands', imageRoots: [
    { prefix: '/src/shards/nalati-grasslands/', directory: 'src' },
    { prefix: '/assets/', directory: 'public/assets' },
  ] }));
}
