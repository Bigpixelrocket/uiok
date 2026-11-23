import { ArrowDownToLine, RotateCw, TriangleAlert } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '../button/Button.js';
import { ICON_MD } from '../icon/sizes.js';
import { describedTooltip } from '../tooltip/Tooltip.logic.js';

/**
 * Where an offered build stands, as the pill shows it: `offered` (found,
 * not yet downloaded, or downloading), `ready` (downloaded and verified,
 * installs on restart), or `download-failed`.
 */
export type UpdatePillState = 'offered' | 'ready' | 'download-failed';

/** Props for {@link UpdatePill}. */
export interface UpdatePillProps {
  readonly state: UpdatePillState;
  /** The pill's words ("Update", "Restart"). */
  readonly label: string;
  /** What the pill offers in full ("Update ready · 2.5.0"), its tooltip and accessible description. */
  readonly description?: string;
  /** Opens the place that carries the notes, the download, and the restart (Settings › Updates). */
  readonly onOpen: () => void;
}

/**
 * The title bar's update control, shown only while a build is offered: a
 * tonal Update with a download arrow, a solid Restart once the build is
 * ready, and a neutral pill with a warning outline and glyph after a failed
 * download. It never shows progress; its click opens the place that does.
 * The host shows it only while there is an offer and hands the focus back
 * to it when what it opened closes.
 */
export function UpdatePill({ state, label, description, onOpen }: UpdatePillProps): ReactElement {
  const Icon =
    state === 'ready' ? RotateCw : state === 'download-failed' ? TriangleAlert : ArrowDownToLine;

  return (
    <Button
      aria-haspopup="dialog"
      className="shell-update-pill"
      data-state={state}
      onClick={onOpen}
      variant={state === 'ready' ? 'primary' : state === 'download-failed' ? 'neutral' : 'tonal'}
      {...describedTooltip(description)}
    >
      <Icon aria-hidden size={ICON_MD} />
      {label}
    </Button>
  );
}
