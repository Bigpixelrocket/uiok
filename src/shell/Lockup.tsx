import type { ReactElement, ReactNode } from 'react';

/** Props for {@link BrandMark}. */
export interface BrandMarkProps {
  /**
   * The app's glyph, as SVG shapes on the mark's 24-unit grid, drawn inside
   * the plate (from 1 to 19 on each axis). A shape with the class
   * `brand-mark-glyph` fills in the brand's white; one with
   * `brand-mark-cut` strokes in the plate's colour, so it reads as cut
   * out of the white (the tiers of a cylinder).
   */
  readonly children: ReactNode;
}

/**
 * The family's brand mark: a rounded plate in the theme's accent with the
 * app's glyph on it in white, and a green check badge at its lower right,
 * ringed in the title bar's own ground so it reads as cut out of the
 * plate. Drawn for the eye only; the wordmark beside it names the product.
 * Every colour is a token (`--brand-white`, `--brand-plate`, the accent and
 * success hues), so it follows the theme in light and dark.
 */
export function BrandMark({ children }: BrandMarkProps): ReactElement {
  return (
    <svg aria-hidden className="brand-mark" focusable="false" viewBox="0 0 24 24">
      <rect className="brand-mark-plate" height="18" rx="4.5" width="18" x="1" y="1" />
      {children}
      <circle className="brand-mark-badge" cx="18.5" cy="18.5" r="4.25" />
      <path className="brand-mark-check" d="M16.6 18.6l1.3 1.3 2.5-2.7" />
    </svg>
  );
}

/** Props for {@link Lockup}. */
export interface LockupProps {
  /** The wordmark's lighter first part ("Database"). */
  readonly lead: string;
  /** The wordmark's heavier last part ("OK"). */
  readonly strong: string;
  /** The brand mark before the wordmark (`BrandMark`); none where an icon stands beside it instead. */
  readonly mark?: ReactNode;
  /** The lockup's own class, which sets `--lockup-size`. */
  readonly className?: string;
  /** The element it draws: the window's heading by default, a `span` inside one. */
  readonly as?: 'h1' | 'span';
}

/**
 * A product's lockup, the title bar's heading and the About window's: the
 * mark (when given) beside the wordmark, its `strong` part in the heavier
 * weight. The host sets the size through `--lockup-size` (40px unless set,
 * `.shell-lockup` 15px, `.about-lockup-text` 21px); the mark scales with it.
 */
export function Lockup({
  lead,
  strong,
  mark,
  className,
  as: Element = 'h1'
}: LockupProps): ReactElement {
  return (
    <Element className={className === undefined ? 'lockup' : `lockup ${className}`}>
      {mark}
      <span className="lockup-wordmark">
        {lead}
        <b>{strong}</b>
      </span>
    </Element>
  );
}
