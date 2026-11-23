import { useId, type ReactElement, type ReactNode } from 'react';

/** Props for {@link FactList}. */
export interface FactListProps {
  /** Its heading, an overline over the facts ("Command"), which names the list too. */
  readonly title?: string;
  /** The list's accessible name, where it has no `title` or the title says less. */
  readonly label?: string;
  /** Its facts (`Fact`). */
  readonly children: ReactNode;
}

/**
 * A headed list of facts on a page (what a process runs, how it restarts),
 * one name and value a line: the names in a column of their own in the
 * dim interface face, each value beside its name in the code face. A long
 * value wraps whole as a block beside its name, its next lines under its
 * first, and never runs under the name or breaks the line's alignment. For
 * facts read at a glance, set straight on the page (no card); a short table
 * with a state each is a `FactTable`, and a list the keys move through is a
 * `Listing`. Put several side by side in `FactColumns`. Draws
 * `section.fact-list` with its `dl.fact-list-items`.
 */
export function FactList({ title, label, children }: FactListProps): ReactElement {
  const headingId = useId();
  const named = title === undefined ? {} : { 'aria-labelledby': headingId };

  return (
    <section aria-label={label} className="fact-list" {...(label === undefined ? named : {})}>
      {title === undefined ? null : (
        <h3 className="fact-list-title overline" id={headingId}>
          {title}
        </h3>
      )}
      <dl className="fact-list-items">{children}</dl>
    </section>
  );
}

/** A fact value's tone: `danger` a failure (an exit code, an error), `warning` a state that needs a look. */
export type FactValueTone = 'danger' | 'warning';

/** Props for {@link Fact}. */
export interface FactProps {
  /** What the fact is ("Restarts"); an empty name lets the value run on under the line above. */
  readonly name: string;
  /** The value, in the code face ("2h 35m · since 11:48"). */
  readonly children: ReactNode;
  /** Its words in a tone; the text tone unless given. */
  readonly tone?: FactValueTone;
  /**
   * The value is lines a program printed: its line breaks and runs of
   * spaces kept as printed, each line wrapping whole.
   */
  readonly printed?: boolean;
}

/**
 * One fact of a `FactList`: its name, then its value beside it, which wraps
 * as a block however long it is. The words can be swept and copied.
 */
export function Fact({ name, children, tone, printed = false }: FactProps): ReactElement {
  return (
    <div className="fact" data-tone={tone}>
      <dt className="fact-name">{name}</dt>
      <dd className={printed ? 'fact-value printed' : 'fact-value'}>{children}</dd>
    </div>
  );
}

/** Props for {@link FactColumns}. */
export interface FactColumnsProps {
  /** The lists (`FactList`), in reading order. */
  readonly children: ReactNode;
}

/**
 * Fact lists side by side: as many columns of one width as the page has
 * room for (three on a wide page), the lists flowing across and then down,
 * so the lists of a row start on one line. Draws `.fact-columns`.
 */
export function FactColumns({ children }: FactColumnsProps): ReactElement {
  return <div className="fact-columns">{children}</div>;
}
