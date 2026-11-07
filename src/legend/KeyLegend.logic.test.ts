import { describe, expect, it } from 'vitest';

import type { Chord } from '../keyboard/Keyboard.logic.js';
import type { LegendLabels } from '../labels/legend.js';
import {
  fittingUnits,
  legendUnits,
  moreLabel,
  moreListAction,
  type LegendPair
} from './KeyLegend.logic.js';

interface Verb {
  readonly label: string;
  readonly chord: Chord;
  readonly pair?: LegendPair;
}

/** A pair vocabulary as an app would supply it, holding both kinds of pair the tests use. */
const PAIR_LABELS: Readonly<Record<string, string>> = {
  upDown: 'Up/Down',
  previousNextPage: 'Previous/Next Page',
  pageUpDown: 'Page Up/Down',
  toStartEnd: 'To Start/End',
  backForward: 'Back/Forward',
  previousNextTab: 'Previous/Next Tab'
};

const pairLabel = (pair: LegendPair): string => PAIR_LABELS[pair] ?? pair;

const entry = (label: string, chord: Chord, pair?: LegendPair): Verb =>
  pair === undefined ? { label, chord } : { label, chord, pair };

const labels = (entries: readonly Verb[]): string[] =>
  legendUnits(entries, { pairLabel }).map((unit) => unit.label);

describe('legendUnits', () => {
  it('merges only same-modifier neighbours of one pair on opposite keys, in key order', () => {
    // Different modifiers.
    expect(
      labels([
        entry('Up', { key: 'ArrowUp', meta: true }, 'upDown'),
        entry('Down', { key: 'ArrowDown', meta: true, shift: true }, 'upDown')
      ])
    ).toEqual(['Up', 'Down']);
    expect(
      labels([
        entry('To Start', { key: 'ArrowUp', meta: true }, 'toStartEnd'),
        entry('To End', { key: 'ArrowDown', meta: true, shift: true }, 'toStartEnd')
      ])
    ).toEqual(['To Start', 'To End']);
    // Not neighbours.
    expect(
      labels([
        entry('Up', { key: 'ArrowUp', meta: true }, 'upDown'),
        entry('Copy', { key: 'c', meta: true }),
        entry('Down', { key: 'ArrowDown', meta: true }, 'upDown')
      ])
    ).toEqual(['Up', 'Copy', 'Down']);
    expect(
      labels([
        entry('To Start', { key: 'ArrowUp', meta: true }, 'toStartEnd'),
        entry('Copy', { key: 'c', meta: true }),
        entry('To End', { key: 'ArrowDown', meta: true }, 'toStartEnd')
      ])
    ).toEqual(['To Start', 'Copy', 'To End']);
    // Keys that are not opposite, or opposite in reverse.
    expect(
      labels([
        entry('Previous Page', { key: 'F1', alt: true }, 'previousNextPage'),
        entry('Next Page', { key: 'F2', alt: true }, 'previousNextPage')
      ])
    ).toEqual(['Previous Page', 'Next Page']);
    expect(
      labels([
        entry('Back', { key: 'F1', alt: true }, 'backForward'),
        entry('Forward', { key: 'F2', alt: true }, 'backForward')
      ])
    ).toEqual(['Back', 'Forward']);
    expect(
      labels([
        entry('Up', { key: 'ArrowDown' }, 'upDown'),
        entry('Down', { key: 'ArrowUp' }, 'upDown')
      ])
    ).toEqual(['Up', 'Down']);
    // Opposite keys of two pairs, or with no pair at all.
    expect(
      labels([
        entry('Up', { key: 'ArrowUp', meta: true }, 'upDown'),
        entry('Next Page', { key: 'ArrowDown', meta: true }, 'previousNextPage')
      ])
    ).toEqual(['Up', 'Next Page']);
    expect(
      labels([
        entry('Up', { key: 'ArrowUp', meta: true }, 'upDown'),
        entry('To End', { key: 'ArrowDown', meta: true }, 'toStartEnd')
      ])
    ).toEqual(['Up', 'To End']);
    expect(
      labels([
        entry('Copy Left', { key: 'ArrowLeft', meta: true }),
        entry('Copy Right', { key: 'ArrowRight', meta: true })
      ])
    ).toEqual(['Copy Left', 'Copy Right']);
  });

  it('folds each of the opposite key pairs under the pair’s own label', () => {
    expect(
      labels([
        entry('Up', { key: 'ArrowUp' }, 'upDown'),
        entry('Down', { key: 'ArrowDown' }, 'upDown'),
        entry('Previous Page', { key: 'ArrowLeft' }, 'previousNextPage'),
        entry('Next Page', { key: 'ArrowRight' }, 'previousNextPage'),
        entry('Page Up', { key: 'PageUp' }, 'upDown'),
        entry('Page Down', { key: 'PageDown' }, 'upDown'),
        entry('First Page', { key: 'Home' }, 'previousNextPage'),
        entry('Last Page', { key: 'End' }, 'previousNextPage'),
        entry('Back', { key: '[', meta: true }, 'upDown'),
        entry('Forward', { key: ']', meta: true }, 'upDown')
      ])
    ).toEqual(['Up/Down', 'Previous/Next Page', 'Up/Down', 'Previous/Next Page', 'Up/Down']);
    // With modifiers held on both, as layered verbs have them.
    expect(
      labels([
        entry('Up', { key: 'ArrowUp' }, 'upDown'),
        entry('Down', { key: 'ArrowDown' }, 'upDown'),
        entry('Previous Tab', { key: 'ArrowLeft', alt: true, meta: true }, 'previousNextTab'),
        entry('Next Tab', { key: 'ArrowRight', alt: true, meta: true }, 'previousNextTab'),
        entry('Page Up', { key: 'PageUp' }, 'pageUpDown'),
        entry('Page Down', { key: 'PageDown' }, 'pageUpDown'),
        entry('To Start', { key: 'Home' }, 'toStartEnd'),
        entry('To End', { key: 'End' }, 'toStartEnd'),
        entry('Back', { key: '[', meta: true }, 'backForward'),
        entry('Forward', { key: ']', meta: true }, 'backForward')
      ])
    ).toEqual(['Up/Down', 'Previous/Next Tab', 'Page Up/Down', 'To Start/End', 'Back/Forward']);
  });

  it('pairs from the left, so a third neighbour stays alone', () => {
    const units = legendUnits(
      [
        entry('Up', { key: 'ArrowUp' }, 'upDown'),
        entry('Down', { key: 'ArrowDown' }, 'upDown'),
        entry('Down', { key: 'ArrowDown' }, 'upDown')
      ],
      { pairLabel }
    );

    expect(units.map((unit) => unit.entries.length)).toEqual([2, 1]);
  });

  it('reads the pair the caller says a verb is one of', () => {
    const units = legendUnits(
      [entry('Up', { key: 'ArrowUp' }), entry('Down', { key: 'ArrowDown' })],
      {
        pairLabel,
        pairOf: () => 'upDown'
      }
    );

    expect(units.map((unit) => unit.label)).toEqual(['Up/Down']);
  });

  it('folds a pair by its key in any language, under the label the caller gives it', () => {
    const asked: LegendPair[] = [];
    const units = legendUnits(
      [entry('Haut', { key: 'ArrowUp' }, 'upDown'), entry('Bas', { key: 'ArrowDown' }, 'upDown')],
      {
        pairLabel: (pair) => {
          asked.push(pair);
          return 'Haut/Bas';
        }
      }
    );

    expect(units.map((unit) => unit.entries.length)).toEqual([2]);
    expect(units[0]?.label).toBe('Haut/Bas');
    expect(asked).toEqual(['upDown']);
  });

  it('asks for no pair label when nothing folds', () => {
    const units = legendUnits([entry('Copy', { key: 'c', meta: true })], {
      pairLabel: () => {
        throw new Error('no pair to name');
      }
    });

    expect(units.map((unit) => unit.label)).toEqual(['Copy']);
  });
});

