import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject
} from 'react';

import type { RowCursor } from '../listing/Listing.js';
import { isTextEditingTarget } from '../keyboard/Keyboard.logic.js';
import { watchOverlays } from '../keyboard/OverlayWatch.js';
import { createValueStore, unheard } from '../store/ValueStore.js';
import {
  isTabStop,
  nextTabStop,
  pageRows,
  paneRow,
  paneRows,
  showRow,
  type TabStop
} from './PaneKeys.js';
import { movedIndex, sameVerbs, type PaneMove } from './PaneKeys.logic.js';

/** The two panes of a two-pane view: the sidebar and the page beside it. */
export type Pane = 'sidebar' | 'main';

/** What a view hands `usePaneKeys`. */
export interface PaneKeysOptions<Action extends { readonly kind: string }, Verbs extends object> {
  /** The view is shown; while it is hidden no key acts. */
  readonly shown: boolean;
  /** The view's first data landed, replacing the panes the focus was in; its turning true hands the focus on again. */
  readonly loaded: boolean;
  /** The pane the keys start in. */
  readonly initialPane: Pane;
  /** Names the page the main pane shows; its cursor row is kept with it, so a new page starts with none. */
  readonly page: string;
  /** The sidebar's rows top to bottom by key, as its cursor walks them. */
  readonly sidebarKeys: readonly string[];
  /** The sidebar row the cursor rests on until the keys or the pointer move it: the open page's. */
  readonly openKey: string | null;
  /** What the main pane's cursor row and path bar offer, read off the rendered pane. */
  readonly readVerbs: (main: Element | null, cursor: string | null) => Verbs;
  /** What a pane that offers nothing offers. */
  readonly noVerbs: Verbs;
  /**
   * What else the main pane's rows and controls follow (its data), so the
   * reading follows it too. Unread where the view leaves the cursor out of
   * render (`cursorInRender`), which reads them after its every render.
   */
  readonly follows?: readonly unknown[];
  /** The action a key asks of the view, or null for one it leaves alone. */
  readonly readKey: (event: KeyboardEvent) => Action | null;
  /**
   * Whether an action is the cursor's (a move, Return), which a focused
   * control keeps for itself. The shared listener knows two actions by
   * kind: `move` and `switch-pane` (with `back` for Shift-Tab).
   */
  readonly cursorKey: (action: Action) => boolean;
  /** Runs an action the keys asked for, in the pane the key was aimed at. */
  readonly run: (action: Action, pane: Pane) => void;
  /**
   * Tab and Shift-Tab walk the sidebar's own controls too, as one cycle
   * with the page's in document order (`nextTabStop` with a sidebar), for a
   * sidebar whose path bar, fields, or status line hold controls no key
   * runs. Without it, Tab from the sidebar goes to the page's home.
   */
  readonly sidebarStops?: boolean;
  /**
   * The view reads each pane's cursor row in render (`mainKey`,
   * `sidebarKey`), so a cursor move draws the view again: the default.
   * False leaves a move to the two rows it changes and to the verbs it
   * offers, for a view whose pages and sidebar are too large to draw again
   * per move; `mainKey` and `sidebarKey` are then always null,
   * and `rowCursor.current()` and `sidebarCursor.current()` give the rows
   * now. The main pane's rows and verbs are then read after every render of
   * the view, which draws rarely, so a row any of its state adds or
   * removes is never missed. In either mode a row that comes or goes with a
   * render of its page alone (`RowCursor.rowsChanged`) has them read again.
   */
  readonly cursorInRender?: boolean;
}

