import type { JSX } from 'preact';
import type { KeycapColor } from '@/types';
import { Keycap, type KeycapSize } from '@/ui/components/Keycap';
import { KeycapButton } from '@/ui/components/KeycapButton';
import { Bar, Meter, Panel, SectionLabel, StatChip } from '@/ui/components/primitives';

const COLORS: KeycapColor[] = ['blue', 'orange', 'mint', 'lime'];
const SIZES: KeycapSize[] = [32, 48, 72, 104];

/** Dev-only gallery of every component variant, in both themes. */
export function Kit(): JSX.Element {
  return (
    <div class="stack">
      <SectionLabel>UI kit</SectionLabel>
      <div class="grid-2">
        <ThemedKit theme="light" />
        <ThemedKit theme="dark" />
      </div>
    </div>
  );
}

function ThemedKit({ theme }: { theme: 'light' | 'dark' }): JSX.Element {
  return (
    <div class="kit__theme" data-theme={theme}>
      <div class="stack">
        <SectionLabel>{theme}</SectionLabel>

        <Panel class="stack">
          <span class="field__label">Keycap sizes</span>
          <div class="row">
            {SIZES.map((size) => (
              <Keycap key={size} size={size} decorative>
                T
              </Keycap>
            ))}
          </div>
          <span class="field__label">Colors and states</span>
          <div class="row">
            {COLORS.map((color) => (
              <Keycap key={color} color={color} size={48} label={color}>
                {color[0]?.toUpperCase()}
              </Keycap>
            ))}
            <Keycap size={48} locked label="locked">
              L
            </Keycap>
            <Keycap size={48} tilt={-6} decorative>
              6
            </Keycap>
          </div>
        </Panel>

        <Panel class="stack">
          <span class="field__label">Keycap buttons</span>
          <div class="row">
            <KeycapButton>Primary</KeycapButton>
            <KeycapButton variant="secondary">Secondary</KeycapButton>
            <KeycapButton variant="danger">Danger</KeycapButton>
            <KeycapButton disabled>Disabled</KeycapButton>
            <KeycapButton color="lime" hint="E">
              With hint
            </KeycapButton>
          </div>
        </Panel>

        <Panel class="stack">
          <span class="field__label">Chips, meters, bars</span>
          <div class="row">
            <StatChip label="WPM" value={72} />
            <StatChip label="Accuracy" value="98%" color="mint" />
            <StatChip label="Combo" value="x3" color="orange" />
          </div>
          <Meter label="Lives" filled={2} total={3} />
          <Bar label="Progress" value={0.62} color="lime" />
        </Panel>

        <Panel class="stack">
          <span class="field__label">Typing target</span>
          <p class="passage">
            <span class="passage__done">keyca</span>
            <span class="passage__current">p</span>
            <span> styling</span> <span class="passage__wrong">x</span>
          </p>
        </Panel>
      </div>
    </div>
  );
}
