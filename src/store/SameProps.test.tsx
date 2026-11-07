import { render } from '@testing-library/react';
import { memo } from 'react';
import { describe, expect, it } from 'vitest';

import { sameData, sameProps } from './SameProps.js';

describe('sameData', () => {
  it('holds for arrays, records, and elements that hold the same data', () => {
    const onClick = (): void => undefined;

    expect(sameData({ a: [1, { b: 'x' }], c: null }, { a: [1, { b: 'x' }], c: null })).toBe(true);
    expect(
      sameData(
        <span className="row" onClick={onClick} />,
        <span className="row" onClick={onClick} />
      )
    ).toBe(true);
    expect(sameData([<i key="a" />, <i key="b" />], [<i key="a" />, <i key="b" />])).toBe(true);
  });

  it('tells apart anything a component could', () => {
    expect(sameData({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameData({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(sameData({ a: undefined }, { b: undefined })).toBe(false);
    expect(sameData([1, 2], { 0: 1, 1: 2 })).toBe(false);
    expect(sameData(<i key="a" />, <i key="b" />)).toBe(false);
    expect(sameData(<i />, <b />)).toBe(false);
    expect(sameData(<i className="a" />, { type: 'i', props: { className: 'a' } })).toBe(false);
    // Functions, Sets, Maps, and dates are the same only as themselves.
    expect(sameData({ on: () => 1 }, { on: () => 1 })).toBe(false);
    expect(sameData(new Set([1]), new Set([2]))).toBe(false);
    expect(sameData(new Map(), new Map())).toBe(false);
    expect(sameData(new Date(0), new Date(1))).toBe(false);
  });
});

describe('sameProps', () => {
  it('lets a memoized component skip a render whose props hold the same data', () => {
    let renders = 0;
    const Row = memo(function Row({ cells }: { readonly cells: readonly string[] }) {
      renders += 1;
      return <span>{cells.join(' ')}</span>;
    }, sameProps);

    const { rerender } = render(<Row cells={['a', 'b']} />);
    rerender(<Row cells={['a', 'b']} />);
    expect(renders).toBe(1);

    rerender(<Row cells={['a', 'c']} />);
    expect(renders).toBe(2);
  });
});
