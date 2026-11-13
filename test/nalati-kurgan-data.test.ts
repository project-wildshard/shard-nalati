import { expect, test } from 'vitest';
import * as v from 'valibot';
import { ArenaFightPageSchema } from '@wildshard/engine/game/boss/arenaRoomRows';
import { ArenaBossProfileSchema } from '@wildshard/format/bossProfiles';
import { nalatiGoldenKingRows } from '../src/generators/kurganRows';

test('the authored Golden King page crosses runtime fight admission', () => {
  const wire: unknown = JSON.parse(JSON.stringify(nalatiGoldenKingRows().page));
  const page = v.parse(ArenaFightPageSchema, wire);
  expect(v.parse(ArenaBossProfileSchema, page.profile).pattern).toBe('arena');
  expect(page.respawn.every(Number.isFinite)).toBe(true);
  expect(() => v.parse(ArenaFightPageSchema, { ...page, respawn: [0, Number.NaN, 0] })).toThrow();
  expect(() => v.parse(ArenaFightPageSchema, { ...page, cuts: [{ damage: -1 }] })).toThrow();
});
