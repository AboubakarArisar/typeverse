import { describe, expect, it } from 'vitest';
import en from '../../content/languages/en.json';
import javascript from '../../content/code/javascript.json';
import python from '../../content/code/python.json';
import html from '../../content/code/html.json';
import story from '../../content/stories/the-lost-key.json';
import firstLight from '../../content/charts/first-light.json';
import {
  beatChartSchema,
  codePackSchema,
  languagePackSchema,
  saveFileSchema,
  storySchema,
} from '../../src/types/schemas';
import { emptySave } from '../../src/services/storage';
import { canTransition } from '../../src/modes/types';

describe('content packs validate against their schemas (FR-CNT-01, FR-CNT-04)', () => {
  it('accepts the English language pack', () => {
    expect(() => languagePackSchema.parse(en)).not.toThrow();
  });

  it('accepts every code pack', () => {
    for (const pack of [javascript, python, html]) {
      expect(() => codePackSchema.parse(pack)).not.toThrow();
    }
  });

  it('accepts the first story and every node it links to exists', () => {
    const parsed = storySchema.parse(story);
    const ids = new Set(parsed.nodes.map((n) => n.id));
    expect(ids.has(parsed.start)).toBe(true);
    for (const node of parsed.nodes) {
      if (node.next) expect(ids.has(node.next)).toBe(true);
      for (const choice of node.choices ?? []) expect(ids.has(choice.next)).toBe(true);
      if (node.gate) {
        expect(ids.has(node.gate.pass)).toBe(true);
        expect(ids.has(node.gate.fail)).toBe(true);
      }
    }
  });

  it('accepts a rhythm chart with ordered beats', () => {
    const chart = beatChartSchema.parse(firstLight);
    const beats = chart.notes.map((n) => n.beat);
    expect([...beats].sort((a, b) => a - b)).toEqual(beats);
  });

  it('keeps kid words short and free of the blocklist (FR-CNT-02, FR-CNT-03)', () => {
    const pack = languagePackSchema.parse(en);
    const blocked = new Set((pack.blocklist ?? []).map((w) => w.toLowerCase()));
    for (const word of pack.words.kid) {
      expect(word.length).toBeLessThanOrEqual(5);
      expect(blocked.has(word)).toBe(false);
    }
    for (const bucket of Object.values(pack.words)) {
      for (const word of bucket) expect(blocked.has(word.toLowerCase())).toBe(false);
    }
  });
});

describe('save files', () => {
  it('a fresh save validates (NFR-13)', () => {
    expect(() => saveFileSchema.parse(emptySave())).not.toThrow();
  });

  it('rejects a tampered save', () => {
    const broken = { ...emptySave(), profile: { createdAt: 'x', xp: -5, level: 0 } };
    expect(saveFileSchema.safeParse(broken).success).toBe(false);
  });
});

describe('mode state machine', () => {
  it('allows the documented transitions only', () => {
    expect(canTransition('intro', 'countdown')).toBe(true);
    expect(canTransition('playing', 'paused')).toBe(true);
    expect(canTransition('paused', 'playing')).toBe(true);
    expect(canTransition('result', 'intro')).toBe(true);
    expect(canTransition('intro', 'playing')).toBe(false);
    expect(canTransition('result', 'playing')).toBe(false);
  });
});
