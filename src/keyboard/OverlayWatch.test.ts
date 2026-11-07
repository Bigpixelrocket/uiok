import { afterEach, describe, expect, it, vi } from 'vitest';

import { isModalOpen, isOverlayOpen } from './Keyboard.logic.js';
import { watchOverlays } from './OverlayWatch.js';

const element = (attributes: Readonly<Record<string, string>> = {}): HTMLDivElement => {
  const node = document.createElement('div');

  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, value);
  }

  return node;
};

/** Both answers, as the watch gives them and as a walk of the whole document does. */
const answers = (): Record<string, boolean> => ({
  modal: watchOverlays(document).modalOpen(),
  overlay: watchOverlays(document).overlayOpen(),
  modalWalked: isModalOpen(document),
  overlayWalked: isOverlayOpen(document)
});

const agreed = (modal: boolean, overlay: boolean): Record<string, boolean> => ({
  modal,
  overlay,
  modalWalked: modal,
  overlayWalked: overlay
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('watchOverlays', () => {
  it('is one watch per document', () => {
    expect(watchOverlays(document)).toBe(watchOverlays(document));
  });

  it('answers at once, before the observer delivers, for every kind of overlay', () => {
    const dialog = element({ 'aria-modal': 'true' });
    const menu = element({ 'data-overlay': '' });

    expect(answers()).toEqual(agreed(false, false));

    document.body.append(dialog);
    expect(answers()).toEqual(agreed(true, true));

    dialog.remove();
    expect(answers()).toEqual(agreed(false, false));

    // A menu that leaves the window's other keys alone is an overlay, not modal.
    document.body.append(menu);
    expect(answers()).toEqual(agreed(false, true));

    menu.remove();
    expect(answers()).toEqual(agreed(false, false));
  });

  it('finds an overlay deep inside a subtree added whole, and drops it with the subtree', () => {
    const outer = element();
    const inner = element();
    const palette = element({ role: 'dialog', 'aria-modal': 'true' });

    inner.append(palette);
    outer.append(inner);
    document.body.append(outer);
    expect(answers()).toEqual(agreed(true, true));

    outer.remove();
    expect(answers()).toEqual(agreed(false, false));
  });

  it('follows an overlay added and taken away again before anything asked', () => {
    const dialog = element({ 'aria-modal': 'true' });

    document.body.append(dialog);
    dialog.remove();
    expect(answers()).toEqual(agreed(false, false));

    const host = element();
    document.body.append(host);
    host.append(dialog);
    expect(answers()).toEqual(agreed(true, true));
  });

  it('follows aria-modal and data-overlay set, changed, and removed on a mounted element', () => {
    const surface = element();
    document.body.append(surface);
    expect(answers()).toEqual(agreed(false, false));

    surface.setAttribute('aria-modal', 'true');
    expect(answers()).toEqual(agreed(true, true));

    surface.setAttribute('aria-modal', 'false');
    expect(answers()).toEqual(agreed(false, false));

    surface.setAttribute('data-overlay', '');
    expect(answers()).toEqual(agreed(false, true));

    surface.removeAttribute('data-overlay');
    expect(answers()).toEqual(agreed(false, false));
  });

  it('holds nothing for an overlay in a hidden panel, but a modal one still counts as modal', () => {
    const panel = element();
    const find = element({ 'data-overlay': '' });
    const dialog = element({ 'aria-modal': 'true' });

    panel.append(find);
    document.body.append(panel);
    expect(answers()).toEqual(agreed(false, true));

    panel.hidden = true;
    expect(answers()).toEqual(agreed(false, false));

    // `isModalOpen` reads every modal surface, in view or not; only the
    // overlay report leaves out a hidden one.
    panel.append(dialog);
    expect(answers()).toEqual(agreed(true, false));

    panel.hidden = false;
    expect(answers()).toEqual(agreed(true, true));
  });

  it('tells its listeners after each change, including changes an answer took first', async () => {
    const overlays = watchOverlays(document);
    const listener = vi.fn();
    const unsubscribe = overlays.subscribe(listener);
    const menu = element({ 'data-overlay': '' });

    document.body.append(menu);
    await vi.waitFor(() => expect(listener).toHaveBeenCalled());
    listener.mockClear();

    // The answer takes the record the observer would have delivered, and the
    // listener still hears of the change.
    menu.remove();
    expect(overlays.overlayOpen()).toBe(false);
    await vi.waitFor(() => expect(listener).toHaveBeenCalled());
    listener.mockClear();

    // A panel shown or hidden is a change too, though no node came or went.
    const panel = element();
    document.body.append(panel);
    panel.append(menu);
    await vi.waitFor(() => expect(listener).toHaveBeenCalled());
    listener.mockClear();
    panel.hidden = true;
    await vi.waitFor(() => expect(listener).toHaveBeenCalled());
    expect(overlays.overlayOpen()).toBe(false);

    unsubscribe();
    listener.mockClear();
    panel.hidden = false;
    await Promise.resolve();
    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();
  });

  it('agrees with a walk of the document through a run of mixed changes', () => {
    const nodes: HTMLElement[] = [];
    const kinds: readonly Readonly<Record<string, string>>[] = [
      { 'aria-modal': 'true' },
      { 'data-overlay': '' },
      {},
      { 'aria-modal': 'false' }
    ];
    let seed = 7;
    const next = (bound: number): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % bound;
    };

    for (let step = 0; step < 400; step += 1) {
      const action = next(6);
      const target = nodes[next(Math.max(nodes.length, 1))];

      const parent = nodes[next(nodes.length + 1)] ?? document.body;

      if (action === 0 || target === undefined) {
        const node = element(kinds[next(kinds.length)]);
        parent.append(node);
        nodes.push(node);
      } else if (action === 1) {
        // Moves a subtree, back into the document or out of sight in a
        // detached one.
        if (!target.contains(parent)) {
          parent.append(target);
        }
      } else if (action === 2) {
        target.remove();
      } else if (action === 3) {
        target.hidden = !target.hidden;
      } else if (action === 4) {
        target.toggleAttribute('data-overlay');
      } else {
        target.setAttribute(
          'aria-modal',
          target.getAttribute('aria-modal') === 'true' ? 'false' : 'true'
        );
      }

      // Every few steps, so some batches hold several records.
      if (step % 3 === 0) {
        const now = answers();
        expect(now.modal).toBe(now.modalWalked);
        expect(now.overlay).toBe(now.overlayWalked);
      }
    }
  });
});
