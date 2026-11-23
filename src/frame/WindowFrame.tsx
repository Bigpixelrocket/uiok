import type { CSSProperties, ReactElement, ReactNode, Ref } from 'react';

import { ListingScopeContext } from '../listing/ListingScope.js';
import type { RegionHandlers } from '../pane/Pane.js';

/** Whether a slot was given something to draw: idiomatic `cond && <Part />` passes false for none. */
export const drawn = (node: ReactNode): boolean =>
  node !== null && node !== undefined && node !== false && node !== '';

/**
 * The one element a host keeps its sidebar and main pane in (for its keys
 * or its drop zone): its handlers and ref. It draws no box, so the parts
 * inside it keep their places in the frame's grid.
 */
export interface WindowFrameGroup extends RegionHandlers {
  readonly ref?: Ref<HTMLDivElement>;
}

/** Props for {@link WindowFrame}. */
export interface WindowFrameProps {
  /** The title bar at the band's leading end (`TitleBar`), as wide as the sidebar. */
  readonly brand: ReactNode;
  /** The sidebar's pane (a `tree-pane`); none hides it, and the main pane takes the window's width. */
  readonly sidebar?: ReactNode;
  /** The sidebar's edge (`SidebarResizer`), beside it while it shows. */
  readonly resizer?: ReactNode;
  /**
   * The sidebar's width in pixels, which the title bar matches, and which it
   * keeps while the sidebar is hidden so no tab moves.
   */
  readonly sidebarWidth: number;
  /** The main pane, whose tab row rises into the band beside the title bar. */
  readonly main: ReactNode;
  /** A strip that takes its turn under the main pane (files being imported). */
  readonly tray?: ReactNode;
  /** The dock under the main pane (a console, a log). */
  readonly dock?: ReactNode;
  /** The key legend across the window's foot (`KeyLegendStrip`). */
  readonly legend?: ReactNode;
  /**
   * What stands at the band's trailing end, out of the drag region (the
   * `UpdatePill`), for a window whose main pane has no tabs; a pane with
   * tabs takes it as `PaneTabs`' `trailing` instead.
   */
  readonly trailing?: ReactNode;
  /**
   * Gathers the sidebar, its edge, the main pane, the tray, and the dock in
   * one element with these handlers; none leaves them the frame's own children.
   */
  readonly group?: WindowFrameGroup;
}

/**
 * The window's grid: the top band (the title bar at the sidebar's width,
 * then the main pane's tabs), the sidebar and the main pane side by side on
 * the ground, the tray and the dock under the main pane while they show,
 * and the key legend across the foot. Each part fills its slot; the band's
 * empty end is the window's drag region. Hiding the sidebar gives its room
 * to the main pane, the tray, and the dock, and the main pane's tabs keep
 * their place beside the title bar. The frame is the space's root, in the
 * listing look: a column the panel's height that sizes every box by its
 * border and resets its buttons, code, fieldsets, and legends.
 */
export function WindowFrame({
  brand,
  sidebar = null,
  resizer = null,
  sidebarWidth,
  main,
  tray = null,
  dock = null,
  legend = null,
  trailing = null,
  group
}: WindowFrameProps): ReactElement {
  const shown = drawn(sidebar);
  const parts = (
    <>
      {shown ? <div className="window-frame-slot window-frame-sidebar">{sidebar}</div> : null}
      {shown ? resizer : null}
      <div className="window-frame-slot window-frame-main">{main}</div>
      {drawn(tray) ? <div className="window-frame-slot window-frame-tray">{tray}</div> : null}
      {drawn(dock) ? <div className="window-frame-slot window-frame-dock">{dock}</div> : null}
    </>
  );

  return (
    <ListingScopeContext value>
      <div
        className="window-frame space-root listing-root"
        data-sidebar={shown ? 'shown' : 'hidden'}
        style={{ '--window-band-width': `${sidebarWidth}px` } as CSSProperties}
      >
        <div className="window-frame-band">
          <div className="window-frame-band-lead">{brand}</div>
          <span aria-hidden className="window-frame-band-rest" />
          {drawn(trailing) ? <div className="shell-trailing">{trailing}</div> : null}
        </div>
        {group === undefined ? (
          parts
        ) : (
          <div className="window-frame-group" {...group}>
            {parts}
          </div>
        )}
        {drawn(legend) ? <div className="window-frame-legend">{legend}</div> : null}
      </div>
    </ListingScopeContext>
  );
}
