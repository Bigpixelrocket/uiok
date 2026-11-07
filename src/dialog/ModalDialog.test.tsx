import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createPortal } from 'react-dom';
import { describe, expect, it, vi } from 'vitest';

import type { DialogLegendModel } from './DialogLegend.logic.js';
import { ModalDialog } from './ModalDialog.js';

/**
 * The frame every dialog shares, with its key legend footer. Its consumers
 * keep one Escape test each to prove they are mounted in it; the frame's own
 * semantics are asserted only here.
 */
/** The backdrop is the frame around the dialog: a press on it, outside the dialog, cancels. */
const backdropOf = (dialog: HTMLElement): HTMLElement => dialog.parentElement as HTMLElement;

function renderFrame(children = <input aria-label="Name" />) {
  const onCancel = vi.fn();

  render(
    <ModalDialog labelId="test-title" onCancel={onCancel} title="Rename">
      {children}
    </ModalDialog>
  );

  return { onCancel, dialog: screen.getByRole('dialog') };
}

describe('ModalDialog', () => {
  it('exposes modal dialog semantics labelled by its heading', () => {
    const { dialog } = renderFrame();

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('test-title');
    expect(screen.getByRole('heading', { name: 'Rename' }).id).toBe('test-title');
  });

  it('cancels on Escape and on a backdrop press, but not on a press inside the dialog', () => {
    const { onCancel, dialog } = renderFrame();

    fireEvent.mouseDown(screen.getByRole('textbox'));
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(backdropOf(dialog));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('wraps Tab focus from the last control back to the first, skipping disabled controls', () => {
    // The disabled control sits last, the way the consumers place their
    // primary button after Cancel: only a cycle that skips it can wrap from
    // Cancel to the input.
    renderFrame(
      <>
        <input aria-label="Name" />
        <button type="button">Cancel</button>
        <button disabled type="button">
          OK
        </button>
      </>
    );
    const input = screen.getByRole('textbox');
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });

    cancelButton.focus();
    fireEvent.keyDown(cancelButton, { key: 'Tab' });
    expect(document.activeElement).toBe(input);

    // Backwards from the first control lands on the last enabled one, not OK.
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(cancelButton);
  });

  it('keeps focus in a dialog with nothing tabbable instead of letting Tab reach the page', () => {
    render(
      <>
        <button type="button">Behind</button>
        <ModalDialog labelId="test-title" onCancel={vi.fn()} title="Install 8.5.0">
          <div data-testid="body" tabIndex={-1}>
            Waiting for earlier operations
          </div>
        </ModalDialog>
      </>
    );
    const body = screen.getByTestId('body');

    body.focus();
    // fireEvent returns false once the handler prevents the browser's move.
    expect(fireEvent.keyDown(body, { key: 'Tab' })).toBe(false);
    expect(fireEvent.keyDown(body, { key: 'Tab', shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(body);
  });

  it('leaves the backdrop clear by default, so the panes stay readable behind a file dialog', () => {
    const { dialog } = renderFrame();

    // The class is what gives the backdrop its viewport coverage and stacking.
    expect(backdropOf(dialog).className).toBe('dialog-backdrop');
  });

  it('frosts the backdrop only when asked', () => {
    render(
      <ModalDialog frosted labelId="test-title" onCancel={vi.fn()} title="Keyboard shortcuts">
        <button type="button">Done</button>
      </ModalDialog>
    );

    expect(backdropOf(screen.getByRole('dialog')).className).toBe('dialog-backdrop frosted');
  });

  it('focuses the dialog itself when nothing in it asked for focus, so its keys work', () => {
    renderFrame(<p>Move "notes.txt" to the Trash?</p>);

    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('wears its tone on the frame, the accent unless told otherwise', () => {
    const { dialog } = renderFrame();

    expect(dialog.dataset.tone).toBe('accent');
  });
});

describe('ModalDialog legend', () => {
  function renderLegend(
    children = (
      <>
        <input aria-label="Name" />
        <button type="button">Body</button>
      </>
    ),
    overrides: Partial<DialogLegendModel> = {}
  ) {
    const onCancel = vi.fn();
    const onRun = vi.fn();
    const onBack = vi.fn();

    render(
      <ModalDialog
        labelId="test-title"
        legend={{
          leave: { label: 'Cancel' },
          secondary: [{ label: 'Back', chord: { key: '[', meta: true }, onRun: onBack }],
          primary: { label: 'Install', onRun },
          ...overrides
        }}
        onCancel={onCancel}
        title="Install"
      >
        {children}
      </ModalDialog>
    );

    return { onCancel, onRun, onBack, dialog: screen.getByRole('dialog') };
  }

  it('runs the primary on Return from a focused field and from a focused body button, without pressing it', () => {
    const onBody = vi.fn();
    const { onRun } = renderLegend(
      <>
        <input aria-label="Name" />
        <button onClick={onBody} type="button">
          Body
        </button>
      </>
    );

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onRun).toHaveBeenCalledTimes(1);

    const body = screen.getByRole('button', { name: 'Body' });
    // The legend keeps the key, so the browser does not also press the button.
    expect(fireEvent.keyDown(body, { key: 'Enter' })).toBe(false);
    expect(onRun).toHaveBeenCalledTimes(2);
    expect(onBody).not.toHaveBeenCalled();
  });

  it('runs nothing on Return while the primary is disabled, and keeps the key', () => {
    const onRun = vi.fn();

    renderLegend(undefined, { primary: { label: 'Install', disabled: true, onRun } });

    expect(fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })).toBe(false);
    expect(fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', repeat: true })).toBe(
      false
    );
    expect(onRun).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Install' })).toHaveProperty('disabled', true);
  });

  it('runs the leave verb on Escape and from its slot, and a secondary slot on its chord', () => {
    const { onCancel, onBack, dialog } = renderLegend();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(screen.getByRole('textbox'), { key: '[', metaKey: true });
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('leaves on Escape, unshown, when the primary already does what Escape would', () => {
    const onOk = vi.fn();
    const { onCancel, dialog } = renderLegend(undefined, {
      leave: undefined,
      secondary: [],
      primary: { label: 'OK', onRun: onOk }
    });

    // One slot, OK; no esc slot repeats it.
    expect(
      within(dialog.querySelector('.dialog-legend') as HTMLElement).getAllByRole('button')
    ).toEqual([screen.getByRole('button', { name: 'OK' })]);

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onOk).not.toHaveBeenCalled();
  });

  it('leaves Return to a focused field or button when the primary yields it', () => {
    const onDone = vi.fn();
    const onBody = vi.fn();
    const { dialog } = renderLegend(
      <>
        <input aria-label="Name" />
        <button onClick={onBody} type="button">
          Body
        </button>
        <input aria-label="Hidden" type="checkbox" />
      </>,
      {
        leave: undefined,
        secondary: [],
        primary: { label: 'Done', onRun: onDone, yieldsReturn: true }
      }
    );

    // The field and the button keep Return: the browser's own default runs.
    expect(fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })).toBe(true);
    expect(fireEvent.keyDown(screen.getByRole('button', { name: 'Body' }), { key: 'Enter' })).toBe(
      true
    );
    expect(onDone).not.toHaveBeenCalled();

    // From the dialog itself, or a checkbox, Return runs Done.
    fireEvent.keyDown(dialog, { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('checkbox'), { key: 'Enter' });
    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it('runs a bare secondary key from the dialog itself and leaves it to a focused body control', () => {
    const onPause = vi.fn();
    const { dialog } = renderLegend(undefined, {
      secondary: [{ label: 'Pause', chord: { key: ' ' }, onRun: onPause }]
    });

    // A focused field types its Space, and a focused body button presses on it.
    expect(fireEvent.keyDown(screen.getByRole('textbox'), { key: ' ' })).toBe(true);
    expect(fireEvent.keyDown(screen.getByRole('button', { name: 'Body' }), { key: ' ' })).toBe(
      true
    );
    expect(onPause).not.toHaveBeenCalled();

    expect(fireEvent.keyDown(dialog, { key: ' ' })).toBe(false);
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('draws each slot as a button named by its verb, its key cap hidden, in order', () => {
    const { dialog } = renderLegend();
    const legend = dialog.querySelector<HTMLElement>('.dialog-legend');

    expect(legend).not.toBeNull();
    // An exact name match: the caps (esc, ⌘[, ⏎) add nothing to the names.
    expect(within(legend as HTMLElement).getAllByRole('button')).toEqual(
      ['Cancel', 'Back', 'Install'].map((name) => screen.getByRole('button', { name }))
    );
    // The legend is the frame's last row.
    expect(dialog.lastElementChild).toBe(legend);
  });

  it('keeps the slots out of the Tab order while Tab still cycles the body controls', () => {
    renderLegend();
    const input = screen.getByRole('textbox');
    const body = screen.getByRole('button', { name: 'Body' });

    for (const name of ['Cancel', 'Back', 'Install']) {
      expect(screen.getByRole('button', { name }).tabIndex).toBe(-1);
    }

    body.focus();
    fireEvent.keyDown(body, { key: 'Tab' });
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(body);
  });

  it('answers only once for a dialog portalled from inside it', () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const outerCancel = vi.fn();
    const innerCancel = vi.fn();

    render(
      <ModalDialog
        labelId="outer-title"
        legend={{ primary: { label: 'Done', onRun: outer } }}
        onCancel={outerCancel}
        title="Outer"
      >
        {createPortal(
          <ModalDialog
            labelId="inner-title"
            legend={{ leave: { label: 'Cancel' }, primary: { label: 'Remove', onRun: inner } }}
            onCancel={innerCancel}
            title="Inner"
          >
            <p>Remove it?</p>
          </ModalDialog>,
          document.body
        )}
      </ModalDialog>
    );

    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Inner' }), { key: 'Enter' });
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    // React bubbles the key through the portal, but Escape leaves only the inner dialog.
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Inner' }), { key: 'Escape' });
    expect(innerCancel).toHaveBeenCalledTimes(1);
    expect(outerCancel).not.toHaveBeenCalled();
  });

  it('keeps the top edge it opened at with pinTop, until the window resizes', () => {
    // jsdom lays nothing out, so the centred offset is stood in for.
    let centredTop = 120;
    const offsetTop = vi
      .spyOn(HTMLElement.prototype, 'offsetTop', 'get')
      .mockImplementation(() => centredTop);

    try {
      const { rerender } = render(
        <ModalDialog labelId="pinned-title" onCancel={vi.fn()} pinTop title="Attributes">
          <p>Body</p>
        </ModalDialog>
      );
      const dialog = screen.getByRole('dialog');

      expect(dialog.dataset.pinned).toBe('true');
      expect(dialog.style.getPropertyValue('--dialog-top')).toBe('120px');

      // A body that grows keeps the pin; only a resize reads the centre again.
      centredTop = 90;
      rerender(
        <ModalDialog labelId="pinned-title" onCancel={vi.fn()} pinTop title="Attributes">
          <p>Body</p>
          <p>More</p>
        </ModalDialog>
      );
      expect(dialog.style.getPropertyValue('--dialog-top')).toBe('120px');
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      expect(dialog.style.getPropertyValue('--dialog-top')).toBe('90px');

      // Turned off, the box is centred again.
      rerender(
        <ModalDialog labelId="pinned-title" onCancel={vi.fn()} title="Attributes">
          <p>Body</p>
        </ModalDialog>
      );
      expect(dialog.dataset.pinned).toBeUndefined();
    } finally {
      offsetTop.mockRestore();
    }
  });

  it('stays centred without pinTop', () => {
    const { dialog } = renderFrame();

    expect(dialog.dataset.pinned).toBeUndefined();
    expect(dialog.style.getPropertyValue('--dialog-top')).toBe('');
  });
});
