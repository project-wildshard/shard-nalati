import {expect,test} from 'vitest';
import {readNalatiWeaponObservation} from './fixtures/nalati-weapon-observation';

test('the released-engine proof fixtures load through public package imports',async()=>{
  await Promise.all([
    import('./fixtures/nalati-admission-loan'),
    import('./fixtures/nalati-creature-view-native'),
    import('./fixtures/nalatiShapes'),import('./fixtures/nalati-species-world'),
  ]);
});

test('native weapon observations retain their defining grammar',()=>{
  expect(readNalatiWeaponObservation({snapshot:()=>JSON.stringify({version:1,slot:'held.bow',bolts:3,enabled:false})})).toEqual({version:1,slot:'held.bow',bolts:3,enabled:false});
  expect(()=>readNalatiWeaponObservation({snapshot:()=>JSON.stringify({version:1,slot:'held.bow',bolts:-1})})).toThrow();
});