describe('fittingUnits', () => {
  it('shows every place when they all fit, and reserves no chip', () => {
    expect(fittingUnits([100, 100, 100], 300, 40)).toBe(3);
    expect(fittingUnits([], 0, 40)).toBe(0);
  });

  it('drops places from the tail beside the chip once they do not fit', () => {
    // 301 needed: the chip takes 40, so two places fit in 300.
    expect(fittingUnits([100, 100, 101], 300, 40)).toBe(2);
    expect(fittingUnits([100, 100, 100, 100], 250, 40)).toBe(2);
    // Survivors are a prefix: a narrow place after a wide one that does not fit stays out.
    expect(fittingUnits([100, 200, 10], 260, 40)).toBe(1);
    expect(fittingUnits([300], 100, 40)).toBe(0);
  });
});

describe('moreLabel', () => {
  it('counts verbs, singular and plural', () => {
    expect(moreLabel(1)).toEqual({ text: '+1', spoken: '1 more shortcut' });
    expect(moreLabel(5)).toEqual({ text: '+5', spoken: '5 more shortcuts' });
  });

  it('speaks the count in the words the labels give', () => {
    const legend: LegendLabels = {
      label: 'Tastenkürzel',
      verbs: 'Befehle',
      capName: (chord, verb) => `${chord} ${verb}`,
      more: (count) => `${count} weitere`
    };

    expect(moreLabel(3, legend)).toEqual({ text: '+3', spoken: '3 weitere' });
  });
});

describe('moreListAction', () => {
  const key = (name: string, metaKey = false) => ({ key: name, metaKey });

  it('moves the cursor round the rows and to either end', () => {
    expect(moreListAction(key('ArrowDown'), 0, 3)).toEqual({ kind: 'cursor', row: 1 });
    expect(moreListAction(key('ArrowDown'), 2, 3)).toEqual({ kind: 'cursor', row: 0 });
    expect(moreListAction(key('ArrowUp'), 0, 3)).toEqual({ kind: 'cursor', row: 2 });
    expect(moreListAction(key('Home'), 2, 3)).toEqual({ kind: 'cursor', row: 0 });
    expect(moreListAction(key('End'), 0, 3)).toEqual({ kind: 'cursor', row: 2 });
  });

  it('runs the cursor row on Return or Space and closes on Escape or Tab', () => {
    expect(moreListAction(key('Enter'), 1, 3)).toEqual({ kind: 'run', row: 1 });
    expect(moreListAction(key(' '), 2, 3)).toEqual({ kind: 'run', row: 2 });
    expect(moreListAction(key('Escape'), 1, 3)).toEqual({ kind: 'close' });
    expect(moreListAction(key('Tab'), 1, 3)).toEqual({ kind: 'close' });
  });

  it('leaves other keys and Command chords alone', () => {
    expect(moreListAction(key('a'), 0, 3)).toBeNull();
    expect(moreListAction(key('ArrowDown', true), 0, 3)).toBeNull();
  });
});
