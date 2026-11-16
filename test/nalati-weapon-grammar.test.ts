import {expect,test} from 'vitest';
import {readNalatiWeaponObservation} from './fixtures/nalati-weapon-observation';

test('native weapon observations retain their defining grammar',()=>{
  expect(readNalatiWeaponObservation({snapshot:()=>JSON.stringify({version:1,slot:'held.bow',bolts:3,enabled:false})})).toEqual({version:1,slot:'held.bow',bolts:3,enabled:false});
  expect(()=>readNalatiWeaponObservation({snapshot:()=>JSON.stringify({version:1,slot:'held.bow',bolts:-1})})).toThrow();
});
