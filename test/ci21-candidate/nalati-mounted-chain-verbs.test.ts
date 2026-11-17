// oxlint-disable-next-line import/no-nodejs-modules -- Bound real native input capture and independent replay.
import {spawnSync} from 'node:child_process';
// oxlint-disable-next-line import/no-nodejs-modules -- Resolve only the maintained native proof.
import {resolve} from 'node:path';
// oxlint-disable-next-line import/no-nodejs-modules -- The strict loader uses an absolute URL.
import {expect,test} from 'vitest';

test('real mounted contacts earn a two-hit chain and restore its exact native suffix',()=>{
  const child=spawnSync(process.execPath,['--experimental-transform-types','--import',import.meta.resolve('@wildshard/engine/scripts/sim-node-loader.mjs'),
    resolve('test/fixtures/headless/nalati-mounted-chain-run.ts')],{encoding:'utf8',timeout:175_000});
  console.info(child.stdout);
  expect(child.status,child.stdout+child.stderr+String(child.error??'')+(child.signal??'')).toBe(0);
  expect(child.stdout).toContain('"story":"native-mounted-chain"');
},180_000);
