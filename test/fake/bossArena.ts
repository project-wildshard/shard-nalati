import { BossArenaRoom } from '@wildshard/engine/game/boss/arenaRoomView';
import room from '../../src/data/bossArenaRoom.json' with { type: 'json' };
import view from '../../src/data/kurganView.json' with { type: 'json' };
import { SHAPES } from '../fixtures/nalatiShapes';

export function bossArena(): BossArenaRoom {
 return new BossArenaRoom({ ...room, view }, new Map([...view.scene.nodes, ...view.static.nodes].flatMap(row => 'geometry' in row ? [[row.geometry, SHAPES.handle(row.geometry).copy()]] as const : [])));
}
