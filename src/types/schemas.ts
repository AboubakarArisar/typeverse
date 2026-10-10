import { z } from 'zod';

export const modeIdSchema = z.enum([
  'word-rain',
  'type-beats',
  'zombie-survival',
  'typing-racer',
  'code-typer',
  'word-tower',
  'story',
  'zen',
]);

export const difficultySchema = z.enum(['kid', 'easy', 'normal', 'hard', 'insane']);

export const settingsSchema = z.object({
  masterVolume: z.number().min(0).max(1),
  musicVolume: z.number().min(0).max(1),
  sfxVolume: z.number().min(0).max(1),
  soundPack: z.string(),
  theme: z.enum(['system', 'light', 'dark']),
  reducedMotion: z.boolean(),
  fontScale: z.number().min(0.75).max(1.75),
  language: z.string(),
  kidMode: z.boolean(),
  difficulty: difficultySchema,
});

export const sessionResultSchema = z.object({
  mode: modeIdSchema,
  date: z.string(),
  durationMs: z.number().nonnegative(),
  score: z.number(),
  wpm: z.number(),
  rawWpm: z.number(),
  accuracy: z.number().min(0).max(1),
  maxCombo: z.number().nonnegative(),
  language: z.string(),
  difficulty: difficultySchema,
  highlights: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
});

export const saveFileSchema = z.object({
  version: z.number().int().positive(),
  profile: z.object({
    name: z.string().optional(),
    createdAt: z.string(),
    xp: z.number().nonnegative(),
    level: z.number().int().positive(),
    onboarded: z.boolean().optional(),
  }),
  settings: settingsSchema,
  unlocks: z.array(z.string()),
  bests: z.record(modeIdSchema, z.object({ score: z.number(), wpm: z.number(), date: z.string() })),
  sessions: z.array(sessionResultSchema).max(100),
  keyStats: z.record(
    z.string(),
    z.object({ hits: z.number().nonnegative(), misses: z.number().nonnegative() }),
  ),
  story: z.record(z.string(), z.object({ chapter: z.number(), flags: z.array(z.string()) })),
});

export const languagePackSchema = z.object({
  id: z.string(),
  name: z.string(),
  dir: z.enum(['ltr', 'rtl']),
  font: z.string().optional(),
  words: z.object({
    easy: z.array(z.string()).min(1),
    normal: z.array(z.string()).min(1),
    hard: z.array(z.string()).min(1),
    kid: z.array(z.string()).min(1),
  }),
  sentences: z.array(z.string()).min(1),
  zen: z.array(z.string()).min(1),
  blocklist: z.array(z.string()).optional(),
});

export const codePackSchema = z.object({
  id: z.string(),
  name: z.string(),
  license: z.string(),
  snippets: z
    .array(
      z.object({
        id: z.string(),
        difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
        lines: z.array(z.string()).min(1),
      }),
    )
    .min(1),
});

export const storySchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  license: z.string(),
  start: z.string(),
  nodes: z
    .array(
      z.object({
        id: z.string(),
        chapter: z.number().int().nonnegative(),
        text: z.string(),
        choices: z
          .array(z.object({ type: z.string(), label: z.string(), next: z.string() }))
          .optional(),
        gate: z
          .object({ minAccuracy: z.number().min(0).max(1), pass: z.string(), fail: z.string() })
          .optional(),
        next: z.string().optional(),
        flag: z.string().optional(),
      }),
    )
    .min(1),
});

export const beatChartSchema = z.object({
  id: z.string(),
  title: z.string(),
  bpm: z.number().positive(),
  offsetMs: z.number(),
  license: z.string(),
  notes: z.array(z.object({ beat: z.number().nonnegative(), char: z.string().length(1) })).min(1),
});
