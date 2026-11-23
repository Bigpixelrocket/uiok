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
  /** The verb that acknowledges a settled outcome (`ProgressDialog`): "OK". */
  readonly ok: string;
  /** The leave verb of a dialog that asks nothing (an alert, `SettingsFileAlert`): "Close". */
  readonly close: string;
  /** The verb that ends work under way (`ProgressDialog`): "Stop". */
  readonly stop: string;
  /** The verb that starts again what could not start (`ProgressDialog`): "Try Again". */
  readonly tryAgain: string;
  /** The verb that puts a progress dialog away while its work goes on: "Run in Background". */
  readonly runInBackground: string;
  /** The note under a typed-name confirmation's field (`TypedNameDialog`): "Type the name to confirm." */
  readonly typeName: string;
}

/** English dialog words: the `dialog` group `UiokProvider` starts from. */
export const DEFAULT_DIALOG_LABELS: DialogLabels = {
  cancel: 'Cancel',
  clear: 'Clear',
  affectedItems: () => 'Affected items',
  moreItems: (count) => `+${count.toLocaleString('en-US')} more`,
  itemCount: (count) => (count === 1 ? '1 item' : `${count.toLocaleString('en-US')} items`),
  ok: 'OK',
  close: 'Close',
  stop: 'Stop',
  tryAgain: 'Try Again',
  runInBackground: 'Run in Background',
  typeName: 'Type the name to confirm.'
};
