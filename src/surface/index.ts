/**
 * Surfaces: `Notice`, an application's status line in a tone; `Card`, a
 * lifted panel for one subject's lines; `FactTable` of `FactRow`s, a page's
 * short table of facts with a state glyph each; `FactList` of `Fact`s, a
 * headed list of facts whose long values wrap whole, set side by side in
 * `FactColumns`; `GroupSwatch`, a group's
 * colour beside its name; and `Tag`, a small worded tag in a tone.
 */

export { Card, type CardProps } from './Card.js';
export {
  Fact,
  FactColumns,
  FactList,
  type FactColumnsProps,
  type FactListProps,
  type FactProps,
  type FactValueTone
} from './FactList.js';
export {
  FactRow,
  FactTable,
  type FactRowProps,
  type FactTableProps,
  type FactTone
} from './FactTable.js';
export { Notice, type NoticeProps, type NoticeTone } from './Notice.js';
export { GroupSwatch, type GroupSwatchProps } from './GroupSwatch.js';
export { Tag, type TagProps, type TagTone } from './Tag.js';
