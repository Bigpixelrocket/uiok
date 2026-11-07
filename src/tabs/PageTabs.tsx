import type { LucideIcon } from 'lucide-react';
import { useRef, type KeyboardEvent, type ReactElement } from 'react';

import type { LinkLook } from '../pane/PaneActions.js';
import { tooltip } from '../tooltip/Tooltip.logic.js';

/** One tab of a page's strip. */
export interface PageTab<Id extends string> {
  /** Names the tab to `onSelect`; also its `data-page-tab` attribute. */
  readonly id: Id;
  /** The tab's name. */
  readonly label: string;
  /** The tab's icon. */
  readonly icon: LucideIcon;
}

/** Props for {@link PageTabs}, over the type of its tab ids. */
export interface PageTabsProps<Id extends string> {
  /** The strip's accessible name, what it holds the tabs of ("Project pages"). */
  readonly label: string;
  /** The tabs, in the order they draw. */
  readonly tabs: readonly PageTab<Id>[];
  /** The tab whose page is shown, or null when the page shown is no tab's. */
  readonly current: Id | null;
  /** Called with the tab a click or an arrow key opens. */
  readonly onSelect: (id: Id) => void;
  /** Draws the second, smaller strip a tab's own pages take under the first. */
  readonly pills?: boolean;
  /** How each tab draws: its icon and name (the default), its name alone, or its icon alone, named on hover. */
  readonly look?: LinkLook;
}

/**
 * The tab strip a page draws under its path bar: one tab per page of the
 * level shown, in the order the caller gives, the current one marked. A
 * level's home page that is no tab of its own passes `current` as null, so
 * no tab is marked. A tablist with roving focus: Left and Right move
 * between tabs and open the one they reach, as a native tab bar does, and
 * keep those keys from any listing cursor around it; Tab enters on the
 * current tab. `pills` draws the second, smaller strip a tab's own pages
 * take under the first.
 */
export function PageTabs<Id extends string>({
  label,
  tabs,
  current,
  onSelect,
  pills = false,
  look = 'both'
}: PageTabsProps<Id>): ReactElement {
  const strip = useRef<HTMLDivElement>(null);
  const focusable = current ?? tabs[0]?.id ?? null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;

    const at = tabs.findIndex((tab) => tab.id === (event.target as HTMLElement).dataset.pageTab);
    const next = tabs[at + (event.key === 'ArrowLeft' ? -1 : 1)];

    event.preventDefault();
    // The tab keeps its arrows from the pane's cursor.
    event.stopPropagation();
    if (next === undefined) return;
    onSelect(next.id);
    strip.current?.querySelector<HTMLElement>(`[data-page-tab="${next.id}"]`)?.focus();
  };

  return (
    <div
      aria-label={label}
      className={pills ? 'page-tabs pills' : 'page-tabs'}
      onKeyDown={onKeyDown}
      ref={strip}
      role="tablist"
    >
      {tabs.map(({ id, label: name, icon: Icon }) => (
        <button
          aria-label={look === 'icons' ? name : undefined}
          aria-selected={id === current}
          className="page-tab"
          data-page-tab={id}
          key={id}
          onClick={() => onSelect(id)}
          role="tab"
          tabIndex={id === focusable ? 0 : -1}
          type="button"
          {...(look === 'icons' ? tooltip(name) : {})}
        >
          {look !== 'text' && <Icon aria-hidden size={13} />}
          {look !== 'icons' && <span>{name}</span>}
        </button>
      ))}
    </div>
  );
}
