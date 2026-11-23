import type { LucideIcon } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { Button } from '../button/Button.js';
import { Spinner } from '../icon/Spinner.js';
import { ICON_MD, ICON_SM } from '../icon/sizes.js';
import { drawn } from './WindowFrame.js';

/** Props of a part that only lays out what it holds. */
export interface PagePartProps {
  readonly children: ReactNode;
}

/** A page in the main pane (in its `PageSlot`): a column that fills the pane. */
export function PanePage({ children }: PagePartProps): ReactElement {
  return <div className="pane-page">{children}</div>;
}

/** Props for {@link Toolbar}. */
export interface ToolbarProps {
  /** Its tools, in order: each keeps its size but a `ToolbarGrow`; `ToolbarGap` parts two groups. */
  readonly children: ReactNode;
  /** A group at the toolbar's far end. */
  readonly end?: ReactNode;
}

/**
 * One line of tools that keep their size: a `ToolbarGrow` among them gives
 * way when the line is short, and `end` stands at the far end.
 */
export function Toolbar({ children, end }: ToolbarProps): ReactElement {
  return (
    <div className="pane-toolbar">
      {children}
      {drawn(end) ? <div className="pane-toolbar-end">{end}</div> : null}
    </div>
  );
}

/** A toolbar's item that gives way when the line is short (a field, a long name). */
export function ToolbarGrow({ children }: PagePartProps): ReactElement {
  return <div className="pane-toolbar-grow">{children}</div>;
}

/** A hairline between two groups of a toolbar's tools. */
export function ToolbarGap(): ReactElement {
  return <span aria-hidden className="pane-toolbar-gap" />;
}

/** A page's filter under its tab strip (a filter field, a query). */
export function PageFilter({ children }: PagePartProps): ReactElement {
  return <div className="pane-page-filter">{children}</div>;
}

/** Props for {@link PageNote}. */
export interface PageNoteProps {
  /** Its glyph, dim; none with `busy`. */
  readonly icon?: LucideIcon;
  /** Something is loading: the spinner stands for the glyph and the line is a status. */
  readonly busy?: boolean;
  /** Its words ("Loading services…", "No services yet."). */
  readonly children: ReactNode;
}

/**
 * A loading or empty line in a page, where its rows would be: its glyph or
 * spinner beside the words, from the rows' inset.
 */
export function PageNote({ icon: Icon, busy = false, children }: PageNoteProps): ReactElement {
  return (
    <p className="pane-message pane-page-note" role={busy ? 'status' : undefined}>
      {busy ? (
        <Spinner size={ICON_MD} />
      ) : Icon === undefined ? null : (
        <Icon aria-hidden size={ICON_MD} />
      )}
      <span>{children}</span>
    </p>
  );
}

/** The one command that answers an empty list (Add service), under its `PageNote`. */
export function EmptyAction({ children }: PagePartProps): ReactElement {
  return <div className="pane-empty-action">{children}</div>;
}

/** Props for {@link SectionHead}. */
export interface SectionHeadProps {
  /** Its words, set as an overline. */
  readonly children: ReactNode;
  /** Its heading level in the page's outline: 3 unless given. */
  readonly level?: 2 | 3 | 4;
}

/** A heading over one of a page's listings, in the rows' inset. */
export function SectionHead({ children, level = 3 }: SectionHeadProps): ReactElement {
  const Heading = `h${level}` as const;

  return <Heading className="pane-section-head overline">{children}</Heading>;
}

/** A bar at a pane's foot under its list: a select-all bar, a form's actions. */
export function FootBar({ children }: PagePartProps): ReactElement {
  return <div className="pane-foot-bar">{children}</div>;
}

/** A warning line under a pane's path bar, over its rows (a list cut short). */
export function PaneWarning({ children }: PagePartProps): ReactElement {
  return (
    <p className="pane-warning" role="status">
      {children}
    </p>
  );
}

/** Props for {@link ShowSidebarButton}. */
export interface ShowSidebarButtonProps {
  /** Its words ("Show panel"). */
  readonly label: string;
  readonly onShow: () => void;
  /** Its glyph before the words. */
  readonly icon?: LucideIcon;
}

/**
 * The tool that shows the hidden sidebar again, in the main pane's path
 * bar (among `PanePathBar`'s children), where it leads the bar's tools
 * before the page's facts.
 */
export function ShowSidebarButton({
  label,
  onShow,
  icon: Icon
}: ShowSidebarButtonProps): ReactElement {
  return (
    <Button className="window-frame-show-sidebar" onClick={onShow} size="small">
      {Icon === undefined ? null : <Icon aria-hidden size={ICON_SM} />}
      {label}
    </Button>
  );
}
