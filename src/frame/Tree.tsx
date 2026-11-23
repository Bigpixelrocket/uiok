import type { LucideIcon } from 'lucide-react';
import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useSyncExternalStore,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref
} from 'react';

import { ICON_MD } from '../icon/sizes.js';
import { RowCursorContext } from '../listing/Listing.js';
import type { RegionHandlers } from '../pane/Pane.js';
import { InListingRowContext, InRowContext } from '../pane/PaneActions.js';
import { cutTooltip } from '../tooltip/Tooltip.logic.js';
import { TreeToggle } from './TreeToggle.js';

/** The id prefix of the tree a row is in, which names each row for the tree's active descendant. */
const TreeIdContext = createContext<string | null>(null);

/** A row's element id in its tree: the tree's prefix and the row's key, made safe for an id. */
const rowId = (tree: string, rowKey: string): string => `${tree}-${encodeURIComponent(rowKey)}`;

const levelStyle = (level: number): CSSProperties | undefined =>
  level > 0 ? ({ '--tree-level': level } as CSSProperties) : undefined;

/** Props for {@link TreePane}. */
export interface TreePaneProps extends RegionHandlers {
  /** The width the host keeps, in pixels; none takes `--sidebar-width` (240px). */
  readonly width?: number;
  /** The pane holds the keyboard: its frame wears the accent. */
  readonly active?: boolean;
  readonly label?: string;
  readonly ref?: Ref<HTMLElement>;
  /** Its path bar, quick row (`FilterChips`), `TreeList`, and status line. */
  readonly children: ReactNode;
}

/**
 * The sidebar's pane, which holds a tree: a pane at the sidebar's width
 * whose rows lay out as the chevron's slot, the node's glyph, its name, and
 * one trailing column. Narrower than its title and its tools side by side,
 * its path bar takes a line for each.
 */
export function TreePane({
  width,
  active = false,
  label,
  ref,
  children,
  ...handlers
}: TreePaneProps): ReactElement {
  return (
    <aside
      aria-label={label}
      className={active ? 'pane tree-pane active' : 'pane tree-pane'}
      ref={ref}
      style={width === undefined ? undefined : { width }}
      {...handlers}
    >
      {children}
    </aside>
  );
}

/** Props for {@link TreeList}. */
export interface TreeListProps extends RegionHandlers {
  /** The tree's accessible name ("Services"). */
  readonly label: string;
  readonly ref?: Ref<HTMLDivElement>;
  /** Its `TreeRow`s and `TreeTool`s, in order. */
  readonly children: ReactNode;
}

/**
 * The tree's rows in the sidebar's scrolling list: the sidebar's home
 * (`data-pane-home="sidebar"`), which `usePaneKeys` hands the focus and
 * finds the sidebar pane by, focusable by script and out of the Tab order.
 * Each row steps in by its level. While the list holds the focus, its
 * active descendant is the cursor row, so a screen reader follows the
 * cursor the keys move.
 */
export function TreeList({ label, ref, children, ...handlers }: TreeListProps): ReactElement {
  const tree = useId();
  const cursor = useContext(RowCursorContext);
  const current = useSyncExternalStore(cursor.subscribe, cursor.current);

  return (
    <div
      aria-activedescendant={current === null ? undefined : rowId(tree, current)}
      aria-label={label}
      className="pane-list tree"
      data-pane-home="sidebar"
      ref={ref}
      role="tree"
      tabIndex={-1}
      {...handlers}
    >
      <TreeIdContext.Provider value={tree}>{children}</TreeIdContext.Provider>
    </div>
  );
}

/**
 * What a tree row is: a node, a band that heads the rows under it (a
 * server, a project) on the strip's ground with a hairline under it, or a
 * group whose name reads as a heading over its rows.
 */
export type TreeRowKind = 'node' | 'band' | 'group';

/** A tree row's disclosure: whether its children show, how to toggle them, and the chevron's name. */
export interface TreeRowToggle {
  readonly open: boolean;
  readonly onToggle: () => void;
  /** The chevron's accessible name ("Expand shop", "Collapse shop"). */
  readonly label: string;
}

/** Props for {@link TreeRow}. */
export interface TreeRowProps {
  /** Names the row to the pane's cursor (`data-row-key`); unique in its pane. */
  readonly rowKey: string;
  /** How deep it stands: 0 at the tree's root. */
  readonly level?: number;
  readonly kind?: TreeRowKind;
  /** A row with children: its chevron; none leaves the chevron's slot empty. */
  readonly toggle?: TreeRowToggle;
  /** The node's glyph, in the quiet tone. */
  readonly glyph?: ReactNode;
  readonly name: ReactNode;
  /** Quieter words after the name ("×3"). */
  readonly detail?: ReactNode;
  /** The trailing column: a count, a port, a state (`StateMark`). */
  readonly trailing?: ReactNode;
  /** The row's own tool (Hide), shown on the cursor row only. */
  readonly tool?: ReactNode;
  /** Marked as chosen though it is not the cursor row (the page the main pane shows). */
  readonly marked?: boolean;
  /** Opens the row's item on a click anywhere but its controls. */
  readonly onOpen?: () => void;
  /** The row itself takes the focus: in the Tab order while it is the cursor row. */
  readonly focusable?: boolean;
}

/**
 * One row of a sidebar's tree: the chevron's slot, the glyph, the name (cut
 * with an ellipsis, whole in its tooltip) with its quieter detail, then its
 * trailing column and its own tool. Like a listing's `Row`, it follows the
 * pane's cursor (`RowCursorContext`), wearing the cursor row's look and
 * `aria-current`; the pointer moving over it or the focus entering it moves
 * the cursor there. Its controls leave the Tab order, since the tree's keys
 * run them. The expansion and its keys stay the host's.
 */
