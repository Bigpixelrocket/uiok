// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_DIALOG_LABELS } from '../labels/dialog.js';
import {
  filterLeaveLabel,
  legendKeyAction,
  legendSignature,
  type DialogLegendModel,
  type LegendKeyStroke
} from './DialogLegend.logic.js';

const stroke = (overrides: Partial<LegendKeyStroke>): LegendKeyStroke => ({
  key: '',
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  repeat: false,
  composing: false,
  handled: false,
  fromControl: false,
  fromReturnControl: false,
  fromFilledField: false,
  ...overrides
});

const legend = (overrides: Partial<DialogLegendModel> = {}) => {
  const install = vi.fn();
  const back = vi.fn();
  const model: DialogLegendModel = {
    leave: { label: 'Cancel' },
    secondary: [{ label: 'Back', chord: { key: '[', meta: true }, onRun: back }],
    primary: { label: 'Install', onRun: install },
    ...overrides
  };

  return { model, install, back };
};

describe('legendKeyAction', () => {
  it('runs the primary on plain Return', () => {
    const { model, install } = legend();
    const action = legendKeyAction(model, stroke({ key: 'Enter' }));

    expect(action?.kind).toBe('run');
    if (action?.kind === 'run') action.run();
    expect(install).toHaveBeenCalledTimes(1);
  });

  it('runs a secondary slot on its exact chord only', () => {
    const { model, back } = legend();
    const action = legendKeyAction(model, stroke({ key: '[', metaKey: true }));

    if (action?.kind === 'run') action.run();
    expect(back).toHaveBeenCalledTimes(1);
    // ⇧⌘[ and a bare [ are other keys.
    expect(legendKeyAction(model, stroke({ key: '[', metaKey: true, shiftKey: true }))).toBeNull();
    expect(legendKeyAction(model, stroke({ key: '[' }))).toBeNull();
  });

  it('leaves Return with a modifier to a secondary chord or to the focused control', () => {
    const queue = vi.fn();
    const { model } = legend({
      secondary: [{ label: 'Queue', chord: { key: 'Enter', alt: true }, onRun: queue }]
    });
    const action = legendKeyAction(model, stroke({ key: 'Enter', altKey: true }));

    if (action?.kind === 'run') action.run();
    expect(queue).toHaveBeenCalledTimes(1);
    expect(legendKeyAction(model, stroke({ key: 'Enter', metaKey: true }))).toBeNull();
  });

  it('keeps Return from the focused control while the primary is disabled or the key repeats', () => {
    const { model, install } = legend();

    expect(
      legendKeyAction(
        { ...model, primary: { label: 'Install', disabled: true, onRun: install } },
        stroke({ key: 'Enter' })
      )
    ).toEqual({ kind: 'keep' });
    expect(legendKeyAction(model, stroke({ key: 'Enter', repeat: true }))).toEqual({
      kind: 'keep'
    });
    expect(install).not.toHaveBeenCalled();
  });

  it('never reads a key an input method is composing or a control already kept', () => {
    const { model } = legend();

    expect(legendKeyAction(model, stroke({ key: 'Enter', composing: true }))).toBeNull();
    expect(legendKeyAction(model, stroke({ key: 'Enter', handled: true }))).toBeNull();
  });

  it('runs a bare chord from the dialog itself and leaves it to a focused body control', () => {
    const pause = vi.fn();
    const model: DialogLegendModel = {
      secondary: [
        { label: 'Skip File', chord: { key: 'ArrowRight', meta: true }, onRun: vi.fn() },
        { label: 'Pause', chord: { key: ' ' }, onRun: pause }
      ],
      primary: { label: 'Background', onRun: vi.fn() }
    };
    const action = legendKeyAction(model, stroke({ key: ' ' }));

    if (action?.kind === 'run') action.run();
    expect(pause).toHaveBeenCalledTimes(1);
    // A focused button, checkbox, or field types or presses its own Space.
    expect(legendKeyAction(model, stroke({ key: ' ', fromControl: true }))).toBeNull();
    expect(legendKeyAction(model, stroke({ key: ' ', repeat: true }))).toEqual({ kind: 'keep' });
    // A chord with a modifier runs from a focused control too.
    expect(
      legendKeyAction(model, stroke({ key: 'ArrowRight', metaKey: true, fromControl: true }))?.kind
    ).toBe('run');
  });

  it('leaves a deletion chord to a text field holding text', () => {
    const reset = vi.fn();
    const model: DialogLegendModel = {
      secondary: [{ label: 'Reset', chord: { key: 'Backspace', meta: true }, onRun: reset }]
    };
    const resetStroke = { key: 'Backspace', metaKey: true, fromControl: true };

    // ⌘⌫ deletes to the start of the line in a field that has text.
    expect(legendKeyAction(model, stroke({ ...resetStroke, fromFilledField: true }))).toBeNull();

    // An empty field has nothing to delete, so the slot runs.
    const action = legendKeyAction(model, stroke(resetStroke));

    if (action?.kind === 'run') action.run();
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('leaves Return to the focused control in a step with no primary', () => {
    const { model } = legend({ primary: undefined, secondary: [] });

    expect(legendKeyAction(model, stroke({ key: 'Enter' }))).toBeNull();
  });

  it('runs a primary on its own chord, never on Return, for a delete for good', () => {
    const remove = vi.fn();
    const model: DialogLegendModel = {
      leave: { label: 'Cancel' },
      primary: {
        label: 'Delete',
        chord: { key: 'Backspace', meta: true, alt: true },
        onRun: remove
      }
    };

    // Return pressed out of habit after ⌘⌫ deletes nothing.
    expect(legendKeyAction(model, stroke({ key: 'Enter' }))).toBeNull();
    expect(legendKeyAction(model, stroke({ key: 'Backspace', metaKey: true }))).toBeNull();
    expect(
      legendKeyAction(
        model,
        stroke({ key: 'Backspace', metaKey: true, altKey: true, repeat: true })
      )
    ).toEqual({ kind: 'keep' });

    const action = legendKeyAction(
      model,
      stroke({ key: 'Backspace', metaKey: true, altKey: true })
    );

    if (action?.kind === 'run') action.run();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('leaves Return to a focused field or button when the primary yields it', () => {
    const done = vi.fn();
    const model: DialogLegendModel = {
      primary: { label: 'Done', onRun: done, yieldsReturn: true }
    };

    // A focused field adds the name it holds; a focused button presses.
    expect(
      legendKeyAction(model, stroke({ key: 'Enter', fromControl: true, fromReturnControl: true }))
    ).toBeNull();

    // From the dialog itself, or a checkbox, Return runs Done.
    for (const fromControl of [false, true]) {
      const action = legendKeyAction(model, stroke({ key: 'Enter', fromControl }));

      if (action?.kind === 'run') action.run();
    }
    expect(done).toHaveBeenCalledTimes(2);

    // A primary that does not yield runs from a focused field too.
    expect(
      legendKeyAction(
        { primary: { label: 'Create', onRun: vi.fn() } },
        stroke({ key: 'Enter', fromControl: true, fromReturnControl: true })
      )?.kind
    ).toBe('run');
  });
});

describe('legendSignature', () => {
  it('tells legends apart by what they draw, not by what they run', () => {
    const legend = (run: () => void, disabled = false): DialogLegendModel => ({
      leave: { label: 'Done' },
      secondary: [{ label: 'Add', chord: { key: 'Enter', alt: true }, onRun: run }],
      primary: { label: 'Change', onRun: run, disabled }
    });

    expect(legendSignature(legend(() => {}))).toBe(legendSignature(legend(vi.fn())));
    expect(legendSignature(legend(() => {}))).not.toBe(legendSignature(legend(() => {}, true)));
    expect(legendSignature({ leave: { label: 'Done' } })).not.toBe(
      legendSignature({ leave: { label: 'Clear' } })
    );
  });

  it("tells a primary's own chord from Return", () => {
    const onRun = vi.fn();

    expect(legendSignature({ primary: { label: 'Delete', onRun } })).not.toBe(
      legendSignature({
        primary: { label: 'Delete', chord: { key: 'Backspace', meta: true, alt: true }, onRun }
      })
    );
  });

  it('tells a destructive secondary verb from a plain one', () => {
    const slot = { label: 'Delete…', chord: { key: 'Backspace', meta: true }, onRun: vi.fn() };

    expect(legendSignature({ secondary: [slot] })).not.toBe(
      legendSignature({ secondary: [{ ...slot, danger: true }] })
    );
  });
});

describe('filterLeaveLabel', () => {
  it('names Escape Clear while a filter is typed and Cancel once it is empty', () => {
    expect(filterLeaveLabel('', DEFAULT_DIALOG_LABELS)).toBe('Cancel');
    expect(filterLeaveLabel('rep', DEFAULT_DIALOG_LABELS)).toBe('Clear');
    expect(filterLeaveLabel('rep', { cancel: 'Abbrechen', clear: 'Löschen' })).toBe('Löschen');
  });
});
