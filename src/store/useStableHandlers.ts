import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Event handlers whose identities never change, each calling the version of
 * its handler from the latest commit, so a memoized component handed them
 * renders again only when its data changes, not because its parent made new
 * closures.
 *
 * The record must name the same handlers on every render. They are for
 * events only: the latest versions are taken at commit (layout timing), so a
 * call during render would reach the previous commit's.
 */
export function useStableHandlers<
  T extends { readonly [Name in keyof T]: (...args: never[]) => unknown }
>(handlers: T): T {
  const latest = useRef(handlers);

  useLayoutEffect(() => {
    latest.current = handlers;
  });

  const [stable] = useState(
    () =>
      Object.fromEntries(
        Object.keys(handlers).map((name) => [
          name,
          (...args: unknown[]) =>
            (latest.current[name as keyof T] as unknown as (...args: unknown[]) => unknown)(...args)
        ])
      ) as unknown as T
  );

  return stable;
}
