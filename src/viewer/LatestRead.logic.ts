/**
 * Latest viewport wins: the read policy of the text and hex views. A view
 * asks for targets as fast as the user scrolls; a target its cached bytes
 * already cover shows at once, and the rest share one read at a time. While
 * a read is in flight, newer targets only replace the one waiting, so
 * flinging through a huge file never queues up reads, and a read the user
 * has scrolled past is dropped instead of drawn.
 */

/** What the reader needs from its view. */
export interface LatestReadOptions<Target, Result> {
  /** Whether the bytes the view holds already answer `target`. */
  readonly covered: (target: Target) => boolean;
  /** One bounded read for `target`. Must not reject. */
  readonly read: (target: Target) => Promise<Result>;
  /** Keeps a read's bytes for later targets; false drops them (a failure, or a stale file). */
  readonly store: (result: Result) => boolean;
  /** Draws `target` from the bytes the view holds. */
  readonly show: (target: Target) => void;
}

/** A view's reader: request targets, dispose with the view. */
export interface LatestRead<Target> {
  readonly request: (target: Target) => void;
  /** Drops whatever is in flight; nothing shows after it. */
  readonly dispose: () => void;
}

/** A reader with at most one read in flight, always for the newest target it could not show. */
export function latestRead<Target, Result>(
  options: LatestReadOptions<Target, Result>
): LatestRead<Target> {
  let latest: Target | null = null;
  let reading = false;
  let disposed = false;

  const start = (target: Target): void => {
    reading = true;

    void options.read(target).then((result) => {
      reading = false;
      if (disposed || latest === null) return;

      const wanted = latest;

      // The user came back to bytes the view holds; this read is past.
      if (wanted !== target && options.covered(wanted)) return;

      const kept = options.store(result);

      if (options.covered(wanted)) {
        options.show(wanted);
      } else if (wanted === target) {
        // Fewer bytes than the target asked for: show what there is, and
        // never read the same target twice in a row.
        if (kept) options.show(wanted);
      } else {
        start(wanted);
      }
    });
  };

  return {
    request: (target) => {
      if (disposed) return;

      latest = target;
      if (options.covered(target)) {
        options.show(target);
      } else if (!reading) {
        start(target);
      }
    },
    dispose: () => {
      disposed = true;
    }
  };
}
