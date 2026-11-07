import type { ButtonHTMLAttributes, ReactElement, Ref } from 'react';

import type { ButtonSize } from './Button.js';

/** Props for {@link IconButton}: every `<button>` attribute, with a required accessible name. */
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The accessible name; an icon alone names nothing. */
  readonly 'aria-label': string;
  /** The square's side; `regular` (28px) unless given. */
  readonly size?: ButtonSize;
  readonly ref?: Ref<HTMLButtonElement>;
}

/**
 * The one icon-only button, the neutral `Button`'s square sibling: styled
 * only by the `.icon-button` rules in `uiok/styles.css`, so it looks the same
 * wherever it is drawn. `className` is for layout, never for look. Always
 * `type="button"`; pair it with `tooltip(label)` so a pointer user learns
 * what the icon does.
 */
export function IconButton({
  size = 'regular',
  className,
  ...rest
}: IconButtonProps): ReactElement {
  const classes = ['icon-button', size === 'small' ? 'icon-button-small' : '', className]
    .filter(Boolean)
    .join(' ');

  return <button {...rest} className={classes} type="button" />;
}
