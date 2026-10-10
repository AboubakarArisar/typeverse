import type { JSX } from 'preact';
import type { KeycapColor, SessionResult } from '@/types';
import { t } from '@/services/i18n';
import { lastLevelUp, lastXpEarned, progress, save } from '@/services/progress';
import { KeycapButton } from '@/ui/components/KeycapButton';
import { Panel, SectionLabel, StatChip } from '@/ui/components/primitives';

interface ResultProps {
  result: SessionResult;
  color: KeycapColor;
  onAgain: () => void;
  onArcade: () => void;
}

/** Session summary, announced to screen readers (NFR-05). */
export function Result({ result, color, onAgain, onArcade }: ResultProps): JSX.Element {
  const best = save.value?.bests[result.mode];
  const isBest = !!best && best.score === result.score && best.date === result.date;
  const weakest = progress.weakestKeys(5);
  const levelUp = lastLevelUp.value;

  return (
    <Panel class="stack" style={{ minInlineSize: 'min(560px, 90%)' }}>
      <SectionLabel>{t('result.title')}</SectionLabel>

      <p class="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {t('result.announce', {
          score: result.score,
          wpm: Math.round(result.wpm),
          accuracy: Math.round(result.accuracy * 100),
        })}
      </p>

      <div class="result__score">{result.score}</div>
      {isBest ? <strong>{t('result.newBest')}</strong> : null}
      {levelUp ? <strong>{t('result.levelUp', { level: levelUp })}</strong> : null}

      <div class="row">
        <StatChip label={t('result.wpm')} value={Math.round(result.wpm)} color={color} />
        <StatChip label={t('result.rawWpm')} value={Math.round(result.rawWpm)} />
        <StatChip label={t('result.accuracy')} value={`${Math.round(result.accuracy * 100)}%`} />
        <StatChip label={t('result.combo')} value={result.maxCombo} />
        <StatChip label={t('result.xp')} value={`+${lastXpEarned.value}`} />
        {(result.highlights ?? []).map((h) => (
          <StatChip key={h.label} label={h.label} value={h.value} />
        ))}
      </div>

      {weakest.length > 0 ? (
        <div class="stack">
          <span class="field__label">{t('result.weakest')}</span>
          <div class="row">
            {weakest.map((k) => (
              <StatChip
                key={k.key}
                label={k.key === ' ' ? 'space' : k.key}
                value={`${Math.round(k.rate * 100)}%`}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div class="row">
        <KeycapButton onClick={onAgain} color={color}>
          {t('result.again')}
        </KeycapButton>
        <KeycapButton variant="secondary" onClick={onArcade}>
          {t('result.arcade')}
        </KeycapButton>
      </div>
    </Panel>
  );
}
