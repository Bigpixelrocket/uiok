/**
 * The words a pane's tab strip repeats whatever its tabs hold: New Tab, a
 * tab's close control and picked state, the pinned and unsaved marks, and
 * the folded tabs' count and menu. A tab's name and tooltip are its own.
 */
export interface PaneTabsLabels {
  /** The New Tab button's accessible name and tooltip: "New Tab". */
  readonly newTab: string;
  /** A tab's close control, given the tab's name: "Close orders". */
  readonly close: (name: string) => string;
  /** A tab picked beside the one in front, given its name: "orders, picked". */
  readonly picked: (name: string) => string;
  /** What a pinned tab's description adds: "Pinned". */
  readonly pinned: string;
  /** What a tab holding changes not saved adds, its mark's meaning: "Changes not saved". */
  readonly notSaved: string;
  /**
   * The folded tabs' count, its tooltip and description, given how many
   * tabs folded and how many of them hold changes not saved:
   * "6 tabs folded here, 1 with changes not saved".
   */
  readonly folded: (count: number, dirty: number) => string;
  /** The heading of the folded tabs' menu: "Folded here". */
  readonly foldedHeading: string;
  /**
   * The folded tabs' count's accessible name, given how many folded: what it
   * shows and what a press opens, "6 more tabs". Optional, so a group written
   * whole before it came still type-checks; the English words stand in when
   * it is absent.
   */
  readonly foldedName?: (count: number) => string;
}

/** English tab strip words: the `paneTabs` group `UiokProvider` starts from. */
export const DEFAULT_PANE_TABS_LABELS: Required<PaneTabsLabels> = {
  newTab: 'New Tab',
  close: (name) => `Close ${name}`,
  picked: (name) => `${name}, picked`,
  pinned: 'Pinned',
  notSaved: 'Changes not saved',
  folded: (count, dirty) =>
    `${count.toLocaleString('en-US')} ${count === 1 ? 'tab' : 'tabs'} folded here${
      dirty > 0 ? `, ${dirty.toLocaleString('en-US')} with changes not saved` : ''
    }`,
  foldedHeading: 'Folded here',
  foldedName: (count) => `${count.toLocaleString('en-US')} more ${count === 1 ? 'tab' : 'tabs'}`
};
