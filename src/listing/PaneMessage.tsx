import type { LucideIcon } from 'lucide-react';
import {
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode
} from 'react';

import { ICON_MD } from '../icon/sizes.js';
import { ListingScopeContext } from './ListingScope.js';

/**
 * A pane message's tone: `danger` a refusal or a failure, `warning` a state
 * that needs a second look, `empty` a list with no rows; a plain hint
 * otherwise.
 */
export type PaneMessageTone = 'danger' | 'warning' | 'empty';

/** Props for {@link PaneMessage}. */
export interface PaneMessageProps {
  /** Its words, a sentence, which may hold `<code>` for a name or a value. */
  readonly children: ReactNode;
  /** Its tone; a plain hint unless given. */
  readonly tone?: PaneMessageTone;
  /**
   * A glyph of the host's own leading the words, at `--icon-md`, the words
   * hanging in their own column beside it; in place of a tone's own glyph,
   * and in the tone's colour with one. An icon inside the sentence ("Press
   * the play glyph to run") is part of the words, not this.
   */
  readonly icon?: LucideIcon;
  /**
   * Makes it a live region (`status`) that assistive technology reads when
   * it changes, for a line that comes and goes with what the user does.
   */
  readonly live?: boolean;
}

/**
 * One line that says something about a listing, where its rows stand: a
 * hint, a refusal led by the danger glyph, a warning led by the warning
 * glyph, or the line of a list with no rows, in the interface face from the
 * rows' inset. Inside a listing, after one, or anywhere else: drawn
 * outside every listing scope (a page of the app's own, a popover), it
 * carries the scope itself (a `.listing-root` around it), as `Listing`
 * does, so it keeps its look. For what `Listing`'s `empty` and `PageNote`
 * do not cover. Draws `.pane-message` (`.danger`, `.warning`, `.empty`), its
 * words in one `.pane-message-text`, so a `Code` inside flows with them;
 * led by a glyph (`icon`, or an svg first in `children`), the box is also
 * `.pane-message-led`, the words hanging beside the glyph.
 */
export function PaneMessage({
  children,
  tone,
  live = false,
  icon: Icon
}: PaneMessageProps): ReactElement {
  const scoped = useContext(ListingScopeContext);
  const words = useRef<HTMLSpanElement>(null);
  // A glyph the host put first in `children` rather than in `icon`, as hosts
  // did before `icon`: led only by an svg that is the very first thing in
  // the words, blank space aside, so an icon inside the sentence is not.
  const [ledByChild, setLedByChild] = useState(false);

  useLayoutEffect(() => {
    // With `icon`, the first node is the component's own glyph: no child
    // leads, and nothing is kept for when `icon` goes.
    let first = Icon === undefined ? (words.current?.firstChild ?? null) : null;

    while (first !== null && first.nodeType === Node.TEXT_NODE && first.nodeValue?.trim() === '') {
      first = first.nextSibling;
    }
    const led = first !== null && first.nodeName.toLowerCase() === 'svg';

    setLedByChild((now) => (now === led ? now : led));
  }, [Icon, children]);

  const led = Icon !== undefined || ledByChild;
  const message = (
    <p
      className={tone === undefined ? 'pane-message' : `pane-message ${tone}`}
      role={live ? 'status' : undefined}
    >
      {/* One box for the sentence, so its text runs and inline code flow
          as one line of words in the message's flex row. */}
      <span
        className={led ? 'pane-message-text pane-message-led' : 'pane-message-text'}
        ref={words}
      >
        {Icon === undefined ? null : <Icon aria-hidden size={ICON_MD} />}
        {children}
      </span>
    </p>
  );

  return scoped ? message : <div className="listing-root">{message}</div>;
}
