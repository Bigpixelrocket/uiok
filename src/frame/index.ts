/**
 * The window frame: the app's root and content panel, a space's root, the
 * window's grid (`WindowFrame`, with the `SidebarResizer`), the sidebar's
 * tree rows (`TreeToggle` and the `tree-*` classes), a pane's quick row of
 * `FilterChips`, a pane status line's `StatusNotice`, the dock, and the
 * splitter between a list and the pane under it (`usePaneSplit`,
 * `PaneSplitter`). Their look is `frame.css` in
 * `@bigpixelrocket/uiok/styles.css`.
 */

export { FilterChips, type FilterChip, type FilterChipsProps } from './FilterChips.js';
export {
  cutRowDepth,
  PaneSplitter,
  usePaneSplit,
  type PaneSplit,
  type PaneSplitterProps
} from './PaneSplit.js';
export { draggedWidth, SidebarResizer, type SidebarResizerProps } from './SidebarResizer.js';
export { StatusNotice, type StatusNoticeProps, type StatusNoticeTone } from './StatusNotice.js';
export { TreeToggle, type TreeToggleProps } from './TreeToggle.js';
export { WindowFrame, type WindowFrameProps } from './WindowFrame.js';
