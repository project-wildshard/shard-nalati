import { expect, test } from 'vitest';
import { parseQuestData } from '@wildshard/format/quests';
import { Flags } from '@wildshard/engine/world/interact/flags';
import { QuestState, lineFor } from '@wildshard/engine/quest/core';
import feats from '../src/shards/nalati-grasslands/data/feats.json' with { type: 'json' };
import content from '../src/shards/nalati-grasslands/data/questContent.json' with { type: 'json' };
const quests = parseQuestData({ ...content.quests, achievements: feats });

test('authored Nalati quest content crosses public admission', () => {
  expect(quests.quests.length).toBeGreaterThan(0);
  expect(() => parseQuestData({ ...quests, quests: [{ id: 42 }] })).toThrow();
});

test('compiled Nalati chapters resume old flag saves at every step and retain elder dialogue', () => {
  const flags = new Flags('compiled-nalati-story', false);
  for (const row of quests.quests) {
    for (const flag of row.startWhen?.all ?? []) flags.set(flag);
    const quest = new QuestState(row, flags);
    try {
      for (const step of row.steps) {
        expect(quest.current?.id).toBe(step.id);
        const restoredFlags = new Flags('restored-nalati-story', false);
        restoredFlags.restore(flags.all);
        const restored = new QuestState(row, restoredFlags);
        try {
          restored.restore(quest.snapshot());
          expect(restored.current?.id).toBe(step.id);
          for (const npc of Object.values(content.npcs)) expect(lineFor(npc, restoredFlags)).toEqual(lineFor(npc, flags));
        } finally { restored.dispose(); }
        for (const flag of step.done.all ?? step.done.any?.slice(0, 1) ?? []) flags.set(flag);
      }
      expect(quest.isComplete).toBe(true);
      const saved = flags.all;
      flags.reset(); flags.restore(saved);
      expect(quest.isComplete).toBe(true);
    } finally { quest.dispose(); }
  }
  expect(flags.has('quest:tulpar')).toBe(true);
  expect(flags.has('quest:golden-king')).toBe(true);
  expect(flags.has('quest:father-wind')).toBe(true);
  expect(lineFor(content.npcs.elder, flags)?.lines).toEqual(content.npcs.elder.dialogue[0]?.lines);
});
