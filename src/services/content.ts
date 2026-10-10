import type { BeatChart, CodePack, Difficulty, LanguagePack, Story } from '@/types';
import { beatChartSchema, codePackSchema, languagePackSchema, storySchema } from '@/types/schemas';
import type { Rng } from '@/engine/Rng';
import { DIFFICULTIES } from '@/modes/shared/difficulty';

const languages = import.meta.glob('../../content/languages/*.json');
const codePacks = import.meta.glob('../../content/code/*.json');
const stories = import.meta.glob('../../content/stories/*.json');
const charts = import.meta.glob('../../content/charts/*.json');

type Loaders = Record<string, () => Promise<unknown>>;

function pick(loaders: Loaders, id: string): (() => Promise<unknown>) | undefined {
  const entry = Object.entries(loaders).find(([path]) => path.endsWith(`/${id}.json`));
  return entry?.[1];
}

async function loadValidated<T>(
  loaders: Loaders,
  id: string,
  schema: { parse: (v: unknown) => T },
  kind: string,
): Promise<T> {
  const loader = pick(loaders, id);
  if (!loader) throw new Error(`Unknown ${kind}: ${id}`);
  const mod = (await loader()) as { default: unknown };
  return schema.parse(mod.default);
}

/** Loads and validates content packs, and caches them for the session. */
export class ContentService {
  private cache = new Map<string, unknown>();

  async language(id: string): Promise<LanguagePack> {
    return this.cached(`lang:${id}`, () =>
      loadValidated(languages, id, languagePackSchema, 'language pack'),
    );
  }

  async code(id: string): Promise<CodePack> {
    return this.cached(`code:${id}`, () =>
      loadValidated(codePacks, id, codePackSchema, 'code pack'),
    );
  }

  async story(id: string): Promise<Story> {
    return this.cached(`story:${id}`, () => loadValidated(stories, id, storySchema, 'story'));
  }

  async chart(id: string): Promise<BeatChart> {
    return this.cached(`chart:${id}`, () => loadValidated(charts, id, beatChartSchema, 'chart'));
  }

  listCodePacks(): string[] {
    return Object.keys(codePacks).map(basename);
  }

  listCharts(): string[] {
    return Object.keys(charts).map(basename);
  }

  /**
   * Words for a difficulty, filtered by length, kid mode and the blocklist
   * (FR-CNT-02, FR-CNT-03).
   */
  wordPool(pack: LanguagePack, difficulty: Difficulty, kidMode: boolean): string[] {
    const preset = DIFFICULTIES[difficulty];
    const source = kidMode || difficulty === 'kid' ? pack.words.kid : bucket(pack, difficulty);
    const blocked = new Set((pack.blocklist ?? []).map((w) => w.toLowerCase()));
    const pool = source.filter(
      (w) =>
        w.length >= preset.minLen && w.length <= preset.maxLen && !blocked.has(w.toLowerCase()),
    );
    return pool.length > 0 ? pool : source.filter((w) => !blocked.has(w.toLowerCase()));
  }

  randomWord(pool: string[], rng: Rng): string {
    return rng.pick(pool);
  }

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit) return hit as T;
    const value = await load();
    this.cache.set(key, value);
    return value;
  }
}

function bucket(pack: LanguagePack, difficulty: Difficulty): string[] {
  switch (difficulty) {
    case 'kid':
      return pack.words.kid;
    case 'easy':
      return pack.words.easy;
    case 'normal':
      return pack.words.normal;
    default:
      return pack.words.hard;
  }
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1, -'.json'.length);
}

export const content = new ContentService();
