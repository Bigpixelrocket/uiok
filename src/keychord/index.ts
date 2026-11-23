/**
 * `KeyChord`: a chord drawn as key caps, named in words for assistive
 * technology; `KeyChords`, several chords for one verb parted by "or";
 * `ShortcutIndex` with `ShortcutGroup` and `ShortcutRow`, every
 * key a window answers in groups whose chords share one column.
 */

export {
  KeyChord,
  KeyChords,
  type KeyChordProps,
  type KeyChordsProps,
  type KeyChordTone
} from './KeyChord.js';
export {
  ShortcutGroup,
  ShortcutIndex,
  ShortcutRow,
  type ShortcutGroupProps,
  type ShortcutIndexProps,
  type ShortcutRowProps
} from './ShortcutIndex.js';
