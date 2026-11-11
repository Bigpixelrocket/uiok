import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type RefObject
} from 'react';

import { ICON_SM, Spinner } from '../icon/index.js';
import type { SortDirection } from '../labels/listing.js';
import { useLabels } from '../labels/UiokProvider.js';
import { InRowContext, RowLinkLookContext, type LinkLook } from '../pane/PaneActions.js';
import { describedTooltip, tooltip } from '../tooltip/Tooltip.logic.js';
import { pathParts } from './PathParts.logic.js';

/**
 * A listing column as wide as `ch` characters and the gutter before it, for
 * a listing's `grid`: `column(9)` is "calc(9ch + var(--pane-column-gap))".
 */
export const column = (ch: number): string => `calc(${ch}ch + var(--pane-column-gap))`;

/** The width every listing's action column takes, so actions line up from one listing to the next. */
export const ACTION_COLUMN = column(10);

/** A row control drawn as its icon alone (`.pane-icon-act`), in pixels. */
export const ICON_LINK_PX = 22;

/**
 * A listing column of `count` row controls drawn as icons alone
 * (`RowIconAction`), `gapPx` apart, with the gutter before it, so they never reach over the column
 * before them.
 */
export const iconLinksColumn = (count: number, gapPx: number): string =>
  `calc(${count * ICON_LINK_PX + Math.max(0, count - 1) * gapPx}px + var(--pane-column-gap))`;

/**
 * A row link's word, at most this many pixels a character at the 12 px it
 * draws in, so the column it sizes is never narrower than the word.
 */
const LINK_CHARACTER_PX = 7;

/** A row link in words (`.pane-icon-act.worded`), in pixels: its padding, its icon and gap for both, and its word. */
const wordedLinkPx = (look: Exclude<LinkLook, 'icons'>, word: string): number =>
  10 + (look === 'both' ? 17 : 0) + word.length * LINK_CHARACTER_PX;

/**
 * A listing column of row links as `look` draws them (`RowLinkLookContext`):
 * `icons`, the column as it holds them as icons, unchanged; in words, room
 * for each of `words` (the verbs of the row that names the most) and
 * `extraPx` more for the controls beside them that never take words (a
 * favorite's star, a menu), with the gutter before it, so the links never
 * reach over the columns beside them.
 */
export const linksColumn = (
  look: LinkLook,
  icons: string,
  words: readonly string[],
  extraPx = 0
): string =>
  look === 'icons'
    ? icons
    : `calc(${words.reduce((sum, word) => sum + wordedLinkPx(look, word), extraPx)}px + var(--pane-column-gap))`;

/**
 * How a strip label sorts its listing: the way it sorts by the column now
 * (null for another column), and what a press does, which its caller
 * decides (the other way, or this column first).
 */
export interface ColumnSort {
  readonly direction: SortDirection;
  readonly onSort: () => void;
}

/** One column after the name in a listing's strip. */
export interface ListingColumn {
  /** The label over the column, and its key. */
  readonly label: string;
  /** The label is for screen readers only, as over an action column. */
  readonly hidden?: boolean;
  readonly align?: 'right';
  /** A control at the strip's right end in the label's place (Update all, Clear). */
  readonly control?: ReactNode;
  /** The label sorts the listing by its column. */
  readonly sort?: ColumnSort;
}

/**
 * A strip label that sorts: a button over the column's whole surface, the
 * arrow of the way it sorts beside the label (before it over numbers, so
 * the label keeps the edge they line up on).
 */
function SortLabel({
  label,
  sort,
  align
}: {
  readonly label: string;
  readonly sort: ColumnSort;
  readonly align?: 'right';
}): ReactElement {
  const { sortBy } = useLabels().listing;
  const mark =
    sort.direction === null ? null : sort.direction === 'asc' ? (
      <ChevronUp aria-hidden size={ICON_SM} />
    ) : (
      <ChevronDown aria-hidden size={ICON_SM} />
    );

  return (
    <button
      aria-label={sortBy(label, sort.direction)}
      className={sort.direction === null ? 'pane-sort sortable' : 'pane-sort sortable active'}
      onClick={sort.onSort}
      type="button"
    >
      {align === 'right' && mark}
      <span className="pane-sort-label" {...tooltip(label)}>
        {label}
      </span>
      {align !== 'right' && mark}
    </button>
  );
}

