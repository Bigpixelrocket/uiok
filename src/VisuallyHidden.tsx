import type { ComponentPropsWithRef } from 'react';

/** Props for {@link VisuallyHidden}: every attribute a `<span>` accepts, `ref` included. */
export type VisuallyHiddenProps = ComponentPropsWithRef<'span'>;

/**
 * Text that assistive technology reads but the screen does not show: a label
 * for an icon-only control, a live announcement, or a description another
 * element names through `aria-describedby`.
 *
 * Renders a `<span>` with the `visually-hidden` class from `uiok/styles.css`,
 * which keeps it in the accessibility tree while clipping it to nothing on
 * screen. A `className` passed in is added alongside that class.
 */
export function VisuallyHidden({ className, ...props }: VisuallyHiddenProps) {
  return (
    <span {...props} className={className ? `visually-hidden ${className}` : 'visually-hidden'} />
  );
}
