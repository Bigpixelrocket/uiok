import type { ReactElement, ReactNode } from 'react';

/** Props for {@link AboutWindow}. */
export interface AboutWindowProps {
  /** The app icon's URL: the round patch on a transparent canvas, drawn at 128px. */
  readonly icon: string;
  /** The product's `Lockup`, without its mark (the icon stands above it). */
  readonly lockup: ReactNode;
  /** The channel's name on a build that is not the release, as a `channel-tag`; none on the release. */
  readonly channelTag?: string | null;
  /** The channel the window wears (`data-channel`), which colours the tag; none on the release. */
  readonly channel?: string | null;
  /** The version line, the one line a reader may select. */
  readonly version?: string | null;
}

/**
 * The About window's one panel: the app's icon, the lockup with the
 * channel tag of a build that is not the release, and the version. A fixed
 * frame the window's height that never scrolls; the panel drags the window
 * under a hidden title bar, all but the version line.
 */
export function AboutWindow({
  icon,
  lockup,
  channelTag = null,
  channel = null,
  version = null
}: AboutWindowProps): ReactElement {
  return (
    <main className="about-window" data-channel={channel ?? undefined}>
      <img alt="" className="about-icon" src={icon} />
      <div className="about-lockup">
        {lockup}
        {channelTag ? <span className="channel-tag">{channelTag}</span> : null}
      </div>
      {version ? <p className="about-version">{version}</p> : null}
    </main>
  );
}
