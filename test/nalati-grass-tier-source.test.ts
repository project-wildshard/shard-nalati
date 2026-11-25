import {expect,test} from 'vitest';
import {parse} from 'valibot';
import {GrassPresentationSchema,grassPresentationFiles} from '@wildshard/format/fieldPresentation';
import {nalatiGrassJson} from './fixtures/nalati-grass-bake';
import {nalatiLateGrassNames} from '../src/generators/modelBindings';

test('only exclusive desktop grass files defer; original phone and shared channels stay eager',()=>{
  const rows=parse(GrassPresentationSchema,nalatiGrassJson()),before=structuredClone(rows);
  const desktop=grassPresentationFiles(rows,'desktop'),phone=grassPresentationFiles(rows,'phone');
  expect(nalatiLateGrassNames(rows)).toEqual(desktop.filter(file=>!phone.includes(file)).sort());
  expect(nalatiLateGrassNames(rows)).toEqual(['look/grass/desktop-blades.bin','look/grass/desktop-channels.bin','look/grass/desktop-flowers.bin']);
  expect(rows).toStrictEqual(before);
  const shared={...rows,desktop:{...rows.desktop,channels:rows.phone.channels}};
  expect(nalatiLateGrassNames(shared)).not.toContain(rows.phone.channels?.file);
  expect(()=>nalatiLateGrassNames({})).toThrow('Missing grass timing tiers');
});

// QA 11-24 row 70 (J510): Nalati's grass draws real blades only; the card clumps, their scene, look and atlas are gone
// (format 0.79's optional cards: all of them or none).
test('the grass carries no card clumps, scenes, look or cardsHeight',()=>{
  const rows=parse(GrassPresentationSchema,nalatiGrassJson());
  for(const tier of [rows.phone,rows.desktop]){expect(tier.cards).toBeUndefined();expect(tier.scenes.cards).toBeUndefined();}
  expect(rows.view.looks).not.toContain('nalati-grass-cards');
  expect(rows.view.cardsHeight).toBeUndefined();
  expect([...grassPresentationFiles(rows,'phone'),...grassPresentationFiles(rows,'desktop')].filter(file=>file.includes('cards'))).toEqual([]);
});
