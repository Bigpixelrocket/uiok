import type { LucideIcon } from 'lucide-react';
import { useId, type ReactElement, type ReactNode } from 'react';

import { useLabels } from '../labels/UiokProvider.js';
import { RunHeader, type RunHeaderProps } from '../run/RunHeader.js';
import { isSettledRun } from '../run/RunProgress.logic.js';
import { ModalDialog } from './ModalDialog.js';

/** Props for {@link ProgressDialog}. */
export interface ProgressDialogProps {
  /** Names the page or the action ("Export", "Install PostgreSQL 18"). */
  readonly title: string;
  readonly icon: LucideIcon;
  /** The header: the run's state, its one-line headline, figure, bar, facts, and a failure's reason. */
  readonly run: RunHeaderProps;
  /** Stop was asked and the run has not settled yet: Stop dims and the headline is the caller's "Stopping…". */
  readonly stopping?: boolean;
  /** Ends the run; absent for a run that cannot stop. */
  readonly onStop?: () => void;
  /** Puts the dialog away while the run goes on; absent for a run nothing else can follow. */
  readonly onBackground?: () => void;
  /** OK, once the run settled; Cancel on a run that could not start. */
  readonly onClose: () => void;
  /** Starts the run again after it could not start (its file could not be read, say). */
  readonly onTryAgain?: () => void;
  /** What the body holds under the header: the run's lists, notes, or console. */
  readonly children?: ReactNode;
  /**
   * The element the dialog mounts into, for a dialog that must paint above
   * something it is drawn inside; the enclosing `DialogLayer` otherwise
   * (`ModalDialog`'s `container`).
   */
  readonly container?: Element;
}

/**
 * The progress dialog of long work: `ModalDialog` at the medium size,
 * opening its body with `RunHeader`, with the legend the run's state gives:
 * while it runs, Escape is Stop (dimmed while stopping) and Return is Run in
 * Background where the caller can follow the run elsewhere (`onBackground`);
 * settled (done, stopped, failed), OK alone on Return and Escape; a run that
 * could not start (`onTryAgain` with a failed run), Cancel and Try Again.
 * The header's glyph and bar carry a failure; a press outside the box
 * never stops the run. Verbs from `UiokLabels.dialog`.
 */
export function ProgressDialog({
  title,
  icon,
  run,
  stopping = false,
  onStop,
  onBackground,
  onClose,
  onTryAgain,
  children,
  container
}: ProgressDialogProps): ReactElement {
  const labels = useLabels().dialog;
  const labelId = useId();
  const settled = isSettledRun(run.state);
  const couldNotStart = onTryAgain !== undefined && run.state === 'failed';

  const legend = couldNotStart
    ? { leave: { label: labels.cancel }, primary: { label: labels.tryAgain, onRun: onTryAgain } }
    : settled
      ? { primary: { label: labels.ok, onRun: onClose } }
      : {
          ...(onStop === undefined ? {} : { leave: { label: labels.stop, disabled: stopping } }),
          ...(onBackground === undefined
            ? {}
            : {
                primary: { label: labels.runInBackground, onRun: onBackground, disabled: stopping }
              })
        };

  return (
    <ModalDialog
      className="dialog-size-md"
      container={container}
      icon={icon}
      labelId={labelId}
      legend={legend}
      onCancel={() => {
        if (settled || couldNotStart) onClose();
        else if (!stopping) onStop?.();
      }}
      onOutsidePress={() => undefined}
      title={title}
    >
      <RunHeader {...run} />
      {children}
    </ModalDialog>
  );
}