export function TreeRow({
  rowKey,
  level = 0,
  kind = 'node',
  toggle,
  glyph,
  name,
  detail,
  trailing,
  tool,
  marked = false,
  onOpen,
  focusable = false
}: TreeRowProps): ReactElement {
  const cursor = useContext(RowCursorContext);
  const tree = useContext(TreeIdContext);
  const current = useSyncExternalStore(cursor.subscribe, () => cursor.current() === rowKey);

  useLayoutEffect(() => {
    cursor.rowsChanged?.();

    return () => cursor.rowsChanged?.();
  }, [cursor, rowKey]);

  const classes = [
    'row',
    kind === 'band' ? 'tree-band' : '',
    kind === 'group' ? 'tree-group' : '',
    current ? 'cursor' : '',
    marked ? 'marked' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <InListingRowContext.Provider value>
      <InRowContext.Provider value>
        <div
          aria-current={current ? 'true' : undefined}
          aria-expanded={toggle === undefined ? undefined : toggle.open}
          aria-level={level + 1}
          aria-selected={marked}
          className={classes}
          data-row-key={rowKey}
          id={tree === null ? undefined : rowId(tree, rowKey)}
          onClick={onOpen}
          onFocus={() => cursor.point(rowKey)}
          onPointerMove={() => {
            if (!current) cursor.point(rowKey);
          }}
          role="treeitem"
          style={levelStyle(level)}
          tabIndex={focusable ? (current ? 0 : -1) : undefined}
        >
          {toggle === undefined ? (
            <span aria-hidden className="row-icon" />
          ) : (
            <TreeToggle label={toggle.label} onToggle={toggle.onToggle} open={toggle.open} />
          )}
          <span aria-hidden className="tree-glyph">
            {glyph}
          </span>
          <span
            className="row-name tree-name"
            {...(typeof name === 'string' && detail === undefined ? cutTooltip(name) : {})}
          >
            {name}
            {detail === undefined ? null : (
              <>
                {' '}
                <span className="tree-detail">{detail}</span>
              </>
            )}
          </span>
          <span className="row-meta align-right">
            {trailing}
            {tool === undefined ? null : <span className="tree-row-tool">{tool}</span>}
          </span>
        </div>
      </InRowContext.Provider>
    </InListingRowContext.Provider>
  );
}

/**
 * What a tree's tool row is: a plain tool (a filter field, a pager, an Add
 * action), a note under a node (past the chevron's slot), a heading over a
 * group further down, or a read that failed (its reason wraps, its action
 * under it).
 */
export type TreeToolKind = 'tool' | 'note' | 'heading' | 'danger';

/** Props for {@link TreeTool}. */
export interface TreeToolProps {
  readonly kind?: TreeToolKind;
  /** How deep it stands, as the rows around it. */
  readonly level?: number;
  /** Its glyph, before the words. */
  readonly icon?: LucideIcon;
  /** Its words. */
  readonly text?: ReactNode;
  /** The pane's cursor stands on it. */
  readonly cursor?: boolean;
  /** Its control after the words: a `TreeFilterInput`, a pager, an action. */
  readonly children?: ReactNode;
}

/**
 * A row of a tree that is not a node, at its level's indent in the small
 * size: a filter field, a pager, a note, a heading, or a failed read with
 * its action.
 */
export function TreeTool({
  kind = 'tool',
  level = 0,
  icon: Icon,
  text,
  cursor = false,
  children
}: TreeToolProps): ReactElement {
  const classes = [
    'tree-tool',
    kind === 'note' ? 'tree-note' : '',
    kind === 'heading' ? 'tree-heading' : '',
    kind === 'danger' ? 'danger' : '',
    cursor ? 'cursor' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      role={kind === 'danger' ? 'alert' : undefined}
      style={levelStyle(level)}
    >
      {Icon === undefined ? null : (
        <span aria-hidden className="tree-note-glyph">
          <Icon size={ICON_MD} />
        </span>
      )}
      {text === undefined ? null : <span className="tree-note-text">{text}</span>}
      {children}
    </div>
  );
}

/** Props for {@link TreeFilterInput}. */
export interface TreeFilterInputProps {
  readonly value: string;
  /** Hears each edit. */
  readonly onChange: (value: string) => void;
  /** Its accessible name ("Filter services"). */
  readonly label: string;
  readonly placeholder?: string;
  /** The host's keys while it holds the keyboard (Escape clears, ↓ goes to the rows). */
  readonly onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly ref?: Ref<HTMLInputElement>;
}

/**
 * A tree's filter field: a bare field that fills its `TreeTool` row, the
 * row underlined in the accent while the field holds the keyboard.
 */
export function TreeFilterInput({
  value,
  onChange,
  label,
  placeholder,
  onKeyDown,
  ref
}: TreeFilterInputProps): ReactElement {
  return (
    <input
      aria-label={label}
      className="tree-filter-input"
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      ref={ref}
      spellCheck={false}
      type="text"
      value={value}
    />
  );
}

/** Props for {@link SidebarEmpty}. */
export interface SidebarEmptyProps {
  /** What it says ("No services yet."). */
  readonly children: ReactNode;
}

/**
 * A sidebar with nothing to list, saying so as a quiet row in the rows'
 * place: from where a row's icon starts, dim, one row high.
 */
export function SidebarEmpty({ children }: SidebarEmptyProps): ReactElement {
  return <p className="space-nav-empty">{children}</p>;
}
