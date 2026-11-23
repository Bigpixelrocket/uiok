import { describe, expect, it } from 'vitest';

import { latestRead } from './LatestRead.logic.js';

/**
 * A view over numbers: the cache holds one range [from, from + 10), a read
 * for `n` caches [n, n + 10), and `stale` marks results from a reloaded file.
 */
function harness() {
  const reads: Array<{ target: number; finish: (stale?: boolean) => Promise<void> }> = [];
  const shown: number[] = [];
  let cache: number | null = null;

  const reader = latestRead<number, { from: number; stale: boolean }>({
    covered: (target) => cache !== null && target >= cache && target < cache + 10,
    read: (target) =>
      new Promise((resolve) => {
        reads.push({
          target,
          finish: async (stale = false) => {
            resolve({ from: target, stale });
            await Promise.resolve();
            await Promise.resolve();
          }
        });
      }),
    store: (result) => {
      if (result.stale) return false;
      cache = result.from;
      return true;
    },
    show: (target) => shown.push(target)
  });

  return { reader, reads, shown };
}

describe('latestRead', () => {
  it('keeps one read in flight however fast targets arrive, then reads only the newest', async () => {
    const { reader, reads, shown } = harness();

    reader.request(0);
    for (let target = 1000; target < 2000; target += 1) reader.request(target);

    expect(reads.map((read) => read.target)).toEqual([0]);
    await reads[0]?.finish();
    expect(reads.map((read) => read.target)).toEqual([0, 1999]);
    await reads[1]?.finish();

    // The read for 0 was scrolled past: only the newest target was drawn.
    expect(shown).toEqual([1999]);
  });

  it('shows a target the cache covers at once, and drops a read for a place left behind', async () => {
    const { reader, reads, shown } = harness();

    reader.request(0);
    await reads[0]?.finish();
    reader.request(500);
    reader.request(5);
    expect(shown).toEqual([0, 5]);

    await reads[1]?.finish();
    expect(shown).toEqual([0, 5]);
    expect(reads).toHaveLength(2);
    reader.request(7);
    expect(shown).toEqual([0, 5, 7]);
  });

  it('draws nothing from a read of a reloaded file, and does not read it again', async () => {
    const { reader, reads, shown } = harness();

    reader.request(0);
    await reads[0]?.finish(true);

    expect(shown).toEqual([]);
    expect(reads).toHaveLength(1);
  });

  it('draws nothing after it is disposed', async () => {
    const { reader, reads, shown } = harness();

    reader.request(0);
    reader.dispose();
    await reads[0]?.finish();
    reader.request(3);

    expect(shown).toEqual([]);
    expect(reads).toHaveLength(1);
  });
});
