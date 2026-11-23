/**
 * The window frame, every part of it a component: the app's root and its
 * content panel (`AppRoot`, `SpacePanel`), the window's grid
 * (`WindowFrame`, with the `SidebarResizer`), the sidebar's tree
 * (`TreePane`, `TreeList`, `TreeRow` with its `TreeToggle`, `TreeTool`,
 * `TreeFilterInput`, `SidebarEmpty`), a pane's quick row of `FilterChips`
 * and its `PaneWarning`, a pane status line's `StatusNotice`, the `Dock`
 * with its log and input, the splitter between a list and the pane under
 * it (`usePaneSplit`, `PaneSplitter`, `SplitDetail`), and a page's parts
 * (`PageSlot`, `PanePage`, `Toolbar`, `PageNote`, `SectionHead`, and the
 * rest). Their look is `frame.css` in `@bigpixelrocket/uiok/styles.css`.
 */

export {
  AppRoot,
  PageSlot,
  SpacePanel,
  type AppRootProps,
  type PageSlotProps,
  type SpacePanelProps
} from './AppRoot.js';
export {
  Dock,
  DockInput,
  DockLog,
  DockLogEntry,
  type DockInputProps,
  type DockLogEntryProps,
  type DockLogProps,
  type DockProps
} from './Dock.js';
export { FilterChips, type FilterChip, type FilterChipsProps } from './FilterChips.js';
export {
  EmptyAction,
  FootBar,
  PageFilter,
  PageNote,
  PanePage,
  PaneWarning,
  SectionHead,
  ShowSidebarButton,
  Toolbar,
  ToolbarGap,
  ToolbarGrow,
  type PageNoteProps,
  type PagePartProps,
  type SectionHeadProps,
  type ShowSidebarButtonProps,
  type ToolbarProps
} from './PageParts.js';
export {
  cutRowDepth,
  PaneSplitter,
  SplitDetail,
  usePaneSplit,
  type PaneSplit,
  type PaneSplitterProps,
  type SplitDetailProps
} from './PaneSplit.js';
export { draggedWidth, SidebarResizer, type SidebarResizerProps } from './SidebarResizer.js';
export { StatusNotice, type StatusNoticeProps, type StatusNoticeTone } from './StatusNotice.js';
export {
  SidebarEmpty,
  TreeFilterInput,
  TreeList,
  TreePane,
  TreeRow,
  TreeTool,
  type SidebarEmptyProps,
  type TreeFilterInputProps,
  type TreeListProps,
  type TreePaneProps,
  type TreeRowKind,
  type TreeRowProps,
  type TreeRowToggle,
  type TreeToolKind,
  type TreeToolProps
} from './Tree.js';
export { TreeToggle, type TreeToggleProps } from './TreeToggle.js';
export { WindowFrame, type WindowFrameGroup, type WindowFrameProps } from './WindowFrame.js';
