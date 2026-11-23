import type { ReactElement, ReactNode } from 'react';

/**
 * How a brand mark's shape is drawn: `fill` fills it in the brand's white,
 * `line` strokes it in that white (a line drawing), and `cut` strokes it in
 * the plate's colour over a white fill, so it reads as cut out of the white
 * (the tiers of a cylinder).
 */
export type BrandMarkLook = 'fill' | 'line' | 'cut';

/** One shape of a brand mark's glyph: an SVG path on the mark's 24-unit grid, and how it is drawn. */
export interface BrandMarkShape {
  /** The path's data (`d`), inside the plate: from 1 to 19 on each axis. */
  readonly d: string;
  readonly look: BrandMarkLook;
}

const SHAPE_CLASS: Record<BrandMarkLook, string> = {
  fill: 'brand-mark-glyph',
  line: 'brand-mark-line',
  cut: 'brand-mark-cut'
};

/** Props for {@link BrandMark}. */
export interface BrandMarkProps {
  /** The app's glyph, its shapes drawn in order over the plate. */
  readonly glyph: readonly BrandMarkShape[];
}

/**
 * The family's brand mark: a rounded plate in the theme's accent with the
 * app's glyph on it in white, and a green check badge at its lower right,
 * ringed in the title bar's own ground so it reads as cut out of the
 * plate. Drawn for the eye only; the wordmark beside it names the product.
 * Every colour is a token (`--brand-white`, `--brand-plate`, the accent and
 * success hues), so it follows the theme in light and dark.
 */
export function BrandMark({ glyph }: BrandMarkProps): ReactElement {
  return (
    <svg aria-hidden className="brand-mark" focusable="false" viewBox="0 0 24 24">
      <rect className="brand-mark-plate" height="18" rx="4.5" width="18" x="1" y="1" />
      {glyph.map((shape, index) => (
        <path className={SHAPE_CLASS[shape.look]} d={shape.d} key={index} />
      ))}
      <circle className="brand-mark-badge" cx="18.5" cy="18.5" r="4.25" />
      <path className="brand-mark-check" d="M16.6 18.6l1.3 1.3 2.5-2.7" />
    </svg>
  );
}

/** A lockup's size by where it stands: the title bar, the About window, or a page of its own. */
export type LockupSize = 'title' | 'about' | 'hero';

const LOCKUP_CLASS: Record<LockupSize, string> = {
  title: 'lockup shell-lockup',
  about: 'lockup about-lockup-text',
  hero: 'lockup'
};

/** Props for {@link Lockup}. */
export interface LockupProps {
  /** The wordmark's lighter first part ("Database"). */
  readonly lead: string;
  /** The wordmark's heavier last part ("OK"). */
  readonly strong: string;
  /** The brand mark before the wordmark (`BrandMark`); none where an icon stands beside it instead. */
  readonly mark?: ReactNode;
  /**
   * Its size: `title` in the title bar (15px), `about` in the About window
   * (21px), `hero` on a page of its own (40px, the default).
   */
  readonly size?: LockupSize;
  /** The element it draws: the window's heading by default, a `span` inside one. */
  readonly as?: 'h1' | 'span';
}

/**
 * A product's lockup, the title bar's heading and the About window's: the
 * mark (when given) beside the wordmark, its `strong` part in the heavier
 * weight, at its `size`; the mark scales with it.
 */
export function Lockup({
  lead,
  strong,
  mark,
  size = 'hero',
  as: Element = 'h1'
}: LockupProps): ReactElement {
  return (
    <Element className={LOCKUP_CLASS[size]}>
      {mark}
      <span className="lockup-wordmark">
        {lead}
        <b>{strong}</b>
      </span>
    </Element>
  );
}
