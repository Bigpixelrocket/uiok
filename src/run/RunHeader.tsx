import {
  CircleCheck,
  CirclePause,
  CircleSlash,
  CircleX,
  Hourglass,
  type LucideIcon
} from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { ActivityBar } from '../activity/ActivityBar.js';
import { ICON_LG, Spinner } from '../icon/index.js';
import { cutTooltip } from '../tooltip/Tooltip.logic.js';
import type { RunState } from './RunProgress.logic.js';

/** Each still state's glyph; a running header draws the shared Spinner. */
const STATE_ICONS: Readonly<Record<Exclude<RunState, 'running'>, LucideIcon>> = {
  waiting: Hourglass,
  paused: CirclePause,
  done: CircleCheck,
  failed: CircleX,
  stopped: CircleSlash
};

/** The header's optional bar: how much of the run is done, and what it measures. */
export interface RunHeaderBar {
  /**
   * Fraction done, in [0, 1]; null for a run that reports no fraction while
   * it works (a compression, a delete on a server, a transfer still sizing
   * its sources): the bar is then the activity stripes, which move only
   * while the run goes on (`ActivityBar`).
   */
  readonly fraction: number | null;
  /** The bar's accessible name ("Whole transfer"). */
  readonly label: string;
}

/** Props for {@link RunHeader}; every word is the caller's. */
export interface RunHeaderProps {
  /** Where the run stands; picks the glyph, the colours, and whether the stripes move. */
  readonly state: RunState;
  /** One sentence: where the run stands, or its outcome once it settles. */
  readonly headline: string;
  /**
   * What the status region says instead of the headline, for a headline
   * that changes as often as a figure does (a transfer's time left): the
   * headline then stays readable but is not announced, and only a change
   * of this text is. Left out, the headline is announced.
   */
  readonly announcement?: string;
  /** The one big figure at the right edge (elapsed time, a percentage), or none. */
  readonly figure?: string | null;
  /** Under a failed headline, why it failed; announced with it. */
  readonly reason?: string | null;
  /** Left out where nothing reports a fraction. */
  readonly bar?: RunHeaderBar;
  /** Short facts in a row, separated by dots; the first gives way when space runs out. */
  readonly facts?: readonly ReactNode[];
}

/**
 * The progress header a dialog watching work in progress opens its body
 * with (an install, a transfer, an export): the state's glyph and one
 * sentence, one big figure at the right edge, an optional bar, a row of
 * facts, and, on failure, the reason under the sentence.
 *
 * The sentence (and a failure's reason) is a status region, or an alert
 * once the run failed, so each change of state is announced once; the
 * figure sits outside it, so a ticking clock is never read out, and so does
 * a sentence that ticks too, given an `announcement` to say instead. A
 * sentence cut short by a narrow view is its own tooltip. Styled by the
 * `.run-header` rules in `@bigpixelrocket/uiok/styles.css`, which set its
 * type: sentences in the interface font, the figure in monospace. Format an
 * elapsed-time figure with `runClock`.
 */
export function RunHeader({
  state,
  headline,
  announcement,
  figure = null,
  reason = null,
  bar,
  facts = []
}: RunHeaderProps): ReactElement {
  const Icon = state === 'running' ? null : STATE_ICONS[state];
  const failed = state === 'failed';
  const role = failed ? 'alert' : 'status';

  return (
    <div className="run-header" data-state={state}>
      <div className="run-header-top">
        {Icon === null ? (
          <Spinner className="run-header-glyph" size={ICON_LG} />
        ) : (
          <Icon aria-hidden className="run-header-glyph" />
        )}
        <div className="run-header-said">
          {announcement !== undefined && (
            <span className="run-header-headline" {...cutTooltip(headline)}>
              {headline}
            </span>
          )}
          {/* A new alert element is announced; a role flipped in place may not be. */}
          <div key={role} role={role}>
            {announcement === undefined ? (
              <span className="run-header-headline" {...cutTooltip(headline)}>
                {headline}
              </span>
            ) : (
              <span className="visually-hidden">{announcement}</span>
            )}
            {reason !== null && reason !== '' && <p className="run-header-reason">{reason}</p>}
          </div>
        </div>
        {figure !== null && <span className="run-header-figure">{figure}</span>}
      </div>
      {bar && (
        <ActivityBar
          className="run-header-bar"
          fillClassName="run-header-fill"
          fraction={bar.fraction}
          label={bar.label}
          moving={state === 'running'}
        />
      )}
      {facts.length > 0 && (
        <div className={bar ? 'run-header-facts' : 'run-header-facts indented'}>
          {facts.map((fact, index) => (
            // The facts are a fixed row in a fixed order; their place is their identity.
            <span className="run-header-fact" key={index}>
              {fact}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
