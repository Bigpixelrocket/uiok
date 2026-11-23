import { CircleAlert, type LucideIcon } from 'lucide-react';
import { useId, useLayoutEffect, useRef } from 'react';
import type { ChangeEvent, CSSProperties, ReactElement, ReactNode } from 'react';

import { Button } from '../button/Button.js';
import { Spinner } from '../icon/Spinner.js';
import { ICON_LG, ICON_MD } from '../icon/sizes.js';
import { RunHeader, type RunHeaderProps } from '../run/RunHeader.js';

/** The notes a squeezed card still shows before the column scrolls instead. */
const NOTES_FLOOR_ROWS = 3;

/** A heading's lines in a build's notes. */
export interface UpdateNotesGroup {
  /** The heading: the area of the app the lines are about. */
  readonly title: string;
  readonly lines: readonly string[];
}

/** Props for {@link UpdateNotes}. */
export interface UpdateNotesProps {
  /** The section's heading ("What's new"), also the list's accessible name. */
  readonly heading: string;
  /** The words shown when the build lists no change. */
  readonly empty: string;
  /** The notes, one line per change, listed as one list where `groups` is null. */
  readonly lines: readonly string[];
  /** The lines under a heading per area; null lists `lines` as one list. */
  readonly groups?: readonly UpdateNotesGroup[] | null;
}

/**
 * What's new in an offered build, at the foot of the update card: the
 * notes under a heading per area, or as one list, in a box that scrolls on
 * its own once the card reaches the bottom of the column, and that the
 * arrow keys scroll when focused. A squeezed box keeps its first three
 * rows, a heading counting as one.
 */
