import { describe, expect, it } from 'vitest';

import {
  isModalOpen,
  isOverlayOpen,
  isNativeKeyboardTarget,
  shouldSuppressBrowserDocumentKey,
  type CommandKeyStroke
} from './Keyboard.logic.js';

const stroke = (overrides: Partial<CommandKeyStroke> = {}): CommandKeyStroke => ({
  key: 'a',
  altKey: false,
  ctrlKey: false,
  metaKey: true,
  shiftKey: false,
  ...overrides
});

describe('Cmd+A keyboard policy', () => {
  it('suppresses only plain Cmd+A on page content', () => {
    expect(shouldSuppressBrowserDocumentKey(stroke(), document.body)).toBe(true);
    expect(shouldSuppressBrowserDocumentKey(stroke({ key: 'A' }), document.body)).toBe(true);
    expect(shouldSuppressBrowserDocumentKey(stroke({ metaKey: false }), document.body)).toBe(false);
    expect(shouldSuppressBrowserDocumentKey(stroke({ ctrlKey: true }), document.body)).toBe(false);
    expect(shouldSuppressBrowserDocumentKey(stroke({ shiftKey: true }), document.body)).toBe(false);
    expect(shouldSuppressBrowserDocumentKey(stroke({ key: 'b' }), document.body)).toBe(false);
  });

  it('allows native selection in text inputs, textareas, and editable content', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const editable = document.createElement('div');
    const editableChild = document.createElement('span');
    editable.setAttribute('contenteditable', 'true');
    editable.appendChild(editableChild);

    expect(shouldSuppressBrowserDocumentKey(stroke(), input)).toBe(false);
    expect(shouldSuppressBrowserDocumentKey(stroke(), textarea)).toBe(false);
    expect(shouldSuppressBrowserDocumentKey(stroke(), editableChild)).toBe(false);
  });

  it('does not treat page content or non-text controls as text editors', () => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';

    expect(shouldSuppressBrowserDocumentKey(stroke(), document.createElement('button'))).toBe(true);
    expect(shouldSuppressBrowserDocumentKey(stroke(), checkbox)).toBe(true);
    expect(shouldSuppressBrowserDocumentKey(stroke(), null)).toBe(true);
  });

  it('blocks browser document commands and preserves native fullscreen', () => {
    for (const key of ['f', 'g', 'p', 'r', 's', 'u']) {
      expect(shouldSuppressBrowserDocumentKey(stroke({ key }), document.body)).toBe(true);
    }
    expect(
      shouldSuppressBrowserDocumentKey(stroke({ key: 'g', shiftKey: true }), document.body)
    ).toBe(true);
    expect(
      shouldSuppressBrowserDocumentKey(stroke({ altKey: true, key: 'u' }), document.body)
    ).toBe(true);
    expect(
      shouldSuppressBrowserDocumentKey(stroke({ key: 'f', ctrlKey: true }), document.body)
    ).toBe(false);
  });

  it('suppresses Cmd+R reload even while a text editor owns focus', () => {
    expect(
      shouldSuppressBrowserDocumentKey(stroke({ key: 'r' }), document.createElement('input'))
    ).toBe(true);
  });

  it('blocks browser history outside editors but preserves macOS text navigation', () => {
    const input = document.createElement('input');

    for (const key of ['[', ']', 'ArrowLeft', 'ArrowRight']) {
      expect(shouldSuppressBrowserDocumentKey(stroke({ key }), document.body)).toBe(true);
      expect(shouldSuppressBrowserDocumentKey(stroke({ key }), input)).toBe(false);
    }
    // Shift Command bracket is no history chord, so it reaches a native menu
    // accelerator, which a desktop shell skips if the page cancels it first.
    for (const key of ['[', ']']) {
      expect(shouldSuppressBrowserDocumentKey(stroke({ key, shiftKey: true }), document.body)).toBe(
        false
      );
    }
    expect(
      shouldSuppressBrowserDocumentKey(stroke({ key: 'Backspace', metaKey: false }), document.body)
    ).toBe(true);
    expect(
      shouldSuppressBrowserDocumentKey(stroke({ key: 'Backspace', metaKey: false }), input)
    ).toBe(false);
  });

  it('blocks page scrolling while leaving feature handlers reachable', () => {
    for (const key of [' ', 'PageUp', 'PageDown', 'Home', 'End']) {
      expect(shouldSuppressBrowserDocumentKey(stroke({ key, metaKey: false }), document.body)).toBe(
        true
      );
    }
  });

  it('leaves the page-scroll keys aimed into an open dialog to the dialog', () => {
    const dialog = document.createElement('div');
    const body = document.createElement('p');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.tabIndex = -1;
    dialog.append(body);

    for (const key of [' ', 'PageUp', 'PageDown', 'Home', 'End']) {
      expect(shouldSuppressBrowserDocumentKey(stroke({ key, metaKey: false }), dialog), key).toBe(
        false
      );
      expect(shouldSuppressBrowserDocumentKey(stroke({ key, metaKey: false }), body), key).toBe(
        false
      );
    }
    expect(
      shouldSuppressBrowserDocumentKey(stroke({ key: ' ', metaKey: false, shiftKey: true }), dialog)
    ).toBe(false);

    // A closed dialog holds nothing, and a plain surface outside one still swallows Space.
    dialog.setAttribute('aria-modal', 'false');
    expect(shouldSuppressBrowserDocumentKey(stroke({ key: ' ', metaKey: false }), dialog)).toBe(
      true
    );
    expect(
      shouldSuppressBrowserDocumentKey(
        stroke({ key: ' ', metaKey: false }),
        document.createElement('div')
      )
    ).toBe(true);
    // Browser document commands stay blocked inside a dialog.
    dialog.setAttribute('aria-modal', 'true');
    expect(shouldSuppressBrowserDocumentKey(stroke({ key: 'r' }), body)).toBe(true);
  });

  it('preserves native key behavior on controls and explicitly focusable surfaces', () => {
    const button = document.createElement('button');
    const checkbox = document.createElement('input');
    const scrollSurface = document.createElement('div');
    const nonEditable = document.createElement('div');
    checkbox.type = 'checkbox';
    scrollSurface.tabIndex = 0;
    nonEditable.setAttribute('contenteditable', 'false');

    expect(isNativeKeyboardTarget(button)).toBe(true);
    expect(isNativeKeyboardTarget(checkbox)).toBe(true);
    expect(isNativeKeyboardTarget(scrollSurface)).toBe(true);
    expect(isNativeKeyboardTarget(nonEditable)).toBe(false);
    expect(shouldSuppressBrowserDocumentKey(stroke({ key: ' ', metaKey: false }), button)).toBe(
      false
    );
    expect(
      shouldSuppressBrowserDocumentKey(stroke({ key: 'PageDown', metaKey: false }), scrollSurface)
    ).toBe(false);
  });
});

