import { expect, test } from 'vitest';
import { defineSpecimenCatalogue, nameSpecimenBook } from '@wildshard/sharddev/bake/specimenCatalogue';
import { GEAR_BOOK } from '../src/generators/gear';

test('published Nalati gear bytes are admitted by the author catalogue reader', () => {
  const emitted = nameSpecimenBook('models/gear-book.json', GEAR_BOOK, { tier: 'phone', dependencies: [] });
  const wire: unknown = JSON.parse(new TextDecoder().decode(emitted.bytes));
  const catalogue = defineSpecimenCatalogue(wire);
  expect(catalogue.model(GEAR_BOOK.rows[0]?.key ?? '')).toBeDefined();
});

test('authoring admission retains strict malformed, duplicate and missing-model refusals', () => {
  expect(() => defineSpecimenCatalogue({ ...GEAR_BOOK, extra: true })).toThrow();
  expect(() => defineSpecimenCatalogue({ ...GEAR_BOOK, rows: [{ key: 'broken', source: { kind: 'packed' } }] })).toThrow();
  const row = GEAR_BOOK.rows[0];
  if (row === undefined) throw new Error('Missing original bow row');
  expect(() => defineSpecimenCatalogue({ ...GEAR_BOOK, rows: [row, row] })).toThrow();
  expect(() => defineSpecimenCatalogue(GEAR_BOOK).model('absent')).toThrow('Missing authored specimen absent');
});
