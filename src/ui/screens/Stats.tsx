import { useEffect, useRef } from 'preact/hooks';
import type { JSX } from 'preact';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { save } from '@/services/progress';
import { t } from '@/services/i18n';
import { modeList } from '@/modes/registry';
import { Panel, SectionLabel, StatChip } from '@/ui/components/primitives';
import { token } from '@/modes/shared/canvas';

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

export function Stats(): JSX.Element {
  const saved = save.value;
  const sessions = [...(saved?.sessions ?? [])].reverse();

  if (sessions.length === 0) {
    return (
      <Panel class="stack">
        <SectionLabel>{t('stats.title')}</SectionLabel>
        <p class="muted">{t('stats.empty')}</p>
      </Panel>
    );
  }

  return (
    <div class="stack">
      <SectionLabel>{t('stats.title')}</SectionLabel>

      <div class="grid-2">
        <Panel class="stack">
          <span class="field__label">{t('stats.wpmOverTime')}</span>
          <Chart
            series={sessions.map((s) => s.wpm)}
            label={t('stats.wpmOverTime')}
            color={token('--key-blue')}
          />
        </Panel>
        <Panel class="stack">
          <span class="field__label">{t('stats.accuracyTrend')}</span>
          <Chart
            series={sessions.map((s) => Math.round(s.accuracy * 100))}
            label={t('stats.accuracyTrend')}
            color={token('--key-mint-side')}
          />
        </Panel>
      </div>

      <Panel class="stack">
        <span class="field__label">{t('stats.heatmap')}</span>
        <Heatmap stats={saved?.keyStats ?? {}} />
        <p class="muted mono">{t('stats.heatmapHint')}</p>
      </Panel>

      <Panel class="stack">
        <span class="field__label">{t('stats.bests')}</span>
        <div class="row">
          {modeList.map((entry) => {
            const best = saved?.bests[entry.meta.id];
            return (
              <StatChip
                key={entry.meta.id}
                label={t(entry.meta.nameKey)}
                value={best ? best.score : '-'}
                color={entry.meta.color}
              />
            );
          })}
        </div>
      </Panel>

      <Panel class="stack">
        <span class="field__label">{t('stats.sessions')}</span>
        <table class="sessions">
          <thead>
            <tr>
              <th scope="col">{t('nav.arcade')}</th>
              <th scope="col">{t('result.score')}</th>
              <th scope="col">{t('result.wpm')}</th>
              <th scope="col">{t('result.accuracy')}</th>
            </tr>
          </thead>
          <tbody>
            {(saved?.sessions ?? []).slice(0, 20).map((s) => (
              <tr key={`${s.mode}-${s.date}`}>
                <td>{t(`mode.${s.mode}.name`)}</td>
                <td>{s.score}</td>
                <td>{Math.round(s.wpm)}</td>
                <td>{Math.round(s.accuracy * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function Chart({
  series,
  label,
  color,
}: {
  series: number[];
  label: string;
  color: string;
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const xs = series.map((_, i) => i + 1);
    const plot = new uPlot(
      {
        title: '',
        width: el.clientWidth || 360,
        height: 180,
        legend: { show: false },
        scales: { x: { time: false } },
        axes: [
          { stroke: token('--ink-muted'), grid: { stroke: token('--line') } },
          { stroke: token('--ink-muted'), grid: { stroke: token('--line') } },
        ],
        series: [{}, { label, stroke: color, width: 3, points: { show: series.length < 20 } }],
      },
      [xs, series],
      el,
    );
    const onResize = (): void => plot.setSize({ width: el.clientWidth || 360, height: 180 });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      plot.destroy();
    };
  }, [series, label, color]);

  return <div class="chart" ref={ref} role="img" aria-label={label} />;
}

function Heatmap({
  stats,
}: {
  stats: Record<string, { hits: number; misses: number }>;
}): JSX.Element {
  return (
    <div class="keyboard">
      {ROWS.map((row) => (
        <div class="keyboard__row" key={row}>
          {[...row].map((key) => {
            const stat = stats[key];
            const total = (stat?.hits ?? 0) + (stat?.misses ?? 0);
            const rate = total > 0 ? (stat?.misses ?? 0) / total : 0;
            // Lightness scale, never hue alone: the number is in the title too.
            const alpha = total === 0 ? 0 : Math.min(0.85, 0.15 + rate * 2);
            return (
              <span
                class="keyboard__key"
                key={key}
                title={`${key.toUpperCase()}: ${Math.round(rate * 100)}% errors (${total} typed)`}
                style={{
                  background: `color-mix(in srgb, var(--error) ${Math.round(alpha * 100)}%, var(--surface-sunk))`,
                }}
              >
                {key.toUpperCase()}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