/** The panes' state and the moves a view's verbs and legend run. */
export interface PaneKeys<Verbs> {
  /** The view's root, which holds both panes. */
  readonly rootRef: RefObject<HTMLDivElement | null>;
  /** The main pane. */
  readonly mainRef: RefObject<HTMLDivElement | null>;
  /** The pane the keys act in, which wears the accent on its frame. */
  readonly activePane: Pane;
  /**
   * The sidebar's cursor row: the one the keys or the pointer moved to,
   * else `openKey`. Always null where the view leaves the cursor out of
   * render (`cursorInRender`), which reads `sidebarCursor.current()`.
   */
  readonly sidebarKey: string | null;
  /**
   * The sidebar's cursor as its rows follow it, the same object for the
   * view's life: `current()` is `sidebarKey` now, `subscribe` hears each
   * change of it, from a move or from the rows and `openKey` the view
   * hands in, and `point` is `pointSidebar`. A row that follows it draws
   * on its own when it gains or loses the cursor.
   */
  readonly sidebarCursor: RowCursor;
  /**
   * The row the sidebar's cursor rests on while it is moved to none: the
   * open row, else the first. A row that follows `sidebarCursor` and is
   * memoized takes whether it is this one as a prop, so it draws in the
   * same render that moves the rest there or away.
   */
  readonly sidebarRest: string | null;
  /**
   * The main pane's cursor row on the page shown, or null for none yet.
   * Always null where the view leaves the cursor out of render
   * (`cursorInRender`), which reads `rowCursor.current()`.
   */
  readonly mainKey: string | null;
  /** What the main pane's cursor row and path bar offer now (`readVerbs`). */
  readonly offered: Verbs;
  /** The pointer or the focus entered the sidebar. */
  readonly activateSidebar: () => void;
  /** The pointer or the focus entered the main pane; the sidebar's cursor goes back to the open row. */
  readonly activateMain: () => void;
  /** Makes a pane the active one and gives its home the focus, so the keys go on from there. */
  readonly focusPane: (pane: Pane) => void;
  /** Moves the sidebar's cursor to a row, as the pointer moving over it does. */
  readonly pointSidebar: (key: string) => void;
  /** The pointer left the sidebar's rows: its cursor goes back to the open row unless the pane is in use. */
  readonly leaveSidebar: () => void;
  /** Puts the sidebar's cursor back on the open row, as opening a row does. */
  readonly restSidebar: () => void;
  /** Moves the main pane's cursor to a row of the page shown; the same function while the page is. */
  readonly pointMain: (key: string) => void;
  /**
   * The main pane's cursor as `RowCursorContext` carries it, the same object
   * while the page is, so a move draws only the rows it changes.
   */
  readonly rowCursor: RowCursor;
  /** Puts the main pane's cursor on a row of a page about to show (an install landing on its page). */
  readonly placeMain: (page: string, key: string) => void;
  /** Moves a pane's cursor, stopping at either end, and brings its row into view. */
  readonly move: (to: PaneMove, pane: Pane) => void;
}

/** The main pane's cursor row, kept with the page it is on, so a new page starts with none. */
interface MainCursor {
  readonly page: string;
  readonly key: string;
}

/** The sidebar's cursor row: the one moved to while it is listed, else the open row, else the first. */
const sidebarRow = (
  moved: string | null,
  keys: readonly string[],
  openKey: string | null
): string | null => (moved !== null && keys.includes(moved) ? moved : (openKey ?? keys[0] ?? null));

/** The sidebar pane: the frame around its home, which holds its other controls (Refresh) too. */
const sidebarPane = (root: Element): Element | null =>
  root.querySelector('[data-pane-home="sidebar"]')?.closest('.pane') ?? null;

/**
 * The keyboard of a view with a sidebar beside a page: each pane has a
 * cursor row the arrows move and the pointer shares (`data-row-key` rows;
 * the main pane's through `RowCursorContext`), Tab and Shift-Tab switch
 * panes and walk the page's other controls, and the sidebar's too where
 * the view asks (`sidebarStops`, `nextTabStop`), and the view's own
 * actions run through `run`. The listener sits on the window in the capture
 * phase and acts only while the view is shown, no overlay is open
 * (`watchOverlays`), no input method is composing, and the key is aimed at
 * the view or at nothing. A text field keeps every key but Tab, a
 * terminal that takes input (a text field inside `.terminal`) keeps Tab
 * too, and a focused control keeps its own arrows and Return. Each pane's
 * home is the element marked `data-pane-home` (`sidebar` for the
 * sidebar's), which the keys hand the focus to.
 */
