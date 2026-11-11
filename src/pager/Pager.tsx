import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { ReactElement } from 'react';

import { ICON_SM } from '../icon/index.js';
import type { PagerStep } from '../labels/pager.js';
import { useLabels } from '../labels/UiokProvider.js';
import type { LinkLook } from '../pane/PaneActions.js';
import { tooltip } from '../tooltip/Tooltip.logic.js';
import { selectorPages } from './Pager.logic.js';

/** Props for {@link Pager}. */
export interface PagerProps {
  /**
   * What the pages are of, passed to every `pager` label so each sentence
   * can inflect its noun; the English defaults read it as a plural noun
   * ("rows"). "items" unless given.
   */
  readonly kind?: string;
  /** The page shown, from 0. */
  readonly page: number;
  /** How many pages the list has, or has so far when `endKnown` is false. */
  readonly pages: number;
  /** Called with the page (from 0) a step or the menu asks for. */
  readonly onPage: (page: number) => void;
  /** Whether `pages` is every page, so End can go to the last; false hides it. */
  readonly endKnown?: boolean;
  /** Whether a page after this one can be reached; false hides Next and End. */
  readonly forward?: boolean;
  /** How the steps draw: icons (the default), words, or both. */
  readonly look?: LinkLook;
  /**
   * The pager's height, to match the row it sits in: `inline` (20px steps
   * and menu) in a status line or row, the default; `small` (24px) in a
   * toolbar of 24px fields and selects.
   */
  readonly size?: 'inline' | 'small';
}

/** Each step's icon. */
const STEP_ICONS: Readonly<Record<PagerStep, typeof ChevronLeft>> = {
  begin: ChevronsLeft,
  previous: ChevronLeft,
  next: ChevronRight,
  end: ChevronsRight
};

/**
 * The pager of a long list, in the listing look: Begin and Previous while
 * a page precedes the one shown, a menu of page numbers (all of them, or a
 * sample of a long run, `selectorPages`), then Next and End while a page
 * follows. It draws nothing for a list of one page. Its steps are reached
 * by the pointer and Tab; the keys that page the list stay the caller's. A
 * list whose last page is not known yet (one counted only so far) offers
 * no End, and a page that cannot be passed (`forward` false) offers neither
 * Next nor End. `look` draws its steps as icons (named on hover), words,
 * or both. A step that cannot act from the page shown stays in its place,
 * disabled and faded as every disabled control is, so the menu and the
 * other steps never move under the pointer between clicks. Words and names
 * come from the `pager` labels.
 */
export function Pager({
  kind = 'items',
  page,
  pages,
  onPage,
  endKnown = true,
  forward = true,
  look = 'icons',
  size = 'inline'
}: PagerProps): ReactElement | null {
  const labels = useLabels().pager;

  if (pages <= 1) return null;

  const first = page === 0;
  const last = page >= pages - 1 || !forward;
  const step = (name: PagerStep, to: number, shown: boolean): ReactElement => {
    const Icon = STEP_ICONS[name];
    const word = labels[name];

    return (
      <button
        aria-label={labels.step(name, kind)}
        className={look === 'icons' ? 'pager-step' : 'pager-step worded'}
        disabled={!shown}
        onClick={() => onPage(to)}
        type="button"
        {...(look === 'icons' && shown ? tooltip(word) : {})}
      >
        {look !== 'text' && <Icon aria-hidden size={ICON_SM} />}
        {look !== 'icons' && word}
      </button>
    );
  };

  return (
    <nav
      aria-label={labels.pages(kind)}
      className={size === 'small' ? 'pager pager-small' : 'pager'}
    >
      {step('begin', 0, !first)}
      {step('previous', page - 1, !first)}
      <select
        aria-label={labels.page(kind)}
        className={size === 'small' ? 'field field-sm pager-page' : 'field field-xs pager-page'}
        onChange={(event) => onPage(Number(event.currentTarget.value) - 1)}
        value={page + 1}
      >
        {selectorPages(pages, page + 1).map((number) => (
          <option key={number} value={number}>
            {labels.pageOption(number, pages)}
          </option>
        ))}
      </select>
      {step('next', page + 1, !last)}
      {step('end', pages - 1, !last && endKnown)}
    </nav>
  );
}
