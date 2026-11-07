import type { LayerModifier } from '../keyboard/KeyChord.logic.js';

/**
 * The words and glyphs every printed or spoken chord uses: what each
 * modifier and named key is called, how a chord is written as text, and
 * what a key cap says. The defaults are macOS's English names and glyphs; an
 * app on another platform or in another language supplies its own through
 * `UiokProvider`.
 *
 * Keys are `KeyboardEvent.key` values (`ArrowUp`, `Enter`, `' '`, `?`). A key
 * missing from `names` is spoken as its capital, and one missing from
 * `keyGlyphs` is written as its capital.
 */
export interface KeyLabels {
  /** Each modifier's name in a spoken chord and a label: "Command". */
  readonly modifiers: Readonly<Record<LayerModifier, string>>;
  /** Named keys in words, by `KeyboardEvent.key`: `{ Enter: 'Return', ' ': 'Space' }`. */
  readonly names: Readonly<Partial<Record<string, string>>>;
  /** Each modifier as a chord written in text prints it: "⌘". */
  readonly modifierGlyphs: Readonly<Record<LayerModifier, string>>;
  /** Named keys as a chord written in text prints them, by `KeyboardEvent.key`: `{ Enter: '↩' }`. */
  readonly keyGlyphs: Readonly<Partial<Record<string, string>>>;
  /** What the space bar's key cap says when a chord is drawn: "space". */
  readonly spaceCap: string;
  /** What the Escape key cap says when a chord is drawn: "esc". */
  readonly escapeCap: string;
}

/** English key names and macOS glyphs: the `keys` group `UiokProvider` starts from. */
export const DEFAULT_KEY_LABELS: KeyLabels = {
  modifiers: {
    ctrl: 'Control',
    alt: 'Option',
    shift: 'Shift',
    meta: 'Command'
  },
  names: {
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Backspace: 'Backspace',
    Enter: 'Return',
    Escape: 'Escape',
    Tab: 'Tab',
    Home: 'Home',
    End: 'End',
    PageUp: 'Page Up',
    PageDown: 'Page Down',
    ' ': 'Space',
    '`': 'Backquote',
    ',': 'Comma',
    '.': 'Period',
    '/': 'Slash',
    '?': 'Question Mark',
    '[': 'Left Bracket',
    ']': 'Right Bracket'
  },
  modifierGlyphs: {
    ctrl: '⌃',
    alt: '⌥',
    shift: '⇧',
    meta: '⌘'
  },
  keyGlyphs: {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Backspace: '⌫',
    Enter: '↩',
    Escape: '⎋',
    Tab: '⇥',
    Home: '↖',
    End: '↘',
    PageUp: '⇞',
    PageDown: '⇟'
  },
  spaceCap: 'space',
  escapeCap: 'esc'
};
