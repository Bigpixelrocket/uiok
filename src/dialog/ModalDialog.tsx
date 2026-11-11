import type { LucideIcon } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode
} from 'react';
import { createPortal } from 'react-dom';

import { isKeyKept } from '../keyboard/BrowserKeys.js';
import { isTextEditingTarget } from '../keyboard/Keyboard.logic.js';
import { tooltip } from '../tooltip/Tooltip.logic.js';
import { DialogLayerContext } from './DialogLayer.js';
import { DialogLegend } from './DialogLegend.js';
import { legendKeyAction, type DialogLegendModel } from './DialogLegend.logic.js';

/**
 * The colour a dialog wears on its title strip's rule and icon: the accent
 * by default, the danger colour for a destructive question (which also
 * lights its primary in it), the warning colour for a warning question.
 */
export type DialogTone = 'accent' | 'danger' | 'warning';

/** Whether a key comes from a text field holding text, which keeps its deletion chords. */
const isFilledField = (target: EventTarget): boolean => {
  if (!isTextEditingTarget(target)) {
    return false;
  }

  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
    ? target.value !== ''
    : (target as Element).textContent !== '';
};

/**
 * The controls Tab visits inside a dialog, in order. Disabled controls
 * (`:disabled`, so those inside a disabled fieldset too) and hidden inputs
 * take no focus, so they must not anchor the cycle, and neither does
 * anything taken out of the Tab order (the legend's slots); focusable scroll
 * regions (a long path list) join it so they stay reachable.
 */
const tabbableIn = (dialog: HTMLElement): HTMLElement[] => [
  ...dialog.querySelectorAll<HTMLElement>(
    ':is(button, input:not([type="hidden"]), select, textarea, a[href], [tabindex="0"]):not(:disabled):not([tabindex="-1"])'
  )
];

/**
 * Keeps Tab inside `container`: Tab moves to its next control and Shift-Tab
 * to its previous one, wrapping at either end, so keyboard focus cannot
 * escape to what lies behind a modal surface. A control that refuses the
 * focus (hidden by a stylesheet, inert) is passed over for the one after it
 * in the same direction, each tried at most once, so Tab never stalls on
 * it. With nothing tabbable inside, Tab stays put. Any other key passes
 * through. For a modal surface that is not a `ModalDialog` (a palette),
 * called from its keydown handler.
 */
export const containTab = (event: KeyboardEvent<HTMLElement>, container: HTMLElement): void => {
  if (event.key !== 'Tab') {
    return;
  }

  const { ownerDocument } = event.currentTarget;
  const active = ownerDocument.activeElement;
  const focusable = tabbableIn(container);

  // With nothing tabbable (a progress dialog before its log has a line),
  // Tab stays put; letting it through would reach the page behind.
  event.preventDefault();

  if (focusable.length === 0) {
    return;
  }

  const count = focusable.length;
  const index = focusable.indexOf(active as HTMLElement);
  const delta = event.shiftKey ? -1 : 1;
  // From the container itself, Tab enters at the first control and Shift-Tab at the last.
  const first = index === -1 ? (event.shiftKey ? count - 1 : 0) : index + delta;

  // The browser's own move is prevented, so a candidate that ignores focus()
  // would hold Tab where it is; try the next one until the focus moves.
  for (let step = 0; step < count; step += 1) {
    focusable[(((first + step * delta) % count) + count) % count]?.focus();

    if (ownerDocument.activeElement !== active) {
      return;
    }
  }
};

/**
 * Lets a dialog rendered inside another (a confirmation portalled from its
 * body) tell the enclosing one that it holds the focus: claim when it
 * mounts, release when it unmounts. Child effects run first, so an inner
 * dialog mounted in the same commit claims before the enclosing dialog's
 * own mount effect would take the focus back. A dialog opened later on top,
 * nested or not, is unaffected: the enclosing dialog has already mounted.
 */
const NestedFocusContext = createContext<((claim: boolean) => void) | null>(null);

