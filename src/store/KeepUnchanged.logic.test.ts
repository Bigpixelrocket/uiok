import { describe, expect, it } from 'vitest';

import { keepUnchangedBy, keepUnchangedById } from './KeepUnchanged.logic.js';

const item = (id: string, value: number, tags: readonly string[] = []) => ({ id, value, tags });

describe('keepUnchangedById', () => {
  it('takes the list as it is with nothing before it', () => {
    const next = [item('a', 1)];

    expect(keepUnchangedById(null, next)).toBe(next);
    expect(keepUnchangedById([], next)).toBe(next);
  });

  it('keeps the earlier list whole when every item holds the same data in the same order', () => {
    const previous = [item('a', 1, ['x']), item('b', 2)];

    expect(keepUnchangedById(previous, structuredClone(previous))).toBe(previous);
  });

  it('keeps each unchanged item and takes the changed one', () => {
    const previous = [item('a', 1), item('b', 2), item('c', 3, ['x'])];
    const next = [item('a', 1), item('b', 5), item('c', 3, ['y'])];
    const kept = keepUnchangedById(previous, next);

    expect(kept).not.toBe(previous);
    expect(kept[0]).toBe(previous[0]);
    expect(kept[1]).toBe(next[1]);
    expect(kept[2]).toBe(next[2]);
  });

  it('keeps unchanged items through a reorder, an addition, and a removal, in the new order', () => {
    const previous = [item('a', 1), item('b', 2), item('c', 3)];
    const next = [item('c', 3), item('d', 4), item('a', 1)];
    const kept = keepUnchangedById(previous, next);

    expect(kept).toEqual(next);
    expect(kept[0]).toBe(previous[2]);
    expect(kept[1]).toBe(next[1]);
    expect(kept[2]).toBe(previous[0]);
    expect(keepUnchangedById(previous, [item('a', 1), item('b', 2)])).not.toBe(previous);
  });
});

describe('keepUnchangedBy', () => {
  it('knows items by the field it is given', () => {
    const row = (key: string, label: string) => ({ key, label });
    const previous = [row('a', 'one'), row('b', 'two')];
    const kept = keepUnchangedBy(previous, [row('b', 'two'), row('a', 'uno')], (item) => item.key);

    expect(kept[0]).toBe(previous[1]);
    expect(kept[1]).toEqual(row('a', 'uno'));
    expect(keepUnchangedBy(previous, structuredClone(previous), (item) => item.key)).toBe(previous);
  });
});
