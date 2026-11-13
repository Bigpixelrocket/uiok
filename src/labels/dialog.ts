/**
 * The words every dialog repeats whatever it asks: the leave verb's
 * defaults, the name of a confirmation's list of affected items, its count,
 * and the line that counts the items such a list leaves out. A
 * dialog's title, message, and verbs are its own props.
 */
export interface DialogLabels {
  /** The leave verb on Escape when a dialog names no other: "Cancel". */
  readonly cancel: string;
  /** Escape's verb while a filter field holds a query, which Escape empties first: "Clear". */
  readonly clear: string;
  /**
   * The accessible name of a confirmation's list of the items it touches,
   * given how many it lists: "Affected items".
   */
  readonly affectedItems: (count: number) => string;
  /**
   * The last line of a dialog's item list (`DialogItems`) that stops short
   * of its items, given how many it leaves out: "+3 more".
   */
  readonly moreItems: (count: number) => string;
  /**
   * How many things a confirmation's item list holds, read by assistive
   * technology after the dialog's lead and before the names: "3 items".
   */
  readonly itemCount: (count: number) => string;
}

/** English dialog words: the `dialog` group `UiokProvider` starts from. */
export const DEFAULT_DIALOG_LABELS: DialogLabels = {
  cancel: 'Cancel',
  clear: 'Clear',
  affectedItems: () => 'Affected items',
  moreItems: (count) => `+${count.toLocaleString('en-US')} more`,
  itemCount: (count) => (count === 1 ? '1 item' : `${count.toLocaleString('en-US')} items`)
};