/** The `aria-sort` of a sorting column's header. */
const ariaSort = (sort: ColumnSort | undefined): 'ascending' | 'descending' | undefined =>
  sort?.direction === 'asc' ? 'ascending' : sort?.direction === 'desc' ? 'descending' : undefined;

/** Props for {@link Strip}. */
export interface StripProps {
  /** The section's name, the first label. */
  readonly title: string;
  readonly columns?: readonly ListingColumn[];
  /** The strip is a table's header row (`role="row"`, column headers). */
  readonly table?: boolean;
  /** The name is the section's heading (`h3`). */
  readonly heading?: boolean;
  readonly className?: string;
  /** The name's column sorts the listing, under `titleLabel` ("Database"). */
  readonly titleSort?: ColumnSort;
  /** The first column's label, independently of sorting and the table's name. */
  readonly titleLabel?: string;
}

/**
 * The ruled column strip a listing opens with: the section's name, then a
 * label over each column. Its labels are text, but for a column that sorts
 * its listing (`sort`, and `titleSort` for the name's column), whose label is
 * the control that sorts it, named by `listing.sortBy` from the labels. In a
 * table (`table`) it is the header row; `heading` makes the name the
 * section's heading. Every visible label carries its whole text as its
 * tooltip, since a narrow column cuts it with an ellipsis.
 */
export function Strip({
  title,
  columns = [],
  table = false,
  heading = false,
  className,
  titleSort,
  titleLabel
}: StripProps): ReactElement {
  const Title = heading ? 'h3' : 'span';

  return (
    <div
      className={
        className === undefined ? 'pane-columns pane-strip' : `pane-columns pane-strip ${className}`
      }
      role={table ? 'row' : undefined}
    >
      <span
        aria-sort={table ? ariaSort(titleSort) : undefined}
        className="row-name"
        role={table ? 'columnheader' : undefined}
      >
        {titleSort === undefined ? (
          <span className="pane-sort">
            <Title className="pane-sort-label" {...tooltip(titleLabel ?? title)}>
              {titleLabel ?? title}
            </Title>
          </span>
        ) : (
          <SortLabel label={titleLabel ?? title} sort={titleSort} />
        )}
      </span>
      {columns.map((entry) => (
        <span
          aria-hidden={!table && entry.hidden === true ? true : undefined}
          className={[
            'row-meta',
            entry.align === 'right' || entry.control !== undefined ? 'align-right' : '',
            entry.hidden === true ? 'pane-col-blank' : '',
            entry.control === undefined ? '' : 'pane-col-control'
          ]
            .filter(Boolean)
            .join(' ')}
          aria-sort={table ? ariaSort(entry.sort) : undefined}
          key={entry.label}
          role={table ? 'columnheader' : undefined}
        >
          {entry.control}
          {entry.hidden === true
            ? table && <span className="visually-hidden">{entry.label}</span>
            : entry.control === undefined &&
              (entry.sort === undefined ? (
                <span className="pane-sort">
                  <span className="pane-sort-label" {...tooltip(entry.label)}>
                    {entry.label}
                  </span>
                </span>
              ) : (
                <SortLabel align={entry.align} label={entry.label} sort={entry.sort} />
              ))}
        </span>
      ))}
    </div>
  );
}

/** The plainer look a row link takes when the one it has makes its listing scroll sideways. */
const PLAINER_LOOK: Readonly<Record<LinkLook, LinkLook | null>> = {
  both: 'text',
  text: 'icons',
  icons: null
};

/**
 * What a fitting listing knows of its pane between commits: the grid its
 * looks are judged for (`basis`), the look it takes, the pane's width as the
 * observer last reported it, and the width each look that overflowed needs,
 * the listing's own width in it.
 */
