/** One of a pager's four steps: to the first page, the one before, the one after, the last. */
export type PagerStep = 'begin' | 'previous' | 'next' | 'end';

/** English digit grouping for the page numbers the default pager labels write ("1,024"). */
const englishCount = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** The English word for each step, as it opens a step's accessible name. */
const STEP_WORDS: Readonly<Record<PagerStep, string>> = {
  begin: 'Begin',
  previous: 'Previous',
  next: 'Next',
  end: 'End'
};

/**
 * The words a pager repeats on every list: its steps' names, the accessible
 * names of the pager, its steps, and its page menu, and each page's entry
 * in that menu.
 *
 * The functions take the pager's `kind`, the caller's word for what the
 * pages are of ("rows", or a code an app maps to its own inflected noun),
 * so a language that inflects the noun by its sentence can. Page numbers
 * arrive as raw numbers, so an app formats them for its locale.
 */
export interface PagerLabels {
  /** The first page's step, its tooltip or its word: "Begin". */
  readonly begin: string;
  /** The page before's step: "Previous". */
  readonly previous: string;
  /** The page after's step: "Next". */
  readonly next: string;
  /** The last page's step: "End". */
  readonly end: string;
  /** The pager's accessible name: "Pages of rows". */
  readonly pages: (kind: string) => string;
  /** The page menu's accessible name: "Page of rows". */
  readonly page: (kind: string) => string;
  /** A step's accessible name: "Next page of rows". */
  readonly step: (step: PagerStep, kind: string) => string;
  /** A page's entry in the page menu, both numbers from 1: "3 of 12". */
  readonly pageOption: (page: number, pages: number) => string;
}

/** English pager words: the `pager` group `UiokProvider` starts from. */
export const DEFAULT_PAGER_LABELS: PagerLabels = {
  begin: STEP_WORDS.begin,
  previous: STEP_WORDS.previous,
  next: STEP_WORDS.next,
  end: STEP_WORDS.end,
  pages: (kind) => `Pages of ${kind}`,
  page: (kind) => `Page of ${kind}`,
  step: (step, kind) => `${STEP_WORDS[step]} page of ${kind}`,
  pageOption: (page, pages) => `${englishCount.format(page)} of ${englishCount.format(pages)}`
};
