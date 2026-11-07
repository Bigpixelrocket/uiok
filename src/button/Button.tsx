import type { ButtonHTMLAttributes, ReactElement, Ref } from 'react';

/**
 * The action tiers: `primary` for the one main action of a view, `tonal` for
 * a row's routine positive action (Install), `neutral` for everything else,
 * destructive triggers included. A confirmation's destructive verb is the
 * red lit primary of its dialog's key legend, not a button tier.
 */
export type ButtonVariant = 'primary' | 'tonal' | 'neutral';

/** The two button heights: `regular` (28px) and `small` (24px). */
export type ButtonSize = 'regular' | 'small';

/** Props for {@link Button}: every `<button>` attribute, plus its tier and size. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The action tier; `neutral` unless given. */
  readonly variant?: ButtonVariant;
  /** The height; `regular` unless given. */
  readonly size?: ButtonSize;
  readonly ref?: Ref<HTMLButtonElement>;
}

/**
 * The one text action button, identical wherever it is drawn: styled only by
 * the `.button` rules in `uiok/styles.css`, which carry their own font so no
 * surrounding stylesheet restyles them. `className` is for layout (width,
 * alignment), never for look. It is `type="button"` unless given another
 * type, so it never submits a form by accident.
 */
export function Button({
  variant = 'neutral',
  size = 'regular',
  className,
  type = 'button',
  ...rest
}: ButtonProps): ReactElement {
  const classes = ['button', `button-${variant}`, size === 'small' ? 'button-small' : '', className]
    .filter(Boolean)
    .join(' ');

  return <button {...rest} className={classes} type={type} />;
}
