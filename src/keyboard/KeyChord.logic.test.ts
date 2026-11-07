import { describe, expect, it } from 'vitest';

import { DEFAULT_KEY_LABELS, type KeyLabels } from '../labels/keys.js';
import { chordGlyphs, chordParts, chordSpoken, modifierName } from './KeyChord.logic.js';

describe('chord rendering', () => {
  it('orders keys the way macOS menus do', () => {
    expect(chordParts({ key: 'n', meta: true, shift: true, alt: true })).toEqual([
      'alt',
      'shift',
      'meta',
      { key: 'n' }
    ]);
    expect(chordParts({ key: '/' })).toEqual([{ key: '/' }]);
  });

  it('speaks the chord in words for assistive technology', () => {
    expect(chordSpoken({ key: 'ArrowRight', meta: true, alt: true })).toBe('Option Command Right');
    expect(chordSpoken({ key: 'n', meta: true, shift: true })).toBe('Shift Command N');
    expect(chordSpoken({ key: '.', meta: true, shift: true })).toBe('Shift Command Period');
    expect(chordSpoken({ key: ',' })).toBe('Comma');
    expect(chordSpoken({ key: 'Backspace', meta: true })).toBe('Command Backspace');
    expect(chordSpoken({ key: '?' })).toBe('Question Mark');
    expect(chordSpoken({ key: ' ' })).toBe('Space');
    expect(chordSpoken({ key: '[', meta: true, shift: true })).toBe('Shift Command Left Bracket');
    expect(chordSpoken({ key: 'Tab', ctrl: true })).toBe('Control Tab');
  });

  it('speaks only the modifiers of a chord with no key', () => {
    expect(chordSpoken({ key: '', meta: true, alt: true })).toBe('Option Command');
  });

  it('writes the chord as macOS menus print it, the space bar by its name', () => {
    expect(chordGlyphs({ key: 'g', meta: true, shift: true })).toBe('⇧⌘G');
    expect(chordGlyphs({ key: 'Enter', ctrl: true })).toBe('⌃↩');
    expect(chordGlyphs({ key: ' ', meta: true })).toBe('⌘Space');
    expect(chordGlyphs({ key: '/' })).toBe('/');
  });

  it('takes its names and glyphs from the key labels it is given', () => {
    const windows: KeyLabels = {
      ...DEFAULT_KEY_LABELS,
      modifiers: { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', meta: 'Windows' },
      modifierGlyphs: { ctrl: 'Ctrl+', alt: 'Alt+', shift: 'Shift+', meta: 'Win+' },
      names: { ...DEFAULT_KEY_LABELS.names, Enter: 'Enter' }
    };

    expect(modifierName('alt', windows)).toBe('Alt');
    expect(chordSpoken({ key: 'Enter', ctrl: true }, windows)).toBe('Ctrl Enter');
    expect(chordGlyphs({ key: 's', ctrl: true, shift: true }, windows)).toBe('Ctrl+Shift+S');
  });
});
