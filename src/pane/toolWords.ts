/**
 * The word step a path bar and a fitted toolbar share: when their quiet
 * actions say their verbs with their glyphs alone, each one without a
 * tooltip of its own takes its word (`data-word`) as one, marked
 * `data-word-tip` with the word it gave, so the next fit takes back exactly
 * what it gave and never a tooltip the host has written since.
 * Internal to the pane area; not part of the package's surface.
 */

/**
 * Takes back every word tooltip a fit gave under `root`: a tooltip still
 * the word it gave goes; one the host has written since (a new `tip`)
 * stays.
 */
export function clearWordTips(root: HTMLElement): void {
  for (const act of root.querySelectorAll<HTMLElement>('[data-word-tip]')) {
    if (act.dataset.tooltip === act.dataset.wordTip) delete act.dataset.tooltip;
    delete act.dataset.wordTip;
  }
}

/**
 * Gives each action whose word the fit hides that word as its tooltip,
 * leaving an action that has a tooltip of its own (a `tip`) as it is.
 */
export function giveWordTips(acts: Iterable<HTMLElement>): void {
  for (const act of acts) {
    if (act.hasAttribute('data-tooltip') || act.dataset.word === undefined) continue;
    act.dataset.wordTip = act.dataset.word;
    act.dataset.tooltip = act.dataset.word;
  }
}
