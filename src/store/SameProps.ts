import { isValidElement } from 'react';

/** Whether `value` is an array or an object of no class: data a component reads field by field. */
const isPlainData = (value: object): boolean => {
  if (Array.isArray(value)) {
    return true;
  }

  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

/**
 * Whether two values hold the same data: the same value, React elements of
 * one type and key whose props hold the same data, or arrays and objects of
 * no class whose items or fields do. Anything else (a function, a Set, a
 * DOM node, a class instance) is the same only as itself, so the test never
 * calls two things equal that a component could tell apart.
 */
export function sameData(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  if (isValidElement(a) || isValidElement(b)) {
    return (
      isValidElement(a) &&
      isValidElement(b) &&
      a.type === b.type &&
      a.key === b.key &&
      sameData(a.props, b.props)
    );
  }

  if (!isPlainData(a) || !isPlainData(b) || Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }

  const first = a as Readonly<Record<string, unknown>>;
  const second = b as Readonly<Record<string, unknown>>;
  const fields = Object.keys(first);

  return (
    fields.length === Object.keys(second).length &&
    fields.every(
      (field) =>
        Object.prototype.hasOwnProperty.call(second, field) && sameData(first[field], second[field])
    )
  );
}

/**
 * A `memo` comparison that renders a component again only when its props
 * hold other data (`sameData`), so a parent may build its arrays, records,
 * and elements afresh on every render. Its function props must keep their
 * identities (`useStableHandlers`) for the comparison to hold.
 */
export const sameProps = <Props extends object>(previous: Props, next: Props): boolean =>
  sameData(previous, next);
