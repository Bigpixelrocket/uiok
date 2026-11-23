import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Listing, Row, RowCursorContext, type RowCursor } from '../listing/Listing.js';
import { PaneBox, PaneList } from './Pane.js';

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

describe("a text field's secondary click", () => {
  it("keeps the browser's own menu in a text field, read-only too, and calls no pane menu", () => {
    const onPane = vi.fn();
    render(
      <PaneBox onContextMenu={onPane}>
        <input aria-label="Name" />
        <input aria-label="Path" readOnly />
        <textarea aria-label="Notes" />
        <div aria-label="Query" contentEditable role="textbox" suppressContentEditableWarning />
        <div contentEditable suppressContentEditableWarning>
          <span aria-label="Inherited" contentEditable="inherit" role="textbox" />
        </div>
        <input aria-label="Ready" type="checkbox" />
      </PaneBox>
    );

    for (const name of ['Name', 'Path', 'Notes', 'Query', 'Inherited']) {
      expect(secondaryClick(screen.getByRole('textbox', { name })).defaultPrevented).toBe(false);
    }
    expect(onPane).not.toHaveBeenCalled();
    // A checkbox is no text field: the pane takes it.
    expect(secondaryClick(screen.getByRole('checkbox', { name: 'Ready' })).defaultPrevented).toBe(
      true
    );
    expect(onPane).toHaveBeenCalledOnce();
  });
});

describe("the keyboard's menu key on a pane's home", () => {
  const cursorOn = (key: string): RowCursor => ({
    current: () => key,
    subscribe: () => () => undefined,
    point: () => undefined
  });

  const mount = (
    cursor: string,
    onRow: (event: { clientX: number; clientY: number }, key: string) => void,
    onPane: () => void
  ) =>
    render(
      <PaneBox onContextMenu={onPane}>
        <PaneList home label="Files">
          <RowCursorContext value={cursorOn(cursor)}>
            <Listing columns={[]} grid="20px 1fr" title="Files">
              <Row name="a" onContextMenu={onRow} rowKey="a" />
              <Row name="b" onContextMenu={onRow} rowKey="b" />
              <Row name="c" rowKey="c" />
            </Listing>
          </RowCursorContext>
        </PaneList>
      </PaneBox>
    );

  it("opens the cursor row's menu under the row, not the pane's", () => {
    const onRow = vi.fn();
    const onPane = vi.fn();
    mount('b', onRow, onPane);
    const home = screen.getByLabelText('Files', { selector: '.pane-list' });
    const b = screen.getAllByRole('row')[2] as HTMLElement;
    b.getBoundingClientRect = () =>
      ({ left: 40, top: 100, right: 400, bottom: 124, width: 360, height: 24 }) as DOMRect;

    home.focus();
    fireEvent.keyDown(home, { key: 'ContextMenu' });
    expect(secondaryClick(home).defaultPrevented).toBe(true);
    expect(onRow).toHaveBeenCalledOnce();
    expect(onRow.mock.calls[0]?.[1]).toBe('b');
    expect(onRow.mock.calls[0]?.[0]).toMatchObject({ clientX: 40, clientY: 124 });
    expect(onPane).not.toHaveBeenCalled();
  });

  it("leaves a pointer's click on the home's empty space, and a cursor row with no menu, to the pane", () => {
    const onRow = vi.fn();
    const onPane = vi.fn();
    const { unmount } = mount('b', onRow, onPane);
    const home = screen.getByLabelText('Files', { selector: '.pane-list' });

    fireEvent.pointerDown(home, { button: 2 });
    secondaryClick(home);
    expect(onPane).toHaveBeenCalledOnce();
    expect(onRow).not.toHaveBeenCalled();
    unmount();

    mount('c', onRow, onPane);
    const plain = screen.getByLabelText('Files', { selector: '.pane-list' });
    fireEvent.keyDown(plain, { key: 'F10', shiftKey: true });
    secondaryClick(plain);
    expect(onPane).toHaveBeenCalledTimes(2);
    expect(onRow).not.toHaveBeenCalled();
  });
});

describe("the keyboard's menu key, told from a pointer's click", () => {
  const cursorOn = (key: string): RowCursor => ({
    current: () => key,
    subscribe: () => () => undefined,
    point: () => undefined
  });

  const mount = (onRow: () => void, onPane: () => void) =>
    render(
      <PaneBox onContextMenu={onPane}>
        <PaneList home label="Files">
          <RowCursorContext value={cursorOn('file')}>
            <Listing columns={[]} grid="20px 1fr" title="Files">
              <Row name="file" onContextMenu={onRow} rowKey="file" />
            </Listing>
          </RowCursorContext>
        </PaneList>
      </PaneBox>
    );

  const pointerMenu = (target: Element, pointerType: string): void => {
    fireEvent(
      target,
      new PointerEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, pointerType })
    );
  };

  it("leaves a mouse's secondary click to the pane though no press came before it", () => {
    const onRow = vi.fn();
    const onPane = vi.fn();
    mount(onRow, onPane);

    pointerMenu(screen.getByLabelText('Files', { selector: '.pane-list' }), 'mouse');
    expect([onPane.mock.calls.length, onRow.mock.calls.length]).toEqual([1, 0]);
  });

  it('leaves a touch to the pane though a key came during the press', () => {
    const onRow = vi.fn();
    const onPane = vi.fn();
    mount(onRow, onPane);
    const home = screen.getByLabelText('Files', { selector: '.pane-list' });

    home.focus();
    fireEvent.pointerDown(home, { pointerType: 'touch' });
    fireEvent.keyDown(home, { key: 'Shift' });
    pointerMenu(home, 'touch');
    expect([onPane.mock.calls.length, onRow.mock.calls.length]).toEqual([1, 0]);
  });

  it("takes the Menu key's menu as the keyboard's though the browser calls it a mouse's", () => {
    // Chromium sends the Menu key's contextmenu as a PointerEvent whose
    // pointerType is mouse and whose button is -1.
    const onRow = vi.fn();
    const onPane = vi.fn();
    mount(onRow, onPane);
    const home = screen.getByLabelText('Files', { selector: '.pane-list' });

    home.focus();
    fireEvent.keyDown(home, { key: 'ContextMenu' });
    fireEvent(
      home,
      new PointerEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: -1,
        pointerType: 'mouse'
      })
    );
    expect([onPane.mock.calls.length, onRow.mock.calls.length]).toEqual([0, 1]);
  });

  it("takes a menu as the keyboard's only right after the menu key, once", () => {
    const onRow = vi.fn();
    const onPane = vi.fn();
    mount(onRow, onPane);
    const home = screen.getByLabelText('Files', { selector: '.pane-list' });

    // Another key is no menu key, and nor is Shift-F10 with another modifier.
    fireEvent.keyDown(home, { key: 'a' });
    secondaryClick(home);
    expect([onPane.mock.calls.length, onRow.mock.calls.length]).toEqual([1, 0]);
    fireEvent.keyDown(home, { key: 'F10', shiftKey: true, ctrlKey: true });
    secondaryClick(home);
    expect([onPane.mock.calls.length, onRow.mock.calls.length]).toEqual([2, 0]);
    fireEvent.keyDown(home, { key: 'F10', shiftKey: true });
    secondaryClick(home);
    expect([onPane.mock.calls.length, onRow.mock.calls.length]).toEqual([2, 1]);
    // The menu key spent, the next secondary click is the pane's again.
    secondaryClick(home);
    expect([onPane.mock.calls.length, onRow.mock.calls.length]).toEqual([3, 1]);
  });
});
