import { expect, test, vi } from 'vitest';
import { unzlibSync } from 'fflate';
import { unshuffleLanes } from '@wildshard/engine/core/deflate';
import { fixedDraws } from '@wildshard/engine/game/models/fixedDraws';
import { FixedDrawRowsSchema } from '@wildshard/format/fixedDraws';
import * as v from 'valibot';
import { nalatiNamedPlaceDraw } from '../../src/generators/placeWire';
import { originalPlaceBinary } from '../fixtures/nalati-original-place-binary';
import original from '../fixtures/nalati-shape-book-original.json' with { type: 'json' };

const compressed=await originalPlaceBinary(),raw=unshuffleLanes(unzlibSync(compressed));
const actors=v.parse(FixedDrawRowsSchema,original.draws).filter(row=>'lane'in row);

test('all 36 original actor shapes use the admitted bank with complete geometry parity',async()=>{
  expect(actors).toHaveLength(36);
  const first=actors[0];if(first===undefined||!('url'in first.lane))throw new Error('Missing original lane');
  const legacy=fixedDraws({slug:'before',file:()=>Promise.reject(new Error('No raw block'))},actors);
  await legacy.load(new Map([[first.lane.url,raw]]));
  const file=vi.fn(()=>Promise.resolve(compressed)),url=vi.fn(()=>Promise.reject(new Error('Retired public bank must not be fetched')));
  const current=fixedDraws({slug:'nalati-grasslands',file},actors.map(nalatiNamedPlaceDraw),undefined,url);
  await current.load();expect(file).toHaveBeenCalledExactlyOnceWith('world/places.bin');expect(url).not.toHaveBeenCalled();
  for(const row of actors){
    const before=legacy.handle(row.slot).take(),candidate=current.handle(row.slot).take();
    const chamber=row.slot==='dungeon:interior';
    const after=chamber?candidate.toNonIndexed():candidate;
    try{
      if(chamber)expect(candidate.index?.count).toBe(before.getAttribute('position').count);
      expect(Object.keys(after.attributes)).toEqual(Object.keys(before.attributes));
      for(const [name,attribute]of Object.entries(before.attributes)){
        const actual=after.getAttribute(name);expect(actual.itemSize).toBe(attribute.itemSize);expect(actual.normalized).toBe(attribute.normalized);
        expect(Array.from(actual.array)).toEqual(Array.from(attribute.array));
      }
      expect(Array.from(after.index?.array??[])).toEqual(Array.from(before.index?.array??[]));
      expect(candidate.boundingBox).toEqual(before.boundingBox);expect(candidate.boundingSphere).toEqual(before.boundingSphere);
    }finally{before.dispose();after.dispose();if(chamber)candidate.dispose();}
  }
});
