import type { KeyInput, ModeMeta } from '@/types';
import { BaseMode, type HudChip } from '../shared/BaseMode';
import { t } from '@/services/i18n';
import type { GameMode } from '../types';

/**
 * Starting point for a new mode. Copy this folder, rename it, then:
 *  1. add the mode id to `ModeId` in src/types/index.ts
 *  2. add an entry to src/modes/registry.ts with a lazy import()
 *  3. add `mode.<id>.name` and `mode.<id>.desc` to src/i18n/en.ts
 *  4. document the rules in docs/GAME_MODES.md
 *
 * This file is not registered, so it never ships in a bundle.
 */
const META: ModeMeta = {
  id: 'word-rain', // replace with your mode id
  nameKey: 'mode.word-rain.name',
  descKey: 'mode.word-rain.desc',
  color: 'blue',
  letter: 'X',
  unlockLevel: 1,
  surface: 'canvas',
};

class TemplateMode extends BaseMode {
  readonly id = META.id;
  readonly meta = META;

  private words = 0;

  /** Load content and set up state. Services arrive through `this.ctx`. */
  protected async onInit(): Promise<void> {
    const pack = await this.ctx.content.language(this.ctx.settings.language);
    this.engine.addTarget(this.ctx.rng.pick(pack.words.easy));
  }

  protected onStart(): void {
    this.syncHud();
  }

  /** Fixed 60 Hz logic. Never read the wall clock here; use `dt`. */
  protected onUpdate(_dt: number): void {}

  /** `alpha` interpolates between the last two updates. Allocate nothing here. */
  protected onRender(_alpha: number): void {}

  protected onKey(input: KeyInput): void {
    const outcome = this.engine.handle(input);
    if (outcome.kind === 'complete') {
      this.words++;
      this.finish(); // or load the next target
    }
  }

  protected override chips(): HudChip[] {
    return [{ label: t('hud.lines'), value: String(this.words) }];
  }
}

export function create(): GameMode {
  return new TemplateMode();
}
