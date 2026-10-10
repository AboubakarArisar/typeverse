import type { KeyInput, ModeMeta, Story, StoryNode } from '@/types';
import { BaseMode, type HudChip } from '../shared/BaseMode';
import { modeRegistry } from '../registry';
import { t } from '@/services/i18n';
import type { GameMode } from '../types';

const STORY_ID = 'the-lost-key';

/** Story Mode (FR-SM-01): typed passages, typed choices, accuracy gates. */
class StoryMode extends BaseMode {
  readonly id = 'story' as const;
  readonly meta: ModeMeta = modeRegistry.story.meta;

  private story!: Story;
  private node!: StoryNode;
  private flags: string[] = [];
  private phase: 'passage' | 'choice' = 'passage';
  private passageCorrect = 0;
  private passageTyped = 0;

  protected async onInit(): Promise<void> {
    this.story = await this.ctx.content.story(STORY_ID);
    this.node = this.findNode(this.story.start);
  }

  protected onStart(): void {
    this.enterNode(this.node);
  }

  protected onUpdate(): void {
    // Story Mode advances on input only.
  }

  protected onRender(): void {
    // DOM overlay handles all drawing.
  }

  protected onKey(input: KeyInput): void {
    const outcome = this.engine.handle(input);
    if (outcome.kind === 'ignored' || outcome.kind === 'released') return;

    if (this.phase === 'passage') {
      this.passageTyped++;
      if (outcome.kind !== 'wrong') this.passageCorrect++;
    }

    if (outcome.kind === 'wrong') this.ctx.audio.play('error');
    else this.ctx.audio.play('key');

    if (outcome.kind !== 'complete') {
      this.renderNode();
      return;
    }

    if (this.phase === 'choice') {
      const choice = this.node.choices?.find(
        (c) => c.type.toLowerCase() === outcome.target.text.toLowerCase(),
      );
      if (choice) this.goTo(choice.next);
      return;
    }
    this.afterPassage();
  }

  protected override chips(): HudChip[] {
    return [{ label: t('hud.chapter'), value: String(this.node?.chapter ?? 1) }];
  }

  private findNode(id: string): StoryNode {
    const node = this.story.nodes.find((n) => n.id === id);
    if (!node) throw new Error(`Story node not found: ${id}`);
    return node;
  }

  private enterNode(node: StoryNode): void {
    this.node = node;
    if (node.flag) this.flags.push(node.flag);
    this.phase = node.choices ? 'choice' : 'passage';
    this.passageCorrect = 0;
    this.passageTyped = 0;

    this.engine.clearTargets();
    if (node.choices) {
      for (const choice of node.choices) this.engine.addTarget(choice.type);
    } else {
      this.engine.addTarget(node.text);
    }
    this.renderNode();
    this.syncHud();
  }

  private afterPassage(): void {
    const accuracy = this.passageTyped === 0 ? 1 : this.passageCorrect / this.passageTyped;
    const gate = this.node.gate;
    if (gate) {
      this.goTo(accuracy >= gate.minAccuracy ? gate.pass : gate.fail);
      return;
    }
    if (this.node.next) {
      this.goTo(this.node.next);
      return;
    }
    this.renderEnd();
    this.finish();
  }

  private goTo(id: string): void {
    if (!id) {
      this.renderEnd();
      this.finish();
      return;
    }
    this.enterNode(this.findNode(id));
  }

  private renderNode(): void {
    const header = `<h2 class="section-label">${t('story.chapter', { n: this.node.chapter })}</h2>`;
    if (this.phase === 'choice') {
      const options = (this.node.choices ?? [])
        .map((choice) => {
          const target = this.engine.activeTargets.find((x) => x.text === choice.type);
          return `<li>${renderTarget(target?.text ?? choice.type, target?.typed ?? 0)} &mdash; ${escapeHtml(choice.label)}</li>`;
        })
        .join('');
      this.ctx.overlay.innerHTML = `${header}<p class="passage">${escapeHtml(this.node.text)}</p><ul class="passage">${options}</ul>`;
      return;
    }
    const target = this.engine.activeTargets[0];
    this.ctx.overlay.innerHTML = `${header}<p class="passage">${renderTarget(target?.text ?? this.node.text, target?.typed ?? 0)}</p><p class="muted mono">${t('story.continue')}</p>`;
  }

  private renderEnd(): void {
    this.ctx.overlay.innerHTML = `<h2 class="section-label">${t('story.end')}</h2>`;
  }
}

function renderTarget(text: string, typed: number): string {
  const done = escapeHtml(text.slice(0, typed));
  const current = escapeHtml(text.slice(typed, typed + 1)) || '&nbsp;';
  const rest = escapeHtml(text.slice(typed + 1));
  return `<span class="passage__done">${done}</span><span class="passage__current">${current}</span>${rest}`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function create(): GameMode {
  return new StoryMode();
}
