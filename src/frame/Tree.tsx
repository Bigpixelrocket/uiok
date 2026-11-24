import { Plus, type LucideIcon } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref
} from 'react';

import { ICON_MD } from '../icon/sizes.js';
import { useBellBeat } from '../menu/useBellBeat.js';
import { RowCursorContext } from '../listing/Listing.js';
import {
  regionHandlers,
  unclaimedContextMenu,
  useMenuKeyHome,
  type RegionHandlers
} from '../pane/Pane.js';
import { InListingRowContext, InRowContext } from '../pane/PaneActions.js';
import { cutTooltip } from '../tooltip/Tooltip.logic.js';
import { useSharedRef } from './sharedRef.js';
import { TreeToggle } from './TreeToggle.js';

/**
 * The tree a row is in: its id prefix, which names each row for the tree's
 * active descendant, and the way a row says it came or went, so the tree
 * names its active row again whoever drew or removed it.
 */
interface TreeScope {
  readonly id: string;
  readonly rowsChanged: () => void;
}

const TreeIdContext = createContext<TreeScope | null>(null);

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
  /**
   * The visual bell, as a `PaneBox`'s: a count the host raises each time a
   * key could not act in the sidebar (a move past the last row, a verb the
   * cursor row does not offer). Each rise shoves the cursor row sideways for
   * one beat; under reduced motion the row flashes the selection fill
   * instead. Only its change rings.
   */
  readonly bell?: number;
  readonly ref?: Ref<HTMLElement>;
  /** Its path bar, quick row (`FilterChips`), `TreeList`, and status line. */
  readonly children: ReactNode;
}

/**
 * The sidebar's pane, which holds a tree: a pane at the sidebar's width
 * whose rows lay out as the chevron's slot, the node's glyph, its name, and
 * one trailing column. Narrower than its title and its tools side by side,
 * its path bar takes a line for each. `bell` rings on its cursor row as a
 * `PaneBox`'s does (`useBellBeat`; `.bell-0`, `.bell-1`).
 */