export function usePaneKeys<Action extends { readonly kind: string }, Verbs extends object>(
  options: PaneKeysOptions<Action, Verbs>
): PaneKeys<Verbs> {
  const { shown, loaded, page, sidebarKeys, openKey } = options;
  const [activePane, setActivePane] = useState<Pane>(options.initialPane);
  // Both panes' cursor rows live outside React state, so a move draws only
  // the rows that follow them, and the view too where it reads the rows in
  // render (`cursorInRender`). The sidebar's is the row moved to; null
  // stands on the open page's row.
  const [sidebarStore] = useState(() => createValueStore<string | null>(null));
  const [cursorStore] = useState(() => createValueStore<MainCursor | null>(null));
  const inRender = options.cursorInRender !== false;
  const sidebarMoved = useSyncExternalStore(
    inRender ? sidebarStore.subscribe : unheard,
    sidebarStore.get
  );
  const mainCursor = useSyncExternalStore(
    inRender ? cursorStore.subscribe : unheard,
    cursorStore.get
  );
  const [offered, setOffered] = useState<Verbs>(options.noVerbs);
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const mainKey = inRender && mainCursor?.page === page ? mainCursor.key : null;
  const sidebarKey = inRender ? sidebarRow(sidebarMoved, sidebarKeys, openKey) : null;
  const sidebarRest = openKey ?? sidebarKeys[0] ?? null;
  const optionsRef = useRef(options);

  optionsRef.current = options;

  // The sidebar's cursor row as its rows read it, from the latest render's
  // keys and open row and the row moved to now; the last answer is kept, so
  // every row asking after one move costs one look through the keys.
  const sidebarSeen = useRef<{
    readonly moved: string | null;
    readonly keys: readonly string[];
    readonly openKey: string | null;
    readonly row: string | null;
  } | null>(null);
  // The sidebar's cursor row its followers were last told of.
  const [sidebarShown] = useState(() => createValueStore<string | null>(null));
  const sidebarCursor = useMemo<RowCursor>(
    () => ({
      current: () => {
        const moved = sidebarStore.get();
        const { sidebarKeys: keys, openKey: open } = optionsRef.current;
        const seen = sidebarSeen.current;

        if (seen?.moved === moved && seen.keys === keys && seen.openKey === open) return seen.row;

        const row = sidebarRow(moved, keys, open);

        sidebarSeen.current = { moved, keys, openKey: open, row };
        return row;
      },
      subscribe: sidebarShown.subscribe,
      point: sidebarStore.set
    }),
    [sidebarStore, sidebarShown]
  );

  // The sidebar's followers hear a change of its cursor row, whether a move
  // or the keys and open row a render hands in made it. The render's is
  // told once its followers have taken in what they drew (a passive
  // effect, after theirs), so a row that drew with the render reads the
  // same row again and draws no more.
  useEffect(
    () => sidebarStore.subscribe(() => sidebarShown.set(sidebarCursor.current())),
    [sidebarStore, sidebarShown, sidebarCursor]
  );
  useEffect(() => {
    sidebarShown.set(sidebarCursor.current());
  });

  /** Puts the main pane's cursor on a row of a page; a move to where it stands tells no one. */
  const setMainCursor = useCallback(
    (next: MainCursor) => {
      const held = cursorStore.get();

      if (held?.page !== next.page || held.key !== next.key) cursorStore.set(next);
    },
    [cursorStore]
  );
  // Settles the main pane's cursor on the rendered rows and reads its
  // verbs (below); the latest render's, so a row coming or going with a
  // render of its page alone settles it with the view's latest state.
  const settleMainRef = useRef<() => void>(() => undefined);
  const settlePending = useRef(false);
  const rowCursor = useMemo<RowCursor>(
    () => ({
      current: () => {
        const held = cursorStore.get();

        return held?.page === page ? held.key : null;
      },
      subscribe: cursorStore.subscribe,
      point: (key) => setMainCursor({ page, key }),
      // Once per commit, after it: a row going is still in the document
      // while its cleanup runs, and every row of a listing calls this.
      rowsChanged: () => {
        if (settlePending.current) return;
        settlePending.current = true;
        queueMicrotask(() => {
          settlePending.current = false;
          settleMainRef.current();
        });
      }
    }),
    [cursorStore, page, setMainCursor]
  );
  const pointMain = rowCursor.point;

  /** Reads what the main pane's cursor row and path bar offer the keys now. */
  const readOffered = useCallback((key: string | null) => {
    const next = optionsRef.current.readVerbs(mainRef.current, key);

    setOffered((current) => (sameVerbs(current, next) ? current : next));
  }, []);

  // The main pane's cursor needs the rendered rows: while the pane is
  // active it stands on a row, the first when its own is gone. The legend
  // then reads what that row and the path bar offer. The rows and their
  // controls follow the page and what the view names in `follows`, or,
  // where the cursor is out of render, whatever the view drew; a row its
  // page alone adds or removes settles it too (`rowsChanged`).
  // `follows` is the view's own list of what the rows follow, the same length every render.
  const readAfter = inRender ? [activePane, mainKey, page, ...(options.follows ?? [])] : undefined;

  settleMainRef.current = () => {
    const main = mainRef.current;
    const rows = paneRows(main);
    const key = rowCursor.current();

    if (activePane === 'main' && rows.length > 0 && paneRow(main, key) === null) {
      const first = rows[0]?.dataset.rowKey;

      if (first !== undefined) setMainCursor({ page, key: first });

      return;
    }

    readOffered(key);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => settleMainRef.current(), readAfter);

  // Where the view leaves the cursor out of render, a move reads the verbs
  // at once: the rows' controls are drawn whichever row is the cursor's,
  // so the row the cursor lands on already shows what it offers.
  useEffect(() => {
    if (inRender) return undefined;

    return cursorStore.subscribe(() => {
      const held = cursorStore.get();

      readOffered(held?.page === optionsRef.current.page ? held.key : null);
    });
  }, [inRender, cursorStore, readOffered]);

  const focusPane = (pane: Pane): void => {
    setActivePane(pane);
    if (pane === 'main') sidebarStore.set(null);

    const home =
      pane === 'sidebar'
        ? rootRef.current?.querySelector<HTMLElement>('[data-pane-home="sidebar"]')
        : (mainRef.current?.querySelector<HTMLElement>('[data-pane-home]') ?? mainRef.current);

    home?.focus({ preventScroll: true });
  };

  // Coming into view, the app focuses the view; the active pane's home
  // takes it so the first key lands there, and again when the first
  // data replaces the panes the focus was in. Only a focus the view
  // already holds (or one lost with the replaced panes) is handed on: a
  // switcher tab the arrows walk keeps it, and so does a dialog or palette
  // open over the window, whose keys work only while it holds the focus.
  useEffect(() => {
    const root = rootRef.current;
    const focused = document.activeElement;
    const onView =
      focused === null ||
      focused === document.body ||
      (root !== null && (focused.contains(root) || root.contains(focused)));

    if (shown && onView && !watchOverlays(document).overlayOpen()) focusPane(activePane);
    // Only the view being shown or its first data hands the focus on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, loaded]);

  const move = (to: PaneMove, pane: Pane): void => {
    const root = rootRef.current;

    if (pane === 'sidebar') {
      const keys = optionsRef.current.sidebarKeys;
      const current = sidebarCursor.current();
      const at = current === null ? -1 : keys.indexOf(current);
      const next = movedIndex(keys.length, at, to, pageRows(root));
      const key = next === null ? undefined : keys[next];

      if (key === undefined) return;
      sidebarStore.set(key);
      showRow(paneRow(root?.querySelector('[data-pane-home="sidebar"]') ?? null, key));

      return;
    }

    const rows = paneRows(mainRef.current);
    const current = rowCursor.current();
    const at = rows.findIndex((entry) => entry.dataset.rowKey === current);
    const next = movedIndex(rows.length, at, to, pageRows(mainRef.current));
    const target = next === null ? undefined : rows[next];
    const key = target?.dataset.rowKey;

    if (target === undefined || key === undefined) return;
    setMainCursor({ page, key });
    showRow(target);
  };

  // The view's keys, in the capture phase while it is shown and nothing
  // modal is open, for a key aimed at the view or at nothing.
  const keysRef = useRef<(event: KeyboardEvent) => void>(() => undefined);

  keysRef.current = (event: KeyboardEvent): void => {
    const root = rootRef.current;
    const main = mainRef.current;
    const current = optionsRef.current;

    if (!current.shown || event.isComposing || root === null || main === null) return;
    if (watchOverlays(document).overlayOpen()) return;

    const node = event.target instanceof Element ? event.target : null;

    if (node !== null && !node.contains(root) && !root.contains(node)) return;

    const typing = isTextEditingTarget(node);

    // A terminal that takes input is a program's keyboard, Tab included.
    if (typing && node?.closest('.terminal') != null) return;

    const action = current.readKey(event);

    if (action === null) return;

    const sidebar = sidebarPane(root);
    const home = main.querySelector<HTMLElement>('[data-pane-home]') ?? main;
    const inSidebar = node !== null && sidebar?.contains(node) === true;
    const inMain = node !== null && main.contains(node);
    const pane: Pane = inSidebar ? 'sidebar' : inMain ? 'main' : activePane;
    // Where in its pane the key was aimed: the pane's home (the listing,
    // the frame, or nothing in particular), a control in one of its rows,
    // or another control, which keeps its own keys.
    const inRow = (node?.closest('[data-row-key]') ?? null) !== null;
    const onHome =
      node === null ||
      node.contains(root) ||
      !(inSidebar || inMain) ||
      node === home ||
      node === main ||
      (inSidebar && node.closest('[data-pane-home="sidebar"]') !== null) ||
      (inMain &&
        !inRow &&
        node.closest('button, input, select, textarea, summary, a, [tabindex]') === home);

    if (action.kind === 'switch-pane') {
      const sidebarHome = root.querySelector<HTMLElement>('[data-pane-home="sidebar"]');
      const walked =
        current.sidebarStops === true && sidebar !== null && sidebarHome !== null
          ? { pane: sidebar, home: sidebarHome }
          : null;
      // A control that is a Tab stop goes on from itself. Otherwise a
      // sidebar control (Refresh) switches panes as the listing does, and a
      // row's control out of the Tab order goes on from the page's home.
      const stop = node !== null && isTabStop(node) ? node : null;
      const from: TabStop =
        pane === 'sidebar'
          ? walked !== null && stop !== null && !inRow
            ? stop
            : 'sidebar'
          : onHome || (inRow && stop === null)
            ? 'page'
            : (node as HTMLElement);
      const back = 'back' in action && action.back === true;
      const to = nextTabStop(main, home, from, back, walked);

      event.preventDefault();
      event.stopPropagation();

      if (to === 'sidebar' || to === 'page') focusPane(to === 'sidebar' ? 'sidebar' : 'main');
      else to.focus();

      return;
    }

    if (typing) return;

    const isMove = action.kind === 'move';

    // A control keeps its own arrows and Return; the arrows go on from a
    // row's control, which hands the focus to the pane's home.
    if (current.cursorKey(action) && !onHome && !(inRow && action.kind !== 'enter')) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.repeat && !isMove) return;

    if (pane !== activePane) setActivePane(pane);

    if (inRow && isMove) {
      (pane === 'sidebar'
        ? root.querySelector<HTMLElement>('[data-pane-home="sidebar"]')
        : home
      )?.focus({
        preventScroll: true
      });
    }

    current.run(action, pane);
  };

  useEffect(() => {
    const listener = (event: KeyboardEvent): void => keysRef.current(event);

    window.addEventListener('keydown', listener, true);

    return () => window.removeEventListener('keydown', listener, true);
  }, []);

  return {
    rootRef,
    mainRef,
    activePane,
    sidebarKey,
    sidebarCursor,
    sidebarRest,
    mainKey,
    offered,
    activateSidebar: () => setActivePane('sidebar'),
    activateMain: () => {
      setActivePane('main');
      sidebarStore.set(null);
    },
    focusPane,
    pointSidebar: sidebarStore.set,
    leaveSidebar: () => {
      if (activePane !== 'sidebar') sidebarStore.set(null);
    },
    restSidebar: () => sidebarStore.set(null),
    pointMain,
    rowCursor,
    placeMain: (onPage, key) => setMainCursor({ page: onPage, key }),
    move
  };
}
