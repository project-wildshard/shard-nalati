import { expect, test } from 'vitest';
import { farLook } from '../src/generators/farLook';

// ZONE-ENTRY ZE7: the placeholder's crags read as rock, not snow. Pure snow splat on flat ground stays white; on a steep
// face it is the rock's grey; the far look's colours for grass, gravel and rock are unchanged.
const SNOW = [0, 0, 0, 1] as const, ROCK = [0, 0, 1, 0] as const;
const white = (rgb: readonly number[]) => rgb.every(c => c > 0.85);

test('snow holds on flat ground and turns to rock on a crag', () => {
  expect(white(farLook.colourAt(0, 0, 60, 0, SNOW))).toBe(true);
  expect(white(farLook.colourAt(0, 0, 60, 0.15, SNOW))).toBe(true);
  expect(farLook.colourAt(0, 0, 60, 0.5, SNOW)).toEqual(farLook.colourAt(0, 0, 60, 0.5, ROCK));
  expect(white(farLook.colourAt(0, 0, 60, 0.3, SNOW))).toBe(false);
});

test('a face with no snow is unchanged by its slope', () => {
  for (const w of [[1, 0, 0, 0], [0, 1, 0, 0], ROCK, [0.4, 0.3, 0.3, 0]] as const)
    expect(farLook.colourAt(40, -30, 20, 0.6, w)).toEqual(farLook.colourAt(40, -30, 20, 0, w));
});
