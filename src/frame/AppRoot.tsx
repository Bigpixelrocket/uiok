import type { ReactElement, ReactNode, Ref } from 'react';

import type { RegionHandlers } from '../pane/Pane.js';

/** Props for {@link AppRoot}. */
export interface AppRootProps {
  /**
   * The release channel the window wears (`data-channel`), which colours
   * its `ChannelMarker` and channel tags; none on the release.
   */
  readonly channel?: string | null;
  /** The window's content: a `SpacePanel`, or the frame itself. */
  readonly children: ReactNode;
}

/**
 * The app window's root: one column the window's height holding its
 * content, which owns the whole window, its top band included. A window
 * that wears it sets the interface face and the body's ground and text, and
 * keeps every dialog clear of its top band (`--dialog-inset-top`).
 */
export function AppRoot({ channel = null, children }: AppRootProps): ReactElement {
  return (
    <div className="app-shell" data-channel={channel ?? undefined}>
      <main className="shell-content">{children}</main>
    </div>
  );
}

/** Props for {@link SpacePanel}. */
export interface SpacePanelProps extends RegionHandlers {
  readonly ref?: Ref<HTMLDivElement>;
  /** The space's frame (`WindowFrame`). */
  readonly children: ReactNode;
}

/**
 * The panel the content's keyboard commands work in, inside `AppRoot`: a
 * focus boundary the host's key handlers hang on, focusable by script and
 * out of the Tab order, never a control, so it draws no ring.
 */
export function SpacePanel({ ref, children, ...handlers }: SpacePanelProps): ReactElement {
  return (
    <div className="space-panel" ref={ref} tabIndex={-1} {...handlers}>
      {children}
    </div>
  );
}

/** Props for {@link PageSlot}. */
export interface PageSlotProps {
  /** The page is the front tab's; false keeps it mounted out of sight. */
  readonly shown: boolean;
  /** The page (`PanePage`). */
  readonly children: ReactNode;
}

/**
 * One page of the main pane: the front tab's page lays out as the pane's
 * own child, and a held page (a background tab with unsaved changes) stays
 * mounted and hidden, so it keeps its state.
 */
export function PageSlot({ shown, children }: PageSlotProps): ReactElement {
  return (
    <div className="page-slot" hidden={!shown}>
      {children}
    </div>
  );
}