export function UpdateNotes({
  heading,
  empty,
  lines,
  groups = null
}: UpdateNotesProps): ReactElement {
  const ids = useId();
  const rows =
    groups === null ? lines.length : groups.reduce((sum, group) => sum + group.lines.length + 1, 0);
  const box = {
    'aria-label': heading,
    style: { '--update-note-rows': Math.min(rows, NOTES_FLOOR_ROWS) } as CSSProperties,
    tabIndex: 0
  };

  return (
    <section aria-labelledby={`${ids}-heading`} className="update-notes">
      <h4 className="overline" id={`${ids}-heading`}>
        {heading}
      </h4>
      {rows === 0 ? (
        <p className="field-note">{empty}</p>
      ) : groups === null ? (
        <div className="update-notes-frame">
          <ul {...box} className="update-notes-list scroll-fade">
            {lines.map((line, index) => (
              // The notes never reorder while shown, so a line's place is its identity.
              <li key={index}>{line}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="update-notes-frame">
          <div {...box} className="update-notes-list scroll-fade update-notes-groups" role="group">
            {groups.map((group, groupIndex) => (
              <div className="update-notes-group" key={group.title}>
                <h5 className="update-notes-area" id={`${ids}-area-${groupIndex}`}>
                  {group.title}
                </h5>
                <ul aria-labelledby={`${ids}-area-${groupIndex}`}>
                  {group.lines.map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** The update card's tone, which colours its glyph (and an `error`'s title). */
export type UpdateCardTone = 'idle' | 'busy' | 'ready' | 'ok' | 'warning' | 'error';

/** The update card's one next step. */
export interface UpdateCardVerb {
  readonly label: string;
  /** The primary fill (Download, Restart), else neutral (Check Now, Stop). */
  readonly primary?: boolean;
  readonly disabled?: boolean;
  readonly onRun: () => void;
}

/** Props for {@link UpdateCard}. */
export interface UpdateCardProps {
  readonly tone: UpdateCardTone;
  /** The state's glyph; `checking` draws the turning ring. */
  readonly glyph: LucideIcon | 'checking';
  /** What the card is about: the installed build, or the offered one (a `strong` in it is set strong). */
  readonly title: ReactNode;
  /** A quieter line under the title (the installed version under an offer). */
  readonly sub?: ReactNode;
  /** When, after `sub`; a clock moves it, so it is never announced. */
  readonly when?: ReactNode;
  readonly verb?: UpdateCardVerb | null;
  /** A download, or a check that failed, under the head: a `RunHeader`. */
  readonly run?: RunHeaderProps | null;
  /** A quiet line under the head ("Installs the next time the app opens"). */
  readonly note?: string | null;
  /** A failure of the card's own verb, as a danger notice. */
  readonly failure?: string | null;
  /** What's new in the offered build, at the card's foot. */
  readonly notes?: UpdateNotesProps | null;
}

/**
 * The Updates page's status card: the state's glyph, where the updater
 * stands with a quieter line under it, and its one next step; then a
 * download or a failed check in the shared progress header under a quieter
 * head, a note, a failure, and the offered build's notes, the card growing
 * with them only to the bottom of the column. A verb that disables itself
 * or goes while it holds the focus hands the focus to the dialog around the
 * card, so Escape and Tab still reach it.
 */
export function UpdateCard({
  tone,
  glyph,
  title,
  sub = null,
  when = null,
  verb = null,
  run = null,
  note = null,
  failure = null,
  notes = null
}: UpdateCardProps): ReactElement {
  const card = useRef<HTMLDivElement>(null);
  const Glyph = glyph === 'checking' ? null : glyph;
  const verbLabel = verb?.label;
  const verbDisabled = verb?.disabled === true;
  const showsNotes = notes !== null;

  useLayoutEffect(() => {
    const element = card.current;
    const focused = element?.ownerDocument.activeElement;

    if (
      element &&
      (focused === element.ownerDocument.body ||
        (focused instanceof HTMLButtonElement && focused.disabled && element.contains(focused)))
    ) {
      element.closest<HTMLElement>('[role="dialog"]')?.focus({ preventScroll: true });
    }
  }, [verbLabel, verbDisabled, showsNotes]);

  return (
    <div
      className={['update-card card', run ? 'with-run' : null, notes ? 'with-notes' : null]
        .filter(Boolean)
        .join(' ')}
      data-tone={tone}
      ref={card}
    >
      <div className="update-card-head">
        {Glyph === null ? (
          <Spinner className="update-card-glyph" size={ICON_LG} />
        ) : (
          <Glyph aria-hidden className="update-card-glyph" size={ICON_LG} />
        )}
        <div className="update-card-said" role="status">
          <span className="update-card-title">{title}</span>
          {sub !== null || when !== null ? (
            <span className="update-card-sub">
              {sub}
              {sub !== null && when !== null ? ' · ' : null}
              {when !== null ? <span aria-live="off">{when}</span> : null}
            </span>
          ) : null}
        </div>
        {verb ? (
          <Button
            disabled={verb.disabled}
            onClick={verb.onRun}
            size="small"
            variant={verb.primary ? 'primary' : 'neutral'}
          >
            {verb.label}
          </Button>
        ) : null}
      </div>
      {run ? <RunHeader {...run} /> : null}
      {note ? <p className="update-card-note">{note}</p> : null}
      {failure ? (
        <div className="notice notice-danger" role="alert">
          <CircleAlert aria-hidden size={ICON_MD} />
          <p className="notice-text">{failure}</p>
        </div>
      ) : null}
      {notes ? <UpdateNotes {...notes} /> : null}
    </div>
  );
}

/** One choice of how often the updater checks. */
export interface UpdateChecksChoice<Value extends string> {
  readonly value: Value;
  readonly label: string;
}

/** Props for {@link UpdateChecks}. */
export interface UpdateChecksProps<Value extends string> {
  /** The select's label ("Check for updates"). */
  readonly label: string;
  readonly value: Value;
  readonly choices: readonly UpdateChecksChoice<Value>[];
  /** The note under both, which follows the choice. */
  readonly note: string;
  readonly onChange: (value: Value) => void;
}

/** How often the updater checks on its own: a label, a select at the end, and a note under both, on a card. */
export function UpdateChecks<Value extends string>({
  label,
  value,
  choices,
  note,
  onChange
}: UpdateChecksProps<Value>): ReactElement {
  const id = useId();

  const choose = (event: ChangeEvent<HTMLSelectElement>): void => {
    const choice = choices.find((candidate) => candidate.value === event.target.value);

    if (choice !== undefined) onChange(choice.value);
  };

  return (
    <div className="update-checks card">
      <label className="update-checks-label" htmlFor={id}>
        {label}
      </label>
      <select className="field field-sm" id={id} onChange={choose} value={value}>
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
      <p className="field-note">{note}</p>
    </div>
  );
}

/** Props for {@link UpdatesPage}. */
export interface UpdatesPageProps {
  /** The cadence (`UpdateChecks`); none where the build cannot update. */
  readonly checks?: ReactNode;
  /** The status card (`UpdateCard`); none before the first status is known, which leaves the page busy. */
  readonly card?: ReactNode;
}

/**
 * The Updates page's body (a `SettingsPage` with `fills`): the check
 * cadence over the status card. Until the host knows the updater's status
 * the page is empty and busy, so it never shows a status it would take back.
 */
export function UpdatesPage({ checks = null, card = null }: UpdatesPageProps): ReactElement {
  return (
    <div aria-busy={card === null ? true : undefined} className="updates-page">
      {card === null ? null : (
        <>
          {checks}
          {card}
        </>
      )}
    </div>
  );
}
