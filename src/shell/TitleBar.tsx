import type { ReactElement, ReactNode } from 'react';

import { describedTooltip } from '../tooltip/Tooltip.logic.js';

/** Props for {@link ChannelMarker}. */
export interface ChannelMarkerProps {
  /** The channel's name ("Latest", "Local"). */
  readonly label: string;
  /** The build number or the branch, the part that gives way to an ellipsis. */
  readonly detail?: string | null;
  /** The whole build line, the marker's tooltip and accessible description. */
  readonly title?: string;
  /**
   * The spoken words for a build with changes not yet committed, which the
   * marker shows as a dot after the detail; none for a clean build.
   */
  readonly modified?: string | null;
}

/**
 * The release channel after a lockup in the title bar, on a build that is
 * not the release: a dot in the channel's colour (`--channel`, which an
 * ancestor's `data-channel` sets), the channel's name, and its build number
 * or branch, small and quiet, so a screenshot always says which build it
 * shows without the bar shouting it. It takes pointer events inside the
 * bar's drag region, so its tooltip shows.
 */
export function ChannelMarker({
  label,
  detail = null,
  title,
  modified = null
}: ChannelMarkerProps): ReactElement {
  return (
    <span className="shell-channel" {...describedTooltip(title)}>
      <span aria-hidden className="shell-channel-dot" />
      <span className="shell-channel-name">{label}</span>
      {detail ? <span className="shell-channel-detail">{detail}</span> : null}
      {modified ? (
        <>
          <span aria-hidden className="shell-channel-modified">
            ●
          </span>
          <span className="visually-hidden">{modified}</span>
        </>
      ) : null}
    </span>
  );
}

/** Props for {@link TitleBar}. */
export interface TitleBarProps {
  /** The lockup and, on a build that is not the release, its `ChannelMarker`. */
  readonly children: ReactNode;
  /**
   * Whether the window's own buttons sit at the bar's leading end, as
   * macOS draws its traffic lights over a hidden title bar: the brand then
   * starts clear of them (`--traffic-light-inset`). Elsewhere the bar's
   * own padding stands there.
   */
  readonly trafficLights?: boolean;
}

/**
 * The window's title bar where the native one is hidden: the brand at its
 * leading end on the window's ground, painting nothing, so tabs beside it
 * stand on the same ground. The whole bar is a drag region (it moves the
 * window and a double click zooms it) except the channel marker; a narrow
 * bar cuts the marker's detail first, never the lockup.
 */
export function TitleBar({ children, trafficLights = false }: TitleBarProps): ReactElement {
  return (
    <header className="shell-topbar" data-traffic-lights={trafficLights ? '' : undefined}>
      <div className="shell-brand">{children}</div>
    </header>
  );
}
