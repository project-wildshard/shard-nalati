// @vitest-environment happy-dom
// oxlint-disable-next-line import/no-nodejs-modules -- Exercise a genuinely cold, private immutable test oracle cache.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
// oxlint-disable-next-line import/no-nodejs-modules -- Keep the entire proof below repository tmp.
import { resolve } from 'node:path';
import {afterAll,beforeAll,expect,test} from 'vitest';
import { hashImmutableBytes } from '@wildshard/sdk/immutable';
import { originalSpeciesFile, originalSpeciesFiles, forgetOriginalSpeciesLoans } from './fixtures/nalati-original-species';
import pins from './fixtures/nalati-species-files.json' with { type: 'json' };

let owner:{root:string;cache:string}|undefined;
beforeAll(()=>{const root=mkdtempSync(resolve('tmp/nalati-species-loans-'));owner={root,cache:resolve(root,'files')};});
afterAll(()=>{if(owner!==undefined){forgetOriginalSpeciesLoans(owner.cache);rmSync(owner.root,{recursive:true,force:true});}});
function loanCache():string{if(owner===undefined)throw new Error('Missing private species loan owner');return owner.cache;}

const names = ['species.json', 'bodies.bin', 'boot.json', 'held-weapons.wasm', 'held-witness.bin'];
test('cold source oracle and every detached warm loan retain all five complete original files', () => {
  const directory = mkdtempSync(resolve('tmp/nalati-species-oracle-')), cache = resolve(directory, 'files');
  try {
    const cold = originalSpeciesFiles(cache);
    expect(cold.size).toBe(5);
    for (const [index, pin] of pins.entries()) {
      const name = names[index], bytes = name === undefined ? undefined : cold.get(name);
      if (bytes === undefined) throw new Error('Missing complete original species fixture');
      expect(bytes.length).toBe(pin.bytes); expect(hashImmutableBytes(bytes)).toBe(pin.sha256);
      expect(Buffer.compare(bytes, originalSpeciesFile(name ?? 'missing',loanCache()))).toBe(0);
      bytes.fill(0);
    }
    const warm = originalSpeciesFiles(cache);
    for (const [index, pin] of pins.entries()) {
      const name = names[index], bytes = name === undefined ? undefined : warm.get(name);
      if (bytes === undefined) throw new Error('Missing warm original species fixture');
      expect(hashImmutableBytes(bytes)).toBe(pin.sha256);
    }
    writeFileSync(resolve(cache, 'boot.json'), new Uint8Array([0]));
    expect(() => originalSpeciesFiles(cache)).toThrow('Original species test cache differs: boot.json');
  } finally { rmSync(directory, { recursive: true, force: true }); }
},30_000);

test('individual original file loans are detached and unknown names refuse', () => {
  const first = originalSpeciesFile('boot.json',loanCache()), before = first.slice(); first.fill(0);
  expect(Buffer.compare(originalSpeciesFile('boot.json',loanCache()), before)).toBe(0);
  expect(() => originalSpeciesFile('extra.bin',loanCache())).toThrow('Unknown original species file');
},30_000);
