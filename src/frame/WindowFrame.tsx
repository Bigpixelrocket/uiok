import type { CSSProperties, ReactElement, ReactNode } from 'react';

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
  /** The frame's own class, beside `window-frame` (the space's root class). */
  readonly className?: string;
}

/**
 * The window's grid: the top band (the title bar at the sidebar's width,
 * then the main pane's tabs), the sidebar and the main pane side by side on
 * the ground, the tray and the dock under the main pane while they show,
 * and the key legend across the foot. Each part fills its slot; the band's
 * empty end is the window's drag region. Hiding the sidebar gives its room
 * to the main pane, the tray, and the dock, and the main pane's tabs keep
 * their place beside the title bar.
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
  className
}: WindowFrameProps): ReactElement {
  const shown = sidebar !== null && sidebar !== undefined && sidebar !== false;

  return (
    <div
      className={className === undefined ? 'window-frame' : `window-frame ${className}`}
      data-sidebar={shown ? 'shown' : 'hidden'}
      style={{ '--window-band-width': `${sidebarWidth}px` } as CSSProperties}
    >
      <div className="window-frame-band">
        <div className="window-frame-band-lead">{brand}</div>
        <span aria-hidden className="window-frame-band-rest" />
      </div>
      {shown ? <div className="window-frame-slot window-frame-sidebar">{sidebar}</div> : null}
      {shown ? resizer : null}
      <div className="window-frame-slot window-frame-main">{main}</div>
      {tray === null ? null : <div className="window-frame-slot window-frame-tray">{tray}</div>}
      {dock === null ? null : <div className="window-frame-slot window-frame-dock">{dock}</div>}
      {legend === null ? null : <div className="window-frame-legend">{legend}</div>}
    </div>
  );
}