export function TreePane({
  width,
  active = false,
  label,
  bell = 0,
  ref,
  children,
  ...handlers
}: TreePaneProps): ReactElement {
  const beat = useBellBeat(bell);

  return (
    <aside
      aria-label={label}
      className={['pane', 'tree-pane', active ? 'active' : '', beat === null ? '' : `bell-${beat}`]
        .filter(Boolean)
        .join(' ')}
      ref={ref}
      style={width === undefined ? undefined : { width }}
      {...regionHandlers(handlers)}
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
 * cursor the keys move. As the home, it hands the keyboard's menu key (the
 * Menu key, Shift-F10) to the cursor row's `onContextMenu`, as a page's
 * `PaneList` does.
 */
export function TreeList({ label, ref, children, ...handlers }: TreeListProps): ReactElement {
  const region = regionHandlers(handlers);
  const menuKey = useMenuKeyHome(true, region);
  const tree = useId();
  const cursor = useContext(RowCursorContext);
  const [list, attach] = useSharedRef(ref);

  // Names the cursor row only while it is drawn here: a row a filter took
  // away, or a cursor on another pane's row, leaves no active descendant
  // pointing at nothing.
  const sync = useCallback((): void => {
    const element = list.current;

    if (element === null) return;

    const key = cursor.current();
    const id = key === null ? null : rowId(tree, key);
    // One lookup by id in the tree's own root (the document, or the shadow
    // root it is mounted in, where the document cannot see), never a scan
    // of the rows; the tree's prefix makes the id unique there. A tree not
    // yet attached has no such root, and nothing to name.
    // Asked by shape, not instanceof, so a tree React renders into another
    // window's document (a same-origin frame) finds its row too.
    const root = element.getRootNode() as Partial<Pick<Document, 'getElementById'>>;
    const row =
      id === null || typeof root.getElementById !== 'function' ? null : root.getElementById(id);
    const drawnRow = row !== null && element.contains(row);

    if (drawnRow && id !== null) element.setAttribute('aria-activedescendant', id);
    else element.removeAttribute('aria-activedescendant');
  }, [cursor, list, tree]);

  // After every render and on every cursor move; and once a commit has put
  // rows in or taken them out, by whatever state drew them: one microtask
  // per commit, however many rows came or went, calling the latest sync.
  const latestSync = useRef(sync);
  const pending = useRef(false);

  useLayoutEffect(() => {
    latestSync.current = sync;
    sync();
    return cursor.subscribe(sync);
  });

  const scope = useMemo<TreeScope>(
    () => ({
      id: tree,
      rowsChanged: () => {
        if (pending.current) return;
        pending.current = true;
        queueMicrotask(() => {
          pending.current = false;
          latestSync.current();
        });
      }
    }),
    [tree]
  );

  return (
    <div
      aria-label={label}
      className="pane-list tree"
      data-pane-home="sidebar"
      ref={attach}
      role="tree"
      tabIndex={-1}
      {...region}
      {...menuKey}
    >
      <TreeIdContext.Provider value={scope}>{children}</TreeIdContext.Provider>
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
  /**
   * The row's item is not there yet or cannot be used yet (a tool not
   * installed, an add row whose requirement is missing): its name in the
   * quieter row-meta tone (`.row-dim`), lifted to the on-surface tone on the
   * cursor row, a marked row, and under the pointer, as a listing's dim
   * `Row`. Only the look changes: the row still takes the cursor, opens,
   * and opens its menu.
   */
  readonly dim?: boolean;
  /** Opens the row's item on a click anywhere but its controls. */
  readonly onOpen?: () => void;
  /**
   * A secondary click (the right button, a Control-click, the menu key) on
   * the row, with the row's key, for the row's menu: open it at
   * `event.clientX` and `event.clientY`. The row moves the pane's cursor to
   * itself first, so the menu acts on the cursor row, and cancels the
   * browser's own menu; a cancelled event is one the `TreeList` and
   * `TreePane` around it leave alone, so one click never opens two menus.
   */
  readonly onContextMenu?: (event: MouseEvent<HTMLElement>, rowKey: string) => void;
  /** The row itself takes the focus: in the Tab order while it is the cursor row. */
  readonly focusable?: boolean;
  /**
   * The row adds one under its parent ("Add runtime…"): an accent plus in
   * the glyph's slot unless `glyph` gives another, and dim words that turn
   * full under the pointer and on the cursor row, as a listing's add row.
   */
  readonly add?: boolean;
}

/**
 * One row of a sidebar's tree: the chevron's slot, the glyph, the name (cut
 * with an ellipsis, whole in its tooltip) with its quieter detail, then its
 * trailing column and its own tool. Like a listing's `Row`, it follows the
 * pane's cursor (`RowCursorContext`), wearing the cursor row's look and
 * `aria-current`; the pointer moving over it or the focus entering it moves
 * the cursor there, and one with `onContextMenu` takes the cursor on a
 * secondary click, then hands the click and its key to the app for the
 * row's menu. Its controls leave the Tab order, since the tree's keys run
 * them. Its accessible name is its name, its detail, and its trailing
 * column, in the order drawn (`aria-labelledby`), never its chevron's
 * label or its tool's, which are controls of their own. The expansion and
 * its keys stay the host's.
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
  dim = false,
  onOpen,
  onContextMenu,
  focusable = false,
  add = false
}: TreeRowProps): ReactElement {
  const cursor = useContext(RowCursorContext);
  const tree = useContext(TreeIdContext);
  const current = useSyncExternalStore(cursor.subscribe, () => cursor.current() === rowKey);
  const parts = useId();
  const hasTrailing = trailing !== undefined && trailing !== null && trailing !== false;

  useLayoutEffect(() => {
    cursor.rowsChanged?.();
    tree?.rowsChanged();

    return () => {
      cursor.rowsChanged?.();
      tree?.rowsChanged();
    };
  }, [cursor, rowKey, tree]);

  const classes = [
    'row',
    kind === 'band' ? 'tree-band' : '',
    kind === 'group' ? 'tree-group' : '',
    current ? 'cursor' : '',
    marked ? 'marked' : '',
    dim ? 'row-dim' : '',
    add ? 'pane-add' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <InListingRowContext.Provider value>
      <InRowContext.Provider value>
        <div
          aria-current={current ? 'true' : undefined}
          aria-expanded={toggle === undefined ? undefined : toggle.open}
          // Named by the words it draws, so its chevron's label ("Collapse
          // shop") and its tool's never join the name a row is read by.
          aria-labelledby={hasTrailing ? `${parts}-name ${parts}-trailing` : `${parts}-name`}
          aria-level={level + 1}
          aria-selected={marked}
          className={classes}
          data-row-key={rowKey}
          data-row-menu={onContextMenu === undefined ? undefined : ''}
          id={tree === null ? undefined : rowId(tree.id, rowKey)}
          onClick={onOpen}
          onContextMenu={unclaimedContextMenu(
            onContextMenu &&
              ((event) => {
                // The menu acts on the row it opened over, so that row is the cursor first.
                if (!current) cursor.point(rowKey);
                onContextMenu(event, rowKey);
              })
          )}
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
            {glyph === undefined && add ? <Plus size={ICON_MD} /> : glyph}
          </span>
          <span
            className="row-name tree-name"
            id={`${parts}-name`}
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
            {hasTrailing ? <span id={`${parts}-trailing`}>{trailing}</span> : null}
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
  /** Its words; words in a string the sidebar cuts show whole in a tooltip. */
  readonly text?: ReactNode;
  /**
   * Its key among the tree's rows, which joins it to the pane's cursor
   * (`RowCursorContext`) as a `TreeRow` is: the cursor's keys reach it and
   * the pointer moves the cursor to it. Without one it stands outside the
   * cursor, which `cursor` then draws.
   */
  readonly rowKey?: string;
  /** The pane's cursor stands on it, for a tool row without a `rowKey`. */
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
  rowKey,
  cursor: cursorOn = false,
  children
}: TreeToolProps): ReactElement {
  const cursor = useContext(RowCursorContext);
  const tree = useContext(TreeIdContext);
  const current = useSyncExternalStore(
    cursor.subscribe,
    () => rowKey !== undefined && cursor.current() === rowKey
  );

  useLayoutEffect(() => {
    if (rowKey === undefined) return;
    cursor.rowsChanged?.();
    tree?.rowsChanged();

    return () => {
      cursor.rowsChanged?.();
      tree?.rowsChanged();
    };
  }, [cursor, rowKey, tree]);

  const classes = [
    'tree-tool',
    kind === 'note' ? 'tree-note' : '',
    kind === 'heading' ? 'tree-heading' : '',
    kind === 'danger' ? 'danger' : '',
    current || (rowKey === undefined && cursorOn) ? 'cursor' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      data-row-key={rowKey}
      id={rowKey === undefined || tree === null ? undefined : rowId(tree.id, rowKey)}
      onPointerMove={
        rowKey === undefined
          ? undefined
          : () => {
              if (!current) cursor.point(rowKey);
            }
      }
      // A row the cursor walks is one of the tree's items, as a TreeRow is,
      // so the tree can name it as its active descendant; a danger row's
      // words then carry the alert.
      aria-level={rowKey === undefined ? undefined : level + 1}
      role={rowKey !== undefined ? 'treeitem' : kind === 'danger' ? 'alert' : undefined}
      style={levelStyle(level)}
    >
      {Icon === undefined ? null : (
        <span aria-hidden className="tree-note-glyph">
          <Icon size={ICON_MD} />
        </span>
      )}
      {text === undefined ? null : (
        <span
          className="tree-note-text"
          role={rowKey !== undefined && kind === 'danger' ? 'alert' : undefined}
          // Words a narrow sidebar cuts show whole in a tooltip, only while cut.
          {...(typeof text === 'string' ? cutTooltip(text) : {})}
        >
          {text}
        </span>
      )}
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