interface LookRoom {
  basis: string;
  chosen: LinkLook;
  look: LinkLook;
  width: number;
  needs: Partial<Record<LinkLook, number>>;
}

/** The richest look from `from` on whose need, as far as `needs` knows it, fits in `width`. */
function roomiestLook(
  from: LinkLook,
  needs: Partial<Record<LinkLook, number>>,
  width: number
): LinkLook {
  let look = from;
  for (
    let plainer = PLAINER_LOOK[look];
    plainer !== null && (needs[look] ?? 0) > width + 1;
    plainer = PLAINER_LOOK[look]
  ) {
    look = plainer;
  }
  return look;
}

/**
 * The look `listing` steps down to when its look in `room` makes it wider
 * than its pane, noting what that look needs; null while it fits or has no
 * plainer look. A forced layout only where a commit or a resize left one due.
 */
function plainerFit(listing: HTMLElement, room: LookRoom): LinkLook | null {
  const plainer = PLAINER_LOOK[room.look];

  if (plainer === null) return null;

  const width = listing.clientWidth;
  const needed = listing.scrollWidth;

  if (needed <= width + 1) return null;
  room.needs[room.look] = needed;
  return roomiestLook(plainer, room.needs, width);
}

/**
 * The look a listing's row links take (`RowLinkLookContext`): the one
 * `chosen`, unless its words make the listing (`listing`) wider than its
 * pane, when they step down to words alone and then to icons, each still
 * named by its tooltip and accessible name, so the listing never scrolls
 * sideways for its links' words. Each look that overflowed is remembered
 * with the width it needs, so a resize changes the look only where the pane
 * crosses one of those widths, trying a richer look again only once the
 * pane grows to its need, and otherwise checks only that the look it has
 * still fits; a new `chosen` or grid (`richest`) starts again from `chosen`.
 * It settles before the listing paints. `fitting` false keeps `chosen`.
 */
