/**
 * The words every dialog repeats whatever it asks: the leave verb's
 * defaults, the name of a confirmation's list of affected items, and the
 * line that counts the items such a list leaves out. A
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
   * The last line of a dialog's name list (`DialogNames`) that stops short
   * of its items, given how many it leaves out: "+3 more".
   */
  readonly moreItems: (count: number) => string;
}

/** English dialog words: the `dialog` group `UiokProvider` starts from. */
export const DEFAULT_DIALOG_LABELS: DialogLabels = {
  cancel: 'Cancel',
  clear: 'Clear',
  affectedItems: () => 'Affected items',
  moreItems: (count) => `+${count} more`
};
