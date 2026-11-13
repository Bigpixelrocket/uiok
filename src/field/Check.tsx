import { useEffect, useRef, type InputHTMLAttributes } from 'react';

/** Props of `Check`: a native checkbox's, with `checked` able to say "some". */
export interface CheckProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'checked' | 'defaultChecked'
> {
  /** On, off, or `'mixed'` for some but not all of what it stands for. */
  checked: boolean | 'mixed';
}

/**
 * A checkbox in the shared `.check` look whose state can be mixed. The mixed
 * state is the DOM's `indeterminate` property, which no attribute sets, so
 * this sets it after each render, and again after a change its owner
 * answers without a render (a click the browser takes as clearing it, while
 * `checked` stays `'mixed'`); everything else is the native input.
 * A plain `<input type="checkbox" class="check">` needs no component.
 */
export function Check({ checked, className, onChange, ...props }: CheckProps) {
  const ref = useRef<HTMLInputElement>(null);
  const mixed = checked === 'mixed';

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = mixed;
  });

  return (
    <input
      {...props}
      aria-checked={mixed ? 'mixed' : undefined}
      checked={checked === true}
      className={className ? `check ${className}` : 'check'}
      onChange={(event) => {
        onChange?.(event);
        // A render the owner asks for sets the new state after this.
        event.currentTarget.indeterminate = mixed;
      }}
      ref={ref}
      type="checkbox"
    />
  );
}
