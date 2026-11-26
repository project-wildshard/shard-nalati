// oxlint-disable-next-line import/no-nodejs-modules -- Bound the actual field visit and independent native worker.
import {spawnSync} from 'node:child_process';
// oxlint-disable-next-line import/no-nodejs-modules -- Resolve the maintained fixed native fixture.
import {resolve} from 'node:path';
// oxlint-disable-next-line import/no-nodejs-modules -- The strict source loader requires an absolute URL.
import {expect,test} from 'vitest';

test('the earned pasture visit survives its ordinary raid and fresh-worker defense replay',()=>{
  const child=spawnSync(process.execPath,['--import',import.meta.resolve('@wildshard/sdk/headless/scripts/sim-node-loader.mjs'),
    resolve('test/fixtures/headless/nalati-flock-run.ts')],{encoding:'utf8',timeout:175_000});
  expect(child.status,child.stdout+child.stderr+String(child.error??'')+(child.signal??'')).toBe(0);expect(child.stdout).toContain('"story":"native-flock-raid"');
},180_000);
