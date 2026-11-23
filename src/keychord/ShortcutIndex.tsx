import { useId, type ReactElement, type ReactNode } from 'react';

import type { Chord } from '../keyboard/Keyboard.logic.js';
import { KeyChords } from './KeyChord.js';

/** Props for {@link ShortcutIndex}. */
export interface ShortcutIndexProps {
  /** The index's accessible name: "Keyboard shortcuts". */
  readonly label: string;
  /** Its groups (`ShortcutGroup`), in order. */
  readonly children: ReactNode;
}

/**
 * Every key a window answers, in groups of verbs, each verb with the chords
 * that run it: one grid for every group, so the chords stand in one column
 * at the index's end from the first group to the last, whatever each group's
 * longest verb. Put it in a dialog (a frosted `ModalDialog`) or a page; a
 * find field above it is the host's. Draws `.shortcut-index`.
 */
export function ShortcutIndex({ label, children }: ShortcutIndexProps): ReactElement {
  return (
    <div aria-label={label} className="shortcut-index" role="region">
      {children}
    </div>
  );
}

/** Props for {@link ShortcutGroup}. */
export interface ShortcutGroupProps {
  /** The group's name, as an overline over its verbs: "Services". */
  readonly title: string;
  /** Its verbs (`ShortcutRow`). */
  readonly children: ReactNode;
}

/** One group of a `ShortcutIndex`: its name over its verbs, a hairline above every group but the first. */
export function ShortcutGroup({ title, children }: ShortcutGroupProps): ReactElement {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="shortcut-group">
      <h3 className="shortcut-group-title overline" id={headingId}>
        {title}
      </h3>
      <dl className="shortcut-group-rows">{children}</dl>
    </section>
  );
}

/** Props for {@link ShortcutRow}. */
export interface ShortcutRowProps {
  /** The verb, as menus name it: "Restart". */
  readonly verb: string;
  /** What it does, beyond its name, in a quieter line under it. */
  readonly detail?: string;
  /** The chords that run it now, each drawn as a key cap; none draws `none`. */
  readonly chords: readonly Chord[];
  /** The words in the chord column when it has no chord: "No shortcut". */
  readonly none?: string;
  /** Its chords were changed from the defaults: the caps wear the accent tone. */
  readonly changed?: boolean;
  /** Not available where the index was opened: the verb and its chords a tone down. */
  readonly dim?: boolean;
}

/**
 * One verb of a `ShortcutGroup`: its name (and a detail under it) at the
 * start, its chords as key caps at the end, in the index's one chord
 * column; several chords are parted by "or" (`KeyChords`) and wrap within
 * the column, aligned to its end. Each chord is named in words for
 * assistive technology (`KeyChord`).
 */
export function ShortcutRow({
  verb,
  detail,
  chords,
  none,
  changed = false,
  dim = false
}: ShortcutRowProps): ReactElement {
  return (
    <div className={dim ? 'shortcut-row dim' : 'shortcut-row'}>
      <dt className="shortcut-verb">
        {verb}
        {detail === undefined ? null : <span className="shortcut-detail">{detail}</span>}
      </dt>
      <dd className="shortcut-chords keycap">
        {chords.length === 0 ? (
          <span className="shortcut-none">{none}</span>
        ) : (
          <KeyChords chords={chords} tone={changed ? 'accent' : undefined} />
        )}
      </dd>
    </div>
  );
}
