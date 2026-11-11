/**
 * Panes: the path bar and status line a pane opens and closes with, the
 * compact controls inside them and in listing rows, and the keyboard of a
 * sidebar beside a page (`usePaneKeys`) with the pure key mapping and DOM
 * readers it is built on. Styled by the listing look under `.listing-root`.
 */

export {
  InRowContext,
  QuietAction,
  RowIconAction,
  RowLinkLookContext,
  useInRow,
  type ControlVerb,
  type LinkLook,
  type QuietActionProps,
  type RowIconActionProps
} from './PaneActions.js';
export {
  PanePathBar,
  PaneStatus,
  PathFact,
  type PaneCrumb,
  type PanePathBarProps,
  type PaneStatusProps,
  type PathFactProps
} from './PaneFrame.js';
export {
  isTabStop,
  nextTabStop,
  pageRows,
  paneRow,
  paneRows,
  showRow,
  tabStops,
  verbControl,
  type SidebarTabStops,
  type TabStop
} from './PaneKeys.js';
export {
  movedIndex,
  NO_MAIN_VERBS,
  paneKeyAction,
  sameVerbs,
  type MainVerbs,
  type PaneKeyAction,
  type PaneKeyOptions,
  type PaneKeyStroke,
  type PaneMove
} from './PaneKeys.logic.js';
export { usePaneKeys, type Pane, type PaneKeys, type PaneKeysOptions } from './usePaneKeys.js';
