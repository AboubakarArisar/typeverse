import type { CodePack, KeyInput, ModeMeta } from '@/types';
import { BaseMode, type HudChip } from '../shared/BaseMode';
import { modeRegistry } from '../registry';
import { t } from '@/services/i18n';
import type { GameMode } from '../types';

const SYMBOLS = new Set([...'{}()[];:=<>"\'`,.+-*/%!&|?#$@\\~^']);

const DIFFICULTY_TIER: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
  kid: 'beginner',
  easy: 'beginner',
  normal: 'intermediate',
  hard: 'advanced',
  insane: 'advanced',
};

const KEYWORDS =
  /\b(const|let|var|function|return|if|else|for|of|in|while|class|def|import|from|export|async|await|try|except|catch|yield|with|new|this|self|print|lambda|True|False|None|null|undefined)\b/g;

/** Code Typer (FR-CT-01): real snippets, free indentation, separate symbol stats. */
class CodeTyper extends BaseMode {
  readonly id = 'code-typer' as const;
  readonly meta: ModeMeta = modeRegistry['code-typer'].meta;

  private pack!: CodePack;
  private lines: string[] = [];
  private lineIndex = 0;
  private letterHits = 0;
  private letterMiss = 0;
  private symbolHits = 0;
  private symbolMiss = 0;

  protected async onInit(): Promise<void> {
    const packs = this.ctx.content.listCodePacks();
    const id = this.ctx.rng.pick(packs);
    this.pack = await this.ctx.content.code(id);

    const tier = DIFFICULTY_TIER[this.ctx.difficulty] ?? 'intermediate';
    const matching = this.pack.snippets.filter((s) => s.difficulty === tier);
    const snippet = this.ctx.rng.pick(matching.length > 0 ? matching : this.pack.snippets);
    this.lines = snippet.lines;
  }

  protected onStart(): void {
    this.loadLine();
  }

  protected onUpdate(): void {
    // Code Typer is turn-based: all state changes happen on input.
  }

  protected onRender(): void {
    // Rendered as DOM in the overlay; nothing to draw on canvas.
  }

  protected onKey(input: KeyInput): void {
    if (input.kind === 'enter') {
      const target = this.engine.activeTargets[0];
      if (target && target.typed >= target.text.length) this.nextLine();
      return;
    }

    const target = this.engine.activeTargets[0];
    const expected = target?.text[target.typed];
    const outcome = this.engine.handle(input);

    if (outcome.kind === 'wrong') {
      this.count(expected ?? input.char, false);
      this.ctx.audio.play('error');
    } else if (
      outcome.kind === 'correct' ||
      outcome.kind === 'locked' ||
      outcome.kind === 'complete'
    ) {
      this.count(expected ?? input.char, true);
      this.ctx.audio.play('key');
    }

    if (outcome.kind === 'complete') this.nextLine();
    else this.renderLines();
  }

  protected override chips(): HudChip[] {
    return [
      { label: t('code.letters'), value: `${rate(this.letterHits, this.letterMiss)}%` },
      { label: t('code.symbols'), value: `${rate(this.symbolHits, this.symbolMiss)}%` },
      { label: t('hud.lines'), value: `${this.lineIndex}/${this.lines.length}` },
    ];
  }

  private count(char: string, ok: boolean): void {
    if (SYMBOLS.has(char)) {
      if (ok) this.symbolHits++;
      else this.symbolMiss++;
    } else {
      if (ok) this.letterHits++;
      else this.letterMiss++;
    }
  }

  private loadLine(): void {
    this.engine.clearTargets();
    const raw = this.lines[this.lineIndex] ?? '';
    // Leading indentation is auto-filled, so the player never types spaces to indent.
    const text = raw.trimStart();
    if (text.length > 0) this.engine.addTarget(text);
    this.renderLines();
    if (text.length === 0) this.nextLine();
  }

  private nextLine(): void {
    this.lineIndex++;
    if (this.lineIndex >= this.lines.length) {
      this.renderLines();
      this.finish();
      return;
    }
    this.loadLine();
  }

  private renderLines(): void {
    const target = this.engine.activeTargets[0];
    const html = this.lines
      .map((raw, i) => {
        const indent = raw.length - raw.trimStart().length;
        const pad = `<span class="code-line--indent">${'&nbsp;'.repeat(indent)}</span>`;
        if (i < this.lineIndex)
          return `<span class="code-line">${pad}${highlight(raw.trimStart())}</span>`;
        if (i > this.lineIndex || !target) {
          return `<span class="code-line muted">${pad}${highlight(raw.trimStart())}</span>`;
        }
        const done = escapeHtml(target.text.slice(0, target.typed));
        const current = escapeHtml(target.text.slice(target.typed, target.typed + 1));
        const rest = highlight(target.text.slice(target.typed + 1));
        return `<span class="code-line">${pad}<span class="passage__done">${done}</span><span class="passage__current">${current || ' '}</span>${rest}</span>`;
      })
      .join('');
    this.ctx.overlay.innerHTML = `<div class="passage">${html}</div><p class="muted mono">${t('code.enterHint')}</p>`;
  }
}

function rate(hits: number, misses: number): number {
  const total = hits + misses;
  return total === 0 ? 100 : Math.round((hits / total) * 100);
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Minimal highlighter: keywords, strings and numbers. */
function highlight(text: string): string {
  return escapeHtml(text)
    .replace(/(&#34;[^&]*&#34;|&#39;[^&]*&#39;)/g, '<em class="muted">$1</em>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<strong>$1</strong>')
    .replace(KEYWORDS, '<b>$1</b>');
}

export function create(): GameMode {
  return new CodeTyper();
}
