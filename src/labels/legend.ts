/**
 * The words a key legend strip says around the verbs it lists: its own
 * name, the name of its verb group, the spoken name of one key cap of a
 * pair, and the overflow chip's spoken count. The verbs' labels and a
 * pair's shared label are the app's (`KeyLegendStrip` props), never here.
 */
export interface LegendLabels {
  /** The strip's accessible name: "Keyboard shortcuts". */
  readonly label: string;
  /** The accessible name of the group that holds the verbs: "Verbs". */
  readonly verbs: string;
  /**
   * The accessible name of one key cap in a paired place, which shows no
   * label of its own: the chord in words, then the verb ("Up Move Up").
   */
  readonly capName: (chord: string, verb: string) => string;
  /** The overflow chip's spoken name for the `count` verbs it holds: "3 more shortcuts". */
  readonly more: (count: number) => string;
}

/** English legend words: the `legend` group `UiokProvider` starts from. */
export const DEFAULT_LEGEND_LABELS: LegendLabels = {
  label: 'Keyboard shortcuts',
  verbs: 'Verbs',
  capName: (chord, verb) => `${chord} ${verb}`,
  more: (count) => (count === 1 ? '1 more shortcut' : `${count} more shortcuts`)
};
