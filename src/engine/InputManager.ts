import type { KeyInput } from '@/types';

export type InputSink = (input: KeyInput) => void;

const CONTROL_KINDS: Record<string, KeyInput['kind']> = {
  Backspace: 'backspace',
  Enter: 'enter',
  Escape: 'escape',
};

/**
 * Turns raw keyboard and IME events into immutable KeyInput commands (FR-ENG-01).
 * Listens on a hidden, always-focused contenteditable so composed scripts
 * (Urdu, Arabic, accented Latin) arrive as finished characters.
 */
export class InputManager {
  private field: HTMLDivElement | null = null;
  private sink: InputSink | null = null;
  private composing = false;
  /** Set while a keydown has already been emitted, so input does not double-fire. */
  private handledByKeydown = false;

  attach(parent: HTMLElement, sink: InputSink): void {
    this.detach();
    this.sink = sink;

    const field = document.createElement('div');
    field.contentEditable = 'true';
    field.setAttribute('role', 'textbox');
    field.setAttribute('aria-label', 'Typing input');
    field.setAttribute('autocorrect', 'off');
    field.setAttribute('autocapitalize', 'off');
    field.spellcheck = false;
    field.className = 'tv-input-field';
    parent.appendChild(field);
    this.field = field;

    field.addEventListener('keydown', this.onKeyDown);
    field.addEventListener('beforeinput', this.onBeforeInput);
    field.addEventListener('compositionstart', this.onCompositionStart);
    field.addEventListener('compositionend', this.onCompositionEnd);
    field.addEventListener('blur', this.onBlur);
    field.focus();
  }

  detach(): void {
    const field = this.field;
    if (!field) return;
    field.removeEventListener('keydown', this.onKeyDown);
    field.removeEventListener('beforeinput', this.onBeforeInput);
    field.removeEventListener('compositionstart', this.onCompositionStart);
    field.removeEventListener('compositionend', this.onCompositionEnd);
    field.removeEventListener('blur', this.onBlur);
    field.remove();
    this.field = null;
    this.sink = null;
  }

  focus(): void {
    this.field?.focus();
  }

  private readonly onBlur = (): void => {
    // Keep the hidden field focused so keystrokes are never lost mid-game.
    queueMicrotask(() => this.field?.focus());
  };

  private readonly onCompositionStart = (): void => {
    this.composing = true;
  };

  private readonly onCompositionEnd = (e: CompositionEvent): void => {
    this.composing = false;
    for (const ch of e.data ?? '') this.emit(ch, '', 'char');
    this.clearField();
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    this.handledByKeydown = false;
    if (this.composing || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;

    const kind = CONTROL_KINDS[e.key];
    if (kind) {
      e.preventDefault();
      this.handledByKeydown = true;
      this.emit('', e.code, kind);
      return;
    }
    if (e.key === 'Tab') return; // let focus move
    if (e.key.length === 1) {
      e.preventDefault();
      this.handledByKeydown = true;
      this.emit(e.key, e.code, e.key === ' ' ? 'space' : 'char');
    }
  };

  private readonly onBeforeInput = (e: InputEvent): void => {
    if (this.handledByKeydown) {
      e.preventDefault();
      return;
    }
    if (this.composing || e.inputType === 'insertCompositionText') return;
    if (e.inputType !== 'insertText' || !e.data) return;
    e.preventDefault();
    for (const ch of e.data) this.emit(ch, '', ch === ' ' ? 'space' : 'char');
  };

  private emit(char: string, code: string, kind: KeyInput['kind']): void {
    this.sink?.({ char: char ? char.normalize('NFC') : '', code, kind, t: performance.now() });
  }

  private clearField(): void {
    if (this.field) this.field.textContent = '';
  }
}
