// oxlint-disable-next-line import/no-nodejs-modules -- Hash the shipped executable bytes.
import {createHash} from 'node:crypto';
import {expect,test} from 'vitest';
import { NALATI_VIEW_BLOBS } from '../fixtures/nalati-view-modules';
import {admitScriptV2} from '@wildshard/format/scriptAdmissionV2';
import {output} from '../fixtures/nalati-output-original';
import {outputPlatformPayloads} from '@wildshard/sdk/outputProduct';

const originals = [
  { stem: 'creatureViews', slug: 'creature-views', ioBytes: 8192 },
  { stem: 'eliteViews', slug: 'elite-views', ioBytes: 4096 },
  { stem: 'titanView', slug: 'titan-view', ioBytes: 4096 },
  { stem: 'titanFireView', slug: 'titan-fire-view', ioBytes: 81920 },
  { stem: 'titanWhirlsView', slug: 'titan-whirls-view', ioBytes: 16384 },
] as const;
function verifyOriginal(original: typeof originals[number]): void {
  const name=`views/nalati.${original.slug}.wasm`;
  const blob=NALATI_VIEW_BLOBS.find(row=>row.file.name===name);
  if(blob===undefined||blob.file.kind!=='wasm')throw new Error('Missing owned named view module');
  expect(blob.file).toMatchObject({critical:true,hash:createHash('sha256').update(blob.bytes).digest('hex')});
  expect(blob.script).toMatchObject({abi:2,lane:'view',ioBytes:original.ioBytes});
  expect(()=>admitScriptV2(blob.bytes,{lane:'view',ioBytes:original.ioBytes})).not.toThrow();
  const sections=outputPlatformPayloads(output.platform,['view/modules']);
  expect(sections.get('view/modules')).toContainEqual(expect.objectContaining({id:`nalati.${original.slug}`,module:blob.file.path,abi:2,side:'view',ioBytes:original.ioBytes}));
}
test('raw creatureViews names its shipped bytes and passes view admission',()=>verifyOriginal(originals[0]));
test('raw eliteViews names its shipped bytes and passes view admission',()=>verifyOriginal(originals[1]));
test('raw titanView names its shipped bytes and passes view admission',()=>verifyOriginal(originals[2]));
test('raw titanFireView names its shipped bytes and passes view admission',()=>verifyOriginal(originals[3]));
test('raw titanWhirlsView names its shipped bytes and passes view admission',()=>verifyOriginal(originals[4]));
