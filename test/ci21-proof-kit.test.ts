import {expect,test} from 'vitest';

test('the released-engine proof fixtures load through public package imports',async()=>{
  await Promise.all([
    import('./fixtures/nalati-admission-loan'),
    import('./fixtures/nalati-creature-view-native'),
    import('./fixtures/nalatiShapes'),
  ]);
});
