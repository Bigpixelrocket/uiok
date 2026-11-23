import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Listing, Row } from '../listing/Listing.js';
import { PaneBox } from './Pane.js';

/** A secondary click on `target`, cancelable as the browser's is; returns the event. */
const secondaryClick = (target: Element): MouseEvent => {
  const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
  act(() => target.dispatchEvent(event));
  return event;
};

describe("PaneBox's secondary click", () => {
  it('opens the pane menu for a click no row took, and only the row menu for one a row took', () => {
    const onPane = vi.fn();
    const onRow = vi.fn();
    const { container } = render(
      <PaneBox label="Files" onContextMenu={onPane}>
        <Listing columns={[]} grid="20px 1fr" title="Files">
          <Row name="a" onContextMenu={onRow} rowKey="a" />
          <Row name="b" rowKey="b" />
        </Listing>
      </PaneBox>
    );
    const [a, b] = screen.getAllByRole('row').slice(1) as [HTMLElement, HTMLElement];

    expect(secondaryClick(a).defaultPrevented).toBe(true);
    expect(onRow).toHaveBeenCalledWith(expect.anything(), 'a');
    expect(onPane).not.toHaveBeenCalled();

    // A row with no menu of its own, and the pane's empty space, are the pane's.
    expect(secondaryClick(b).defaultPrevented).toBe(true);
    secondaryClick(container.querySelector('.pane') as HTMLElement);
    expect(onPane).toHaveBeenCalledTimes(2);
    expect(onRow).toHaveBeenCalledTimes(1);
  });

  it('leaves a click alone that a part inside cancelled natively, and the browser menu without a handler', () => {
    const onPane = vi.fn();
    const { container, rerender } = render(
      <PaneBox onContextMenu={onPane}>
        <canvas />
      </PaneBox>
    );
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    // A terminal cancels its own on the canvas and opens its menu.
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    secondaryClick(canvas);
    expect(onPane).not.toHaveBeenCalled();

    rerender(
      <PaneBox>
        <canvas />
      </PaneBox>
    );
    expect(secondaryClick(container.querySelector('.pane') as HTMLElement).defaultPrevented).toBe(
      false
    );
  });
});
