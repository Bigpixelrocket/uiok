import type { ReactElement, ReactNode } from 'react';

/** Props for {@link Card}. */
export interface CardProps {
  /** One subject's lines: a heading, facts, a field grid, actions. */
  readonly children: ReactNode;
  /**
   * The card's accessible name, which makes it a `region` landmark; leave
   * it out for a card that is one part of a page among many alike.
   */
  readonly label?: string;
}

/**
 * A lifted panel that groups one subject's lines (an account, an update, a
 * connection's summary), framed like every framed surface, at the surface
 * inset at both ends whatever margins its first and last children bring.
 * Draws `.card`.
 */
export function Card({ children, label }: CardProps): ReactElement {
  return label === undefined ? (
    <div className="card">{children}</div>
  ) : (
    <section aria-label={label} className="card">
      {children}
    </section>
  );
}
