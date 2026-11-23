import { useContext, type ReactElement, type ReactNode } from 'react';

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
 * do not cover. Draws `.pane-message` (`.danger`, `.warning`, `.empty`).
 */
export function PaneMessage({ children, tone, live = false }: PaneMessageProps): ReactElement {
  const scoped = useContext(ListingScopeContext);
  const message = (
    <p
      className={tone === undefined ? 'pane-message' : `pane-message ${tone}`}
      role={live ? 'status' : undefined}
    >
      {children}
    </p>
  );

  return scoped ? message : <div className="listing-root">{message}</div>;
}
