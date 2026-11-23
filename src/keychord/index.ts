/**
 * `KeyChord`: a chord drawn as key caps, named in words for assistive
 * technology; `ShortcutIndex` with `ShortcutGroup` and `ShortcutRow`, every
 * key a window answers in groups whose chords share one column.
 */

export { KeyChord, type KeyChordProps, type KeyChordTone } from './KeyChord.js';
export {
  ShortcutGroup,
  ShortcutIndex,
  ShortcutRow,
  type ShortcutGroupProps,
  type ShortcutIndexProps,
  type ShortcutRowProps
} from './ShortcutIndex.js';