/** Props for {@link ModalDialog}; content renders below the title strip. */
export interface ModalDialogProps {
  /**
   * What the dialog does: words, or a line that names a file cut so the
   * name keeps its end, so a long name's extension and the words after it
   * stay in the strip. A string title is also its own tooltip.
   */
  readonly title: ReactNode;
  /** Heading element id, unique per dialog, wired to `aria-labelledby`. */
  readonly labelId: string;
  /**
   * The id of the body element that says what the dialog is about, wired to
   * `aria-describedby`, so a screen reader reads it with the title (a
   * confirmation's message); none when the title says it all.
   */
  readonly describedBy?: string;
  /** Extra class on the dialog box for dialog-specific layout (its width). */
  readonly className?: string;
  /** The verb's icon at the start of the title strip, drawn in the tone's colour. */
  readonly icon?: LucideIcon;
  /** The title strip's colour; `accent` unless given. */
  readonly tone?: DialogTone;
  /**
   * The strip's context, pushed to its right edge and cut short with an
   * ellipsis: where the dialog acts (`~/Developer/app`, with the home
   * folder as `~`), or the item it asks about. Left out when the dialog has
   * nothing to say there. A string context is also its own tooltip.
   */
  readonly titleAside?: ReactNode;
  /**
   * Frost the window behind the dialog. Off by default: a dialog that asks
   * about what is on screen (renaming a file, adding a record) is part of
   * that context, so the page behind it must stay readable while it asks.
   * Only a self-contained overlay (a shortcuts list, settings) turns it on.
   */
  readonly frosted?: boolean;
  /**
   * Keep the box's top edge where it opened, centred, so a body that grows
   * while it is open (a table of pending changes) extends it downward
   * instead of moving what is above it under the pointer; a window resize
   * centres it again. Off by default: every other dialog stays centred as
   * its body changes.
   */
  readonly pinTop?: boolean;
  /**
   * The key legend footer, drawn last and bound to its keys while the
   * dialog is open. A dialog without one draws its own last row.
   */
  readonly legend?: DialogLegendModel;
  /** Escape, and the esc slot: the dialog's way out. */
  readonly onCancel: () => void;
  /**
   * A press outside the box, where it does something other than Escape: a
   * dialog whose Escape asks before it ends work (a progress dialog's
   * Cancel) puts itself away on an outside press instead. Left out, an
   * outside press runs `onCancel`.
   */
  readonly onOutsidePress?: () => void;
  /** The body, between the title strip and the legend. */
  readonly children: ReactNode;
  /**
   * The element the dialog mounts into, for a dialog that must paint above
   * something it is drawn inside (a pane that isolates its layers). Left
   * out, the dialog mounts into the enclosing `DialogLayer`, or in place
   * when there is none. Rules scoped under an element reach the dialog only
   * when the container is inside it.
   */
  readonly container?: Element;
}

/**
 * The modal frame every dialog shares: the backdrop over the whole window
 * that swallows clicks and cancels on an outside press (or runs
 * `onOutsidePress`), Escape-cancels (with or without an esc slot drawn, so
 * a dialog whose primary already does what Escape would still leaves on
 * it), dialog ARIA semantics, Tab focus containment, the title strip (icon,
 * title, context), and the key legend footer with its keys. The backdrop is
 * clear unless `frosted` is set, so the page stays in view behind the
 * dialog. Its `aria-modal="true"` is the overlay contract's modal cue
 * (`MODAL_SELECTOR`), which an app shell reads to mute its own chords while
 * the dialog is open. The dialog itself takes focus when it opens with
 * nothing inside focused, so its keys work before any control is chosen.
 * With `pinTop` the box keeps the top edge it opened at. It mounts into
 * `container` when given, else into the enclosing `DialogLayer`, else in
 * place. Dialogs supply only their content and verbs.
 *
 * Styled by the `.dialog-backdrop` and `.dialog` rules in `@bigpixelrocket/uiok/styles.css`
 * (`docs/components/dialog.md`); a caller sets only a dialog's size and its
 * body's layout, through `className`.
 */
export function ModalDialog({ container, ...frame }: ModalDialogProps): ReactElement | null {
  const layer = useContext(DialogLayerContext);
  const target = container ?? layer;

  // A layer whose element is not in the document yet: the dialog waits one
  // commit for it rather than open in place and move.
  if (target === null) {
    return null;
  }

  return target === undefined ? (
    <DialogFrame {...frame} />
  ) : (
    createPortal(<DialogFrame {...frame} />, target)
  );
}

