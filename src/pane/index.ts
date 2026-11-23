/**
 * Panes: the path bar and status line a pane opens and closes with, the
 * compact controls inside them, in listing rows, and in a toolbar that
 * fits its tools to one line (`useToolbarFit`), and the keyboard of a
 * sidebar beside a page (`usePaneKeys`) with the pure key mapping and DOM
 * readers it is built on, and the tab strip a pane hangs from (`PaneTabs`)
 * with the pure rules it and its host keep tab state by; `PaneBox` and
 * `PaneList` are the pane and its scrolling body. Styled by the listing
 * look under `.listing-root`.
 */

export {
  PaneBox,
  PaneList,
  type PaneBoxProps,
  type PaneListProps,
  type RegionHandlers
} from './Pane.js';
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
  type PaneSiblings,
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
export { PaneTabs, type PaneTabItem, type PaneTabsProps } from './PaneTabs.js';
export {
  draggedTabOrder,
  foldOrder,
  foldsNeeded,
  gatherTabs,
  pickedTabs,
  pickRun,
  tabLabelFloor,
  togglePick,
  type FoldableTab,
  type TabBox,
  type TabPicks
} from './PaneTabs.logic.js';
export { useToolbarFit } from './useToolbarFit.js';
export { usePaneKeys, type Pane, type PaneKeys, type PaneKeysOptions } from './usePaneKeys.js';
