/**
 * The word step a path bar and a fitted toolbar share: when their quiet
 * actions say their verbs with their glyphs alone, each one without a
 * tooltip of its own takes its word (`data-word`) as one, marked
 * `data-word-tip` so the next fit can take back exactly what it gave.
 * Internal to the pane area; not part of the package's surface.
 */

/** Takes back every word tooltip a fit gave under `root`. */
export function clearWordTips(root: HTMLElement): void {
  for (const act of root.querySelectorAll<HTMLElement>('[data-word-tip]')) {
    delete act.dataset.wordTip;
    delete act.dataset.tooltip;
  }
}

/**
 * Gives each action whose word the fit hides that word as its tooltip,
 * leaving an action that has a tooltip of its own (a `tip`) as it is.
 */
export function giveWordTips(acts: Iterable<HTMLElement>): void {
  for (const act of acts) {
    if (act.hasAttribute('data-tooltip') || act.dataset.word === undefined) continue;
    act.dataset.wordTip = '';
    act.dataset.tooltip = act.dataset.word;
  }
}
