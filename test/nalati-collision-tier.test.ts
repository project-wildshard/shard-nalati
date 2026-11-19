// NET-LAG NL12 (f), meta docs/plans/NET-LAG-PLAN.md: a desktop page collided on its own finer rock hulls, 4 to 12 cm off
// the phone hulls the room simulates, and corrected along Nalati's boulders where a phone page never did. Every tier's
// boulder and slab layers carry the same contacts: the room's.
import { expect, test } from 'vitest';
import { COLLISION_TIER } from '../src/generators/dressingScene';
import { currentDressingScene } from './fixtures/nalati-dressing-scene';
import { nalatiSpecimens } from './fixtures/nalati-specimens';
import { nalatiBalbal } from './fixtures/nalati-balbal';
import { nalatiRuntime } from './fixtures/nalati-runtime';
import { nalatiDecorative } from './fixtures/nalati-decorative';

test('the boulder and slab layers collide on the same hulls on phone and desktop', () => {
  const rocks = (tier: 'phone' | 'desktop') => currentDressingScene(tier, nalatiDecorative, nalatiRuntime, nalatiBalbal, nalatiSpecimens).layers
    .filter(layer => /^nalati-dress-(?:boulder|boulder-tall|slab)$/u.test(layer.id)).map(layer => [layer.id, layer.contacts]);
  const phone = rocks('phone');
  expect(COLLISION_TIER).toBe('phone');
  expect(phone).toHaveLength(3);
  expect(rocks('desktop')).toEqual(phone);
});
