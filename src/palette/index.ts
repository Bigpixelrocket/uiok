/**
 * Palettes: `Palette`, the modal frame (backdrop, box, Escape, focus kept in
 * the field), `PaletteQuery`, its query row with the level chip, count,
 * and refusal, and its rows: `PaletteList` of `PaletteOption`s under
 * `PaletteHeading`s, with `PaletteNote`, and `PaletteNotes` holding notes
 * and a `PaletteFailure` under the list. Styled by palette.css over the menu look, under `.listing-root`.
 */

export {
  Palette,
  PaletteQuery,
  type PaletteLevel,
  type PaletteProps,
  type PaletteQueryProps
} from './Palette.js';
export {
  PaletteFailure,
  PaletteHeading,
  PaletteList,
  PaletteNote,
  PaletteNotes,
  PaletteOption,
  type PaletteContextKind,
  type PaletteFailureProps,
  type PaletteHeadingProps,
  type PaletteListProps,
  type PaletteNoteProps,
  type PaletteNotesProps,
  type PaletteOptionProps
} from './PaletteRows.js';