/** The dialog itself, wherever `ModalDialog` mounts it. */
function DialogFrame({
  title,
  labelId,
  describedBy,
  className,
  icon: Icon,
  tone = 'accent',
  titleAside,
  frosted = false,
  pinTop = false,
  legend,
  onCancel,
  onOutsidePress = onCancel,
  children
}: Omit<ModalDialogProps, 'container'>): ReactElement {
  const dialogRef = useRef<HTMLDivElement>(null);
  const claimEnclosingFocus = useContext(NestedFocusContext);
  // How many dialogs nested inside this one hold the focus; a count, since
  // StrictMode mounts, cleans up, and mounts each effect again.
  const nestedFocusClaims = useRef(0);
  const claimNestedFocus = useCallback((claim: boolean): void => {
    nestedFocusClaims.current += claim ? 1 : -1;
  }, []);
  // The top edge the centred box opened at, in the backdrop; null while centred.
  const [pinnedTop, setPinnedTop] = useState<number | null>(null);

  // Read where the centring put the box before it paints, then hold it
  // there. The offset ignores the settle animation's transform.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;

    if (pinTop && pinnedTop === null && dialog) {
      setPinnedTop(Math.max(0, dialog.offsetTop));
    }
  }, [pinTop, pinnedTop]);

  const pinned = pinTop ? pinnedTop : null;

  // A resized window centres the box again, and the effect above pins it there.
  useEffect(() => {
    if (!pinTop) {
      return;
    }

    const recentre = (): void => setPinnedTop(null);

    window.addEventListener('resize', recentre);

    return () => window.removeEventListener('resize', recentre);
  }, [pinTop]);

  // A control that asked for focus as it mounted (a name field) keeps it, as
  // does a dialog nested inside this one that mounted with it; otherwise the
  // dialog holds it, so Return and Escape reach it.
  useEffect(() => {
    const dialog = dialogRef.current;

    if (
      dialog &&
      nestedFocusClaims.current === 0 &&
      !dialog.contains(dialog.ownerDocument.activeElement)
    ) {
      dialog.focus({ preventScroll: true });
    }

    if (!claimEnclosingFocus) {
      return;
    }

    claimEnclosingFocus(true);

    return () => claimEnclosingFocus(false);
  }, [claimEnclosingFocus]);

  // Modal focus containment: Tab cycles inside the dialog so keyboard focus
  // cannot escape to the page behind the backdrop.
  const containFocus = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (dialogRef.current) {
      containTab(event, dialogRef.current);
    }
  };

  return (
    <div
      className={frosted ? 'dialog-backdrop frosted' : 'dialog-backdrop'}
      onMouseDown={onOutsidePress}
    >
      <div
        aria-describedby={describedBy}
        aria-labelledby={labelId}
        aria-modal="true"
        className={className ? `dialog ${className}` : 'dialog'}
        data-pinned={pinned !== null || undefined}
        data-tone={tone}
        onKeyDown={(event) => {
          // React bubbles events through portals, so a dialog portalled from
          // inside this one (a confirmation) must not cancel or trap here.
          if (!event.currentTarget.contains(event.target as Node)) {
            return;
          }

          // An input method's keys belong to its composition.
          const composing = event.nativeEvent.isComposing || event.key === 'Process';

          if (event.key === 'Escape' && !composing) {
            onCancel();
          }

          const action =
            legend &&
            legendKeyAction(legend, {
              key: event.key,
              altKey: event.altKey,
              ctrlKey: event.ctrlKey,
              metaKey: event.metaKey,
              shiftKey: event.shiftKey,
              repeat: event.repeat,
              composing,
              // The browser-key guard's cancel of a document key (⌘R) keeps nothing.
              handled: isKeyKept(event.nativeEvent),
              // Only focusable elements take keys, so anything but the dialog
              // itself is a control in the body.
              fromControl: event.target !== event.currentTarget,
              // A pop-up menu opens on Return on macOS, as a button presses.
              fromReturnControl:
                event.target instanceof HTMLButtonElement ||
                event.target instanceof HTMLSelectElement ||
                isTextEditingTarget(event.target),
              fromFilledField: isFilledField(event.target)
            });

          if (action) {
            // Return must not also press the focused button or submit a field.
            event.preventDefault();

            if (action.kind === 'run') {
              action.run();
            }
          }

          containFocus(event);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        style={pinned === null ? undefined : { ['--dialog-top' as string]: `${pinned}px` }}
        tabIndex={-1}
      >
        <div className="dialog-heading">
          {Icon && <Icon aria-hidden className="dialog-icon" />}
          <h2 id={labelId} {...(typeof title === 'string' ? tooltip(title) : {})}>
            {title}
          </h2>
          {titleAside ? (
            <span
              className="dialog-context"
              {...(typeof titleAside === 'string' ? tooltip(titleAside) : {})}
            >
              {titleAside}
            </span>
          ) : null}
        </div>
        <NestedFocusContext value={claimNestedFocus}>{children}</NestedFocusContext>
        {legend && <DialogLegend legend={legend} onLeave={onCancel} />}
      </div>
    </div>
  );
}
