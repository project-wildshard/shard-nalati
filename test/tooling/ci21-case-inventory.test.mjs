import assert from 'node:assert/strict';
import test from 'node:test';
import { caseInventory } from '../../scripts/ci21-case-inventory.mjs';

test('retains ordered direct cases inside original serial journey suites', () => {
  const source = "import {describe,test} from 'vitest'; describe('journey',{concurrent:false,shuffle:false},()=>{test('entry',()=>{},180000);test('continuation',{timeout:300000},async()=>{});});";
  assert.deepEqual(caseInventory(source, 'journey.test.ts'), ['entry', 'continuation']);
});
test('resolves the original fixed weapon mode without dropping a template-title case', () => {
  const source = "import {test} from 'vitest'; const mode='javelin'; test(`real ${mode} inputs`,()=>{});";
  assert.deepEqual(caseInventory(source, 'weapon.test.ts'), ['real javelin inputs']);
});
test('refuses skipped, focused, generated, aliased and dynamically named cases', () => {
  for (const declaration of ["test.skip('entry',()=>{})", "test.only('entry',()=>{})", "test.each([1])('entry',()=>{})",
    "const renamed=test; renamed('entry',()=>{})", "test(title(),()=>{})", "describe.skip('journey',()=>{test('entry',()=>{})})"])
    assert.throws(() => caseInventory(`import {test,describe} from 'vitest'; ${declaration}`, 'invalid.test.ts'));
  assert.throws(() => caseInventory("import {it as test} from 'vitest'; test('entry',()=>{})", 'alias.test.ts'));
});
test('refuses missing and duplicate original declarations', () => {
  assert.throws(() => caseInventory("import {test} from 'vitest';", 'empty.test.ts'));
  assert.throws(() => caseInventory("import {test} from 'vitest'; test('entry',()=>{});test('entry',()=>{});", 'duplicate.test.ts'));
});
