// SH-nalati-1..5 diagnostic, pending engine investigation. After
// build:shards: node src/scripts/probe-kurgan.mjs
// Enter by real movement and let the authored intro finish. Print the
// player's and King's heights; grant no pose, health or boss progress.
import { boot, rider } from '../../test/ci/journey-rider.mjs';
import { enterKurgan } from '../../test/ci/kurgan-route.mjs';
const { resident, world } = await boot(), r = rider(resident);
try {
  enterKurgan(r);
  r.walk([[-40, -80], [-40, -82], [-36, -87], [-35, -91]]);
  const king = [...r.host.entities.values()].find(actor => actor.kind === 'golden-king');
  if (king === undefined) throw new Error('The admitted kurgan has no King');
  const height = () => ({ tick: r.host.state.tick, player: r.player.position.y, king: king.position.y, offset: king.yOffset, hp: king.hp });
  console.log('intro', height());
  for (let tick = 0; tick < 300; tick++) r.head(0, 0);
  console.log('fight', height());
  const state = () => JSON.parse(r.host.adapters.get('nalati.king').snapshot()).boss;
  for (let tick = 0; tick < 3000 && state().attempts === 1; tick++) r.head(0, 0);
  console.log('after first death/retry', { ...height(), attempts: state().attempts, dead: r.has('dead:actor.player') });
  for (let tick = 1; tick <= 300; tick++) {
    r.head(0, 0);
    if ([1, 2, 5, 30, 120, 300].includes(tick)) console.log('retry suffix', { suffix: tick, ...height(), attempts: state().attempts });
  }
} finally { world.dispose(); }
