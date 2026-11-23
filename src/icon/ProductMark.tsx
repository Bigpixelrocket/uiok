import type { LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactElement } from 'react';

import { tooltip } from '../tooltip/Tooltip.logic.js';
import { ICON_MD } from './sizes.js';

/**
 * A product's brand mark as data: what the app knows about a product (a
 * language, a database, a tool) and hands the library to draw. The library
 * ships no marks and no brand colours of its own.
 */
export interface ProductMarkShape {
  /** The product's name: the mark's tooltip, and its accessible name where it stands alone. */
  readonly title: string;
  /** The mark's path data, on a 24-unit square (`viewBox` changes the part shown). */
  readonly path: string;
  /**
   * The brand's colour as a CSS colour (`#777bb4`), or `currentColor` for a
   * mark published in plain black, which then follows the quiet icon tone.
   * The theme decides how much of it shows (`--product-mark-mix`).
   */
  readonly colour: string;
  /**
   * The part of the artwork to show, when a published mark pairs a symbol
   * with a wordmark that would not read at glyph size; `0 0 24 24` when
   * absent.
   */
  readonly viewBox?: string;
  /**
   * An outline drawn round the shape in its own colour, in viewBox units,
   * for a mark published in lines too fine to read at row size.
   */
  readonly stroke?: number;
}

/** Props for {@link ProductMark}. */
export interface ProductMarkProps {
  /** The product's mark; null or absent draws `fallback` instead. */
  readonly mark?: ProductMarkShape | null;
  /**
   * The glyph drawn when there is no mark (a database's, a terminal's), in
   * the quiet icon tone at the icon size.
   */
  readonly fallback?: LucideIcon;
  /**
   * The mark's name for assistive technology, for a mark that stands alone;
   * absent, the mark is decorative, since the name beside it says it.
   */
  readonly label?: string;
}

/**
 * A product's mark beside its name (a row's icon, a crumb, a palette's
 * option): the brand's path in the brand's colour, mixed toward the text
 * tone as far as the theme asks (`--product-mark-mix`: none in a light
 * theme, some in a dark one, where a dark brand colour would sink), at the
 * icon size (`--icon-md`), with the product's name as its tooltip. With
 * no mark it draws `fallback`, a lucide glyph in the quiet icon tone, or
 * nothing. The app owns the marks and their colours and passes one in, so
 * the library stays free of any product list. Draws `.product-mark`
 * (`.glyph` for a fallback), with `--product-mark-colour`.
 */
export function ProductMark({
  mark = null,
  fallback: Fallback,
  label
}: ProductMarkProps): ReactElement {
  const naming =
    label === undefined
      ? { 'aria-hidden': true as const }
      : { 'aria-label': label, role: 'img' as const };

  if (mark === null) {
    return (
      <span
        className="product-mark glyph"
        {...naming}
        {...(label === undefined ? {} : tooltip(label))}
      >
        {Fallback === undefined ? null : <Fallback aria-hidden size={ICON_MD} />}
      </span>
    );
  }

  return (
    <span
      className="product-mark"
      style={
        {
          '--product-mark-colour': mark.colour,
          ...(mark.stroke === undefined ? {} : { '--product-mark-stroke': mark.stroke })
        } as CSSProperties
      }
      {...naming}
      {...tooltip(label ?? mark.title)}
    >
      <svg aria-hidden viewBox={mark.viewBox ?? '0 0 24 24'}>
        <path
          className={mark.stroke === undefined ? undefined : 'product-mark-outline'}
          d={mark.path}
        />
      </svg>
    </span>
  );
}