function useFittedLook(
  chosen: LinkLook,
  richest: string,
  listing: RefObject<HTMLElement | null>,
  fitting: boolean
): LinkLook {
  const basis = `${chosen}\n${richest}`;
  const [fitted, setFitted] = useState({ basis, look: chosen });
  const look = fitted.basis === basis ? fitted.look : chosen;
  const room = useRef<LookRoom>({ basis, chosen, look, width: -1, needs: {} });

  // A listing wider than its pane takes the next plainer look. Its width is
  // its grid's, which the basis and the look decide; a cell clips its text.
  useLayoutEffect(() => {
    const element = listing.current;

    if (!fitting || element === null) return;

    const known = room.current;

    if (known.basis !== basis) {
      Object.assign(known, { basis, chosen, look: chosen, width: -1, needs: {} });
      // A look fitted when this basis last held was fitted to the pane as it
      // was then; it starts again from `chosen`.
      if (look !== chosen) {
        setFitted({ basis, look: chosen });
        return;
      }
    }
    known.look = look;

    const plainer = plainerFit(element, known);

    if (plainer !== null) setFitted({ basis, look: plainer });
  }, [basis, chosen, fitting, listing, look]);

  useLayoutEffect(() => {
    const element = listing.current;

    // Optional: jsdom has no ResizeObserver.
    if (!fitting || element === null || typeof ResizeObserver === 'undefined') return;

    // Its first report checks the look against the pane as it is now.
    room.current.width = -1;

    const observer = new ResizeObserver(() => {
      const known = room.current;
      const width = element.clientWidth;

      // A listing out of view lays nothing out, which says nothing of its room.
      if (width === 0 || width === known.width) return;
      known.width = width;

      const roomiest = roomiestLook(known.chosen, known.needs, width);
      const next = roomiest === known.look ? plainerFit(element, known) : roomiest;

      if (next === null) return;
      known.look = next;
      setFitted({ basis: known.basis, look: next });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [fitting, listing]);

  return look;
}

/** Props for {@link Listing}. */
export interface ListingProps {
  /** The strip's first label, the section's name ("Lines"). */
  readonly title: string;
  /** The table's accessible name, when it says more than the title ("PostgreSQL lines"). */
  readonly label?: string;
  /**
   * The listing's `--pane-grid`: the icon column, the name, then one track
   * per column (`column(ch)`, `ACTION_COLUMN`). A function of the row links'
   * look (`linksColumn`) lets the links step down to a plainer look when
   * their words would make the listing wider than its pane.
   */
  readonly grid: string | ((look: LinkLook) => string);
  readonly columns: readonly ListingColumn[];
  readonly className?: string;
  /** What to say in place of the rows when there are none; null draws the rows. */
  readonly empty?: string | null;
  /** The name's column sorts the listing (`Strip`). */
  readonly titleSort?: ColumnSort;
  /** The first column's label, independently of sorting and the table's name. */
  readonly titleLabel?: string;
  /** The rows (`Row`). */
  readonly children?: ReactNode;
}

/**
 * A listing: a table in the listing look (under `.listing-root`), full
 * bleed in its pane, under a ruled column strip whose first label is
 * `titleLabel`, or the section's name when omitted. `grid` is the listing's
 * `--pane-grid`, shared by the strip and every row, so each label sits over
 * its column; a listing whose row links take words gives it as the grid for
 * a look (`linksColumn`), and its rows take the richest look that keeps it
 * inside its pane. A listing with no rows says so in `empty`: a plain line
 * under the strip instead of a table, its column labels left out, so no
 * header stands over a row that is not one.
 */
export function Listing({
  title,
  label = title,
  grid,
  columns,
  className,
  empty = null,
  titleSort,
  titleLabel,
  children
}: ListingProps): ReactElement {
  const classes = className === undefined ? 'pane-listing' : `pane-listing ${className}`;
  const chosen = useContext(RowLinkLookContext);
  const listing = useRef<HTMLElement & HTMLDivElement>(null);
  const fitting = typeof grid === 'function';
  const look = useFittedLook(
    chosen,
    fitting ? grid(chosen) : grid,
    listing,
    fitting && empty === null
  );
  const style = { '--pane-grid': fitting ? grid(look) : grid } as CSSProperties;

  if (empty !== null) {
    return (
      <section aria-label={label} className={classes} ref={listing} style={style}>
        {/* No label stands over a column with no values under it; a control
            in the strip (Clear, Update all) keeps its place. */}
        <Strip
          columns={columns.map((entry) =>
            entry.control === undefined ? { ...entry, hidden: true } : entry
          )}
          title={title}
        />
        <p className="pane-message">{empty}</p>
      </section>
    );
  }

  return (
    <div aria-label={label} className={classes} ref={listing} role="table" style={style}>
      <Strip columns={columns} table title={title} titleLabel={titleLabel} titleSort={titleSort} />
      <RowLinkLookContext.Provider value={look}>{children}</RowLinkLookContext.Provider>
    </div>
  );
}

/**
 * A pane's cursor row, which the app keeps for the page shown
 * (`usePaneKeys` gives one): the keys move it, and the pointer moving over a row or the focus entering it
 * puts it there, so the pointer and the keys share one cursor. `point`
 * moves it to a row by key. Each row follows it through `subscribe` and
 * `current`, so a move draws only the row it leaves and the row it lands
 * on, never the page around them.
 */
export interface RowCursor {
  /** The cursor row's key now, or null for none. */
  readonly current: () => string | null;
  /** Hears each move; returns the way to stop. */
  readonly subscribe: (listener: () => void) => () => void;
  readonly point: (key: string) => void;
  /**
   * A row came or went, called by each row as it mounts and unmounts, so an
   * app that reads its page's rows (a legend's ↑ ↓) reads them again
   * though only the page drew, as a page reading its own listing does.
   */
  readonly rowsChanged?: () => void;
}

/** The cursor of the pane a row is in, which the app provides; without one no row is the cursor. */
export const RowCursorContext = createContext<RowCursor>({
  current: () => null,
  subscribe: () => () => undefined,
  point: () => undefined
});

/** Props for {@link Row}. */
export interface RowProps {
  /** Names the row to the cursor (`data-row-key`); unique in its pane. */
  readonly rowKey: string;
  /** The icon before the name, decorative. */
  readonly mark?: ReactNode;
  readonly name: ReactNode;
  /** The name cell's own class, beside `row-name`. */
  readonly nameClass?: string;
  readonly className?: string;
  /** Opens the row's item on a click anywhere but its controls. */
  readonly onOpen?: () => void;
  /** Its controls stay in the Tab order. */
  readonly tabbable?: boolean;
  /** The row itself takes the focus: in the Tab order while it is the cursor row. */
  readonly focusable?: boolean;
  /** A focusable row in the Tab order though it is not the cursor row: its listing's way in while none is. */
  readonly entry?: boolean;
  /** The cells after the name (`Cell`). */
  readonly children?: ReactNode;
}

/**
 * One row of a listing: its mark, its name, then its cells. `rowKey` names
 * it to the pane's cursor (`RowCursorContext`), which it wears as the
 * listing's cursor row (`.cursor`, `aria-current`); the pointer moving over
 * it or the focus entering it moves the cursor there. A row with `onOpen`
 * opens its item on a click anywhere but its controls. Controls that say
 * what the keys run mark it with `data-verb` (`QuietAction`,
 * `RowIconAction`), and the app reads them off the cursor row
 * (`verbControl`); such controls leave the Tab order, unless `tabbable`
 * keeps them in it, for a listing whose rows no key runs. A `focusable` row
 * is a stop of its own: the cursor row in the Tab order (or, while no row
 * is, the one marked `entry`), the others reached by the keys that move it.
 */
export function Row({
  rowKey,
  mark,
  name,
  nameClass,
  className,
  onOpen,
  tabbable = false,
  focusable = false,
  entry = false,
  children
}: RowProps): ReactElement {
  const cursor = useContext(RowCursorContext);
  const current = useSyncExternalStore(cursor.subscribe, () => cursor.current() === rowKey);

  useLayoutEffect(() => {
    cursor.rowsChanged?.();

    return () => cursor.rowsChanged?.();
  }, [cursor, rowKey]);

  return (
    <InRowContext.Provider value={!tabbable}>
      <div
        aria-current={current ? 'true' : undefined}
        className={['row', current ? 'cursor' : '', className ?? ''].filter(Boolean).join(' ')}
        data-row-key={rowKey}
        onClick={onOpen}
        onFocus={() => cursor.point(rowKey)}
        // Movement, not entry: a row scrolled under a still pointer as the
        // keys move the cursor must not take the cursor back.
        onPointerMove={() => {
          if (!current) cursor.point(rowKey);
        }}
        role="row"
        tabIndex={focusable ? (current || entry ? 0 : -1) : undefined}
      >
        <span aria-hidden className="row-icon">
          {mark}
        </span>
        <span
          className={nameClass === undefined ? 'row-name' : `row-name ${nameClass}`}
          role="cell"
          // A name in words carries itself whole as its tooltip, since a
          // narrow name column cuts it with an ellipsis.
          {...(typeof name === 'string' ? tooltip(name) : {})}
        >
          {name}
        </span>
        {children}
      </div>
    </InRowContext.Provider>
  );
}

/** Props for {@link Cell}. */
export interface CellProps {
  /** Right-aligned, for numbers. */
  readonly align?: 'right';
  readonly className?: string;
  /** The cell's whole text, for one cut short, as its tooltip and description; none when null. */
  readonly tip?: string | null;
  readonly children?: ReactNode;
}

/** A cell of a row after its name, in the listing's metadata look (`.row-meta`). */
export function Cell({ align, className, tip, children }: CellProps): ReactElement {
  return (
    <span
      className={['row-meta', align === 'right' ? 'align-right' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      role="cell"
      {...(tip === undefined || tip === null ? {} : describedTooltip(tip))}
    >
      {children}
    </span>
  );
}

/** The tone of a state: ready, a warning, a failure, a transition under way, or quiet. */
export type StateTone = 'ready' | 'warning' | 'danger' | 'busy' | 'muted';

/** Props for {@link StateMark}. */
export interface StateMarkProps {
  readonly tone: StateTone;
  /** The state in words ("running", "error"). */
  readonly word: string;
  /** A transition under way: a spinner in place of the dot. */
  readonly busy?: boolean;
}

/**
 * A state as a State column says it: a mark in the state's tone and its word
 * ("running", "error"), or a spinner for a transition (the shared
 * `Spinner`, as `RunHeader` turns). Each tone's mark has its own shape too, so it reads
 * without its hue. Inside a row the word takes the tone too, so a failure
 * reads red and a stopped line dim. A word wider than its column ends in an
 * ellipsis and carries itself whole as its tooltip.
 */
export function StateMark({ tone, word, busy = false }: StateMarkProps): ReactElement {
  return (
    <span className={`pane-state pane-tone-${tone}`}>
      {busy ? (
        <Spinner className="pane-state-busy" />
      ) : (
        <span aria-hidden className="pane-state-dot" />
      )}
      <span className="pane-state-word" {...tooltip(word)}>
        {word}
      </span>
    </span>
  );
}

/** Props for {@link PathCell}. */
export interface PathCellProps {
  /** The whole path, slash-separated ("/opt/homebrew/var/mysql"). */
  readonly path: string;
  /**
   * The name's own class, which colours it by its kind (a folder as a
   * folder); the text tone without one. `pathParts(path).base` is the name.
   */
  readonly nameClassName?: string;
}

/**
 * A path cell: its folders in the row-meta tone, the head giving way first
 * so the ellipsis falls inside it, then the last folder, then the name, in
 * the text tone or the colour `nameClassName` gives it; the whole path in
 * its tooltip.
 */
export function PathCell({ path, nameClassName }: PathCellProps): ReactElement {
  const { head, tail, base } = pathParts(path);

  return (
    <Cell className="pane-path" tip={path}>
      <span className="pane-path-head">{head}</span>
      <span className="pane-path-tail">{tail}</span>
      <span
        className={
          nameClassName === undefined ? 'pane-path-name' : `pane-path-name ${nameClassName}`
        }
      >
        {base}
      </span>
    </Cell>
  );
}

/** Props for {@link WellColumn}. */
export interface WellColumnProps {
  /** The strip's first label ("Log", "Output"). */
  readonly title: string;
  /** What the strip says at its right end: a file name, a note, or a control (Clear). */
  readonly columns: readonly ListingColumn[];
  /** Names the column as a region; it is a plain block without one. */
  readonly label?: string;
  readonly className?: string;
  /** The well: a `<pre className="pane-well">` of lines, or a terminal in a box. */
  readonly children: ReactNode;
}

/**
 * A column that holds a terminal well under its strip: a log or a
 * process's output, full height in the terminal theme's colours (the
 * well, `.pane-well`, is the child's to draw: a `<pre>` of lines, or a
 * terminal in a box). It is a region when `label` names it.
 */
export function WellColumn({
  title,
  columns,
  label,
  className,
  children
}: WellColumnProps): ReactElement {
  const classes = className === undefined ? 'pane-well-column' : `pane-well-column ${className}`;
  const strip = <Strip columns={columns} title={title} />;
  // The strip's name, then each of its columns at its own width.
  const style = {
    '--pane-grid': `var(--icon-column) minmax(0, 1fr) ${columns.map(() => 'auto').join(' ')}`
  } as CSSProperties;

  return label === undefined ? (
    <div className={classes} style={style}>
      {strip}
      {children}
    </div>
  ) : (
    <section aria-label={label} className={classes} style={style}>
      {strip}
      {children}
    </section>
  );
}
