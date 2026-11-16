import { test } from 'node:test';
import { earnTameKokparTitan } from '../ci/taming-journey.test.mjs';
import { earnTitanRewards } from './titan-reward.mjs';

test('Nalati: tame, kokpar, Titan rewards and exact continuations', {timeout:240_000}, t => earnTameKokparTitan(t, earnTitanRewards));
