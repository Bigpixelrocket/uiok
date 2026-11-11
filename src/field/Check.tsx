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
 * this sets it after each render; everything else is the native input.
 * A plain `<input type="checkbox" class="check">` needs no component.
 */
export function Check({ checked, className, ...props }: CheckProps) {
  const ref = useRef<HTMLInputElement>(null);
  const mixed = checked === 'mixed';

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = mixed;
  }, [mixed]);

  return (
    <input
      {...props}
      aria-checked={mixed ? 'mixed' : undefined}
      checked={checked === true}
      className={className ? `check ${className}` : 'check'}
      ref={ref}
      type="checkbox"
    />
  );
}