describe('isModalOpen', () => {
  it('reads any aria-modal element in the document, whoever owns it', () => {
    const root = document.createElement('div');

    expect(isModalOpen(root)).toBe(false);

    const dialog = document.createElement('div');
    dialog.setAttribute('aria-modal', 'true');
    root.append(dialog);
    expect(isModalOpen(root)).toBe(true);

    dialog.setAttribute('aria-modal', 'false');
    expect(isModalOpen(root)).toBe(false);
  });
});

describe('isOverlayOpen', () => {
  it('reads a modal surface or a marked overlay, and nothing else', () => {
    const root = document.createElement('div');
    const listbox = document.createElement('div');
    listbox.setAttribute('role', 'listbox');
    root.append(listbox);

    // A pane's own list is no overlay.
    expect(isOverlayOpen(root)).toBe(false);

    const dialog = document.createElement('div');
    dialog.setAttribute('aria-modal', 'true');
    root.append(dialog);
    expect(isOverlayOpen(root)).toBe(true);

    dialog.remove();
    const menu = document.createElement('div');
    menu.setAttribute('data-overlay', '');
    root.append(menu);
    // A menu that leaves the window's other keys alone is not modal, but still an overlay.
    expect(isModalOpen(root)).toBe(false);
    expect(isOverlayOpen(root)).toBe(true);

    // A view out of sight keeps its overlay mounted, and it holds nothing there.
    const panel = document.createElement('div');
    panel.hidden = true;
    root.append(panel);
    panel.append(menu);
    expect(isOverlayOpen(root)).toBe(false);

    panel.hidden = false;
    expect(isOverlayOpen(root)).toBe(true);

    menu.remove();
    expect(isOverlayOpen(root)).toBe(false);
  });
});
