import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { UiokProvider } from '../labels/UiokProvider.js';
import type { LegendPair } from './KeyLegend.logic.js';
import { paneKeyAction, type PaneKeyAction } from '../pane/PaneKeys.logic.js';
import { usePaneKeys } from '../pane/usePaneKeys.js';
import { KeyLegendStrip, type LegendAlert, type LegendVerb } from './KeyLegendStrip.js';

const PAIR_LABELS: Readonly<Record<string, string>> = { upDown: 'Up/Down' };
const pairLabel = (pair: LegendPair): string => PAIR_LABELS[pair] ?? pair;

const verb = (label: string, chord: LegendVerb['chord'], pair?: LegendPair): LegendVerb => ({
  label,
  chord,
  run: vi.fn(),
  ...(pair === undefined ? {} : { pair })
});

const verbs = (): LegendVerb[] => [
  verb('Move Up', { key: 'ArrowUp' }, 'upDown'),
  verb('Move Down', { key: 'ArrowDown' }, 'upDown'),
  verb('Copy', { key: 'c', meta: true })
];

describe('KeyLegendStrip', () => {
  it('lists each verb as a button named by its chord and label, out of the Tab order', () => {
    render(<KeyLegendStrip pairLabel={pairLabel} verbs={verbs()} />);

    const strip = screen.getByRole('contentinfo', { name: 'Keyboard shortcuts' });
    const group = within(strip).getByRole('group', { name: 'Verbs' });
    const copy = within(group).getByRole('button', { name: 'Command C Copy' });

    expect(copy.tabIndex).toBe(-1);
    expect(within(group).getAllByRole('button')).toHaveLength(3);
  });

  it('folds a pair into one place: a button per key cap and one shared label', () => {
    render(<KeyLegendStrip pairLabel={pairLabel} verbs={verbs()} />);

    const up = screen.getByRole('button', { name: 'Up Move Up' });
    const pair = up.closest('.keylegend-pair') as HTMLElement;

    expect(pair).not.toBeNull();
    expect(within(pair).getByRole('button', { name: 'Down Move Down' })).toBeTruthy();
    expect(pair.querySelector('.keylegend-pair-label')?.textContent).toBe('Up/Down');
    expect(up.dataset.tooltip).toBe('Move Up');
    expect(up.dataset.tooltipShortcut).toBe('↑');
  });

  it('keeps every verb in a place of its own without pair labels', () => {
    const { container } = render(<KeyLegendStrip verbs={verbs()} />);

    expect(container.querySelector('.keylegend-pair')).toBeNull();
    expect(screen.getByRole('button', { name: 'Up Move Up' }).className).toBe('');
  });

  it('runs a verb on click and leaves the focus where it was', () => {
    const list = verbs();
    render(
      <>
        <input aria-label="Field" />
        <KeyLegendStrip pairLabel={pairLabel} verbs={list} />
      </>
    );
    const field = screen.getByRole('textbox', { name: 'Field' });
    field.focus();

    const copy = screen.getByRole('button', { name: 'Command C Copy' });
    const pressed = fireEvent.mouseDown(copy);
    fireEvent.click(copy);
    fireEvent.click(screen.getByRole('button', { name: 'Down Move Down' }));

    expect(pressed).toBe(false);
    expect(list[2]?.run).toHaveBeenCalledOnce();
    expect(list[1]?.run).toHaveBeenCalledOnce();
    expect(list[0]?.run).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(field);
  });

  it('lights each held modifier in the dock and lets go of all on blur', () => {
    const { container } = render(<KeyLegendStrip verbs={verbs()} />);
    const held = (): number => container.querySelectorAll('.keylegend-key.held').length;

    expect(container.querySelector('.keylegend-dock-fn')?.textContent).toBe('fn');
    expect(held()).toBe(0);

    act(() => {
      fireEvent.keyDown(window, { key: 'Meta', metaKey: true, shiftKey: true });
    });
    expect(held()).toBe(2);

    act(() => {
      fireEvent.keyUp(window, { key: 'Shift', metaKey: true });
    });
    expect(held()).toBe(1);

    act(() => {
      fireEvent.blur(window);
    });
    expect(held()).toBe(0);
  });

  it('speaks its chrome in the words a provider supplies', () => {
    render(
      <UiokProvider
        labels={{
          keys: { names: { ArrowUp: 'Hoch' } },
          legend: {
            label: 'Tastenkürzel',
            verbs: 'Befehle',
            capName: (chord, verb) => `${verb} (${chord})`
          }
        }}
      >
        <KeyLegendStrip pairLabel={() => 'Hoch/Runter'} verbs={verbs()} />
      </UiokProvider>
    );

    const strip = screen.getByRole('contentinfo', { name: 'Tastenkürzel' });

    expect(within(strip).getByRole('group', { name: 'Befehle' })).toBeTruthy();
    expect(within(strip).getByRole('button', { name: 'Move Up (Hoch)' })).toBeTruthy();
    expect(strip.querySelector('.keylegend-pair-label')?.textContent).toBe('Hoch/Runter');
  });

  it('fills a held dock key with the accent, outside any listing scope', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const { container } = render(<KeyLegendStrip verbs={verbs()} />);

    act(() => {
      fireEvent.keyDown(window, { key: 'Alt', altKey: true });
    });
    const key = container.querySelector('.keylegend-key.held') as HTMLElement;

    expect(declaredValues(key, 'background')).toContain('var(--accent)');
    expect(declaredValues(key, 'color')).toContain('var(--on-accent)');
  });

  it('gives a single place a tooltip naming its verb and chord', () => {
    render(<KeyLegendStrip verbs={verbs()} />);

    const copy = screen.getByRole('button', { name: 'Command C Copy' });

    expect(copy.dataset.tooltip).toBe('Copy');
    expect(copy.dataset.tooltipShortcut).toBe('⌘C');
  });

  it('draws no overflow chip by default', () => {
    const { container } = render(<KeyLegendStrip verbs={verbs()} />);

    expect(container.querySelector('.keylegend-more')).toBeNull();
  });

  describe('with overflow="more"', () => {
    const many = (): LegendVerb[] => [
      verb('Open', { key: 'Enter' }),
      verb('Copy', { key: 'c', meta: true }),
      verb('Delete', { key: 'Backspace', meta: true }),
      verb('Refresh', { key: 'r', meta: true })
    ];

    /** Lays the strip out as if the last `count` places wrapped off the line. */
    const wrapLast = (count: number): (() => void) => {
      const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop');
      Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
        configurable: true,
        get(this: HTMLElement) {
          const row = this.parentElement;
          if (row?.classList.contains('keylegend-verbs') !== true) {
            return 0;
          }
          const at = [...row.children].indexOf(this);
          return at >= row.children.length - count ? 24 : 0;
        }
      });
      return () => {
        if (original !== undefined) {
          Object.defineProperty(HTMLElement.prototype, 'offsetTop', original);
        }
      };
    };

    it('keeps a hidden, disabled chip while every place fits', () => {
      const { container } = render(<KeyLegendStrip overflow="more" verbs={many()} />);
      const chip = container.querySelector('.keylegend-more') as HTMLButtonElement;

      expect(chip.disabled).toBe(true);
      expect(chip.dataset.empty).toBe('true');
      expect(chip.getAttribute('aria-hidden')).toBe('true');
    });

    it('counts the places that wrapped and lists their verbs with chords', () => {
      const restore = wrapLast(2);
      try {
        const list = many();
        render(
          <>
            <input aria-label="Field" />
            <KeyLegendStrip overflow="more" verbs={list} />
          </>
        );
        const field = screen.getByRole('textbox', { name: 'Field' });
        field.focus();

        const chip = screen.getByRole('button', { name: '2 more shortcuts' });
        expect(fireEvent.mouseDown(chip)).toBe(false);
        expect(chip.textContent).toBe('+2');
        expect(chip.getAttribute('aria-haspopup')).toBe('menu');

        fireEvent.click(chip);
        const menu = screen.getByRole('menu', { name: '2 more shortcuts' });
        const items = within(menu).getAllByRole('menuitem');

        expect(items.map((item) => item.querySelector('.row-name')?.textContent)).toEqual([
          'Delete',
          'Refresh'
        ]);
        expect(chip.getAttribute('aria-expanded')).toBe('true');
        expect(document.activeElement).toBe(menu);

        fireEvent.keyDown(menu, { key: 'ArrowDown' });
        fireEvent.keyDown(menu, { key: 'Enter' });

        expect(list[3]?.run).toHaveBeenCalledOnce();
        expect(screen.queryByRole('menu')).toBeNull();
        expect(document.activeElement).toBe(field);
      } finally {
        restore();
      }
    });

    it("opens its list above the chip, ending at the chip's inline end in either direction", () => {
      applyStylesheets(readStylesheet('src/styles.css'));
      const restore = wrapLast(1);
      try {
        // jsdom resolves no logical inset to a side, so this reads what the
        // rules declare: the inline end at 0 follows the box's own
        // direction (right, or left right to left, an LTR footer inside an
        // RTL page keeping the right), with no :dir() rule for a bundler to
        // rewrite into :lang() selectors.
        render(
          <div dir="rtl">
            <div dir="ltr">
              <KeyLegendStrip overflow="more" verbs={many()} />
            </div>
          </div>
        );

        fireEvent.click(screen.getByRole('button', { name: '1 more shortcut' }));
        const menu = screen.getByRole('menu');

        expect(getComputedStyle(menu).top).toBe('auto');
        expect(declaredValues(menu, 'inset-inline').at(-1)).toBe('auto 0');
        expect(
          readStylesheet('src/legend/legend.css').replace(/\/\*[\s\S]*?\*\//g, '')
        ).not.toMatch(/:dir\(/);
      } finally {
        restore();
      }
    });

    it('closes its list on Escape without running anything', () => {
      const restore = wrapLast(1);
      try {
        const list = many();
        render(
          <>
            <input aria-label="Field" />
            <KeyLegendStrip overflow="more" verbs={list} />
          </>
        );
        const field = screen.getByRole('textbox', { name: 'Field' });
        field.focus();

        const chip = screen.getByRole('button', { name: '1 more shortcut' });
        fireEvent.click(chip);
        fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

        expect(screen.queryByRole('menu')).toBeNull();
        expect(
          list.every((entry) => !(entry.run as ReturnType<typeof vi.fn>).mock.calls.length)
        ).toBe(true);
        expect(document.activeElement).toBe(field);
      } finally {
        restore();
      }
    });

    it('runs a folded verb on click', () => {
      const restore = wrapLast(1);
      try {
        const list = many();
        render(<KeyLegendStrip overflow="more" verbs={list} />);

        fireEvent.click(screen.getByRole('button', { name: '1 more shortcut' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Command R Refresh' }));

        expect(list[3]?.run).toHaveBeenCalledOnce();
      } finally {
        restore();
      }
    });
  });

  describe('with an alert', () => {
    // Keys a person presses come at distinct times, and the strip tells the
    // key that raised an alert from a later one by when each happened; jsdom
    // stamps events with Date.now(), so the clock moves on before each key.
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    /** Presses `init`'s key on `target` a moment after the last. */
    const press = (target: Element, init: KeyboardEventInit): void => {
      vi.setSystemTime(Date.now() + 50);
      fireEvent.keyDown(target, init);
    };
    /** A host that refuses x with an alert, which the legend asks it to clear. */
    function Refusing({ onDismiss }: { readonly onDismiss: () => void }): ReactElement {
      const [alert, setAlert] = useState<LegendAlert | null>(null);

      return (
        <>
          <input
            aria-label="Field"
            onKeyDown={(event) => {
              if (event.key === 'x') setAlert({ text: 'Nothing to open here' });
            }}
          />
          <KeyLegendStrip
            alert={alert}
            onAlertDismiss={(dismissed) => {
              onDismiss();
              setAlert((now) => (now === dismissed ? null : now));
            }}
            verbs={verbs()}
          />
        </>
      );
    }

    it('shows the alert beside the verbs in a polite live region that is always there', () => {
      const { rerender } = render(<KeyLegendStrip verbs={verbs()} />);
      const region = screen.getByRole('status');

      expect(region.textContent).toBe('');
      rerender(<KeyLegendStrip alert={{ text: 'Nothing to open here' }} verbs={verbs()} />);
      expect(screen.getByRole('status')).toBe(region);
      expect(region.textContent).toBe('Nothing to open here');
      expect(region.closest('footer')?.getAttribute('aria-label')).toBe('Keyboard shortcuts');
    });

    it('cuts a long alert with an ellipsis, whole in its tooltip, in the warning’s words', () => {
      applyStylesheets(readStylesheet('src/styles.css'));
      render(<KeyLegendStrip alert={{ text: 'Nothing to open here' }} verbs={verbs()} />);
      const text = screen.getByRole('status').firstElementChild as HTMLElement;

      expect(text.dataset.tooltip).toBe('Nothing to open here');
      expect(text.hasAttribute('data-tooltip-cut')).toBe(true);
      expect(declaredValues(text, 'text-overflow').at(-1)).toBe('ellipsis');
      expect(declaredValues(text, 'overflow').at(-1)).toBe('hidden');
      expect(declaredValues(text, 'white-space').at(-1)).toBe('nowrap');
      expect(declaredValues(text, 'color').at(-1)).toBe('var(--warning-text)');
      expect(declaredValues(text, 'margin-inline-start').at(-1)).toBe('var(--space-6)');
    });

    it('asks the host to clear it on the next key, not the one that raised it nor a modifier alone', () => {
      const onDismiss = vi.fn();
      render(<Refusing onDismiss={onDismiss} />);
      const field = screen.getByRole('textbox', { name: 'Field' });

      press(field, { key: 'x' });
      expect(screen.getByRole('status').textContent).toBe('Nothing to open here');

      for (const key of ['Shift', 'AltGraph']) press(field, { key });
      expect(screen.getByRole('status').textContent).toBe('Nothing to open here');

      press(field, { key: 'ArrowDown' });
      expect(onDismiss).toHaveBeenCalled();
      expect(screen.getByRole('status').textContent).toBe('');
      const calls = onDismiss.mock.calls.length;

      // Cleared, the next key asks nothing.
      press(field, { key: 'ArrowDown' });
      expect(onDismiss).toHaveBeenCalledTimes(calls);
    });

    /**
     * A view whose two-pane keys refuse ⌘O and ⌘⌫, each with an alert, and a
     * legend that shows it: inside the view from the start (its listener
     * added first), or mounted after (added last).
     */
    function RefusingView({ legendLater }: { readonly legendLater: boolean }): ReactElement {
      const [alert, setAlert] = useState<LegendAlert | null>(null);
      const [legend, setLegend] = useState(!legendLater);
      const panes = usePaneKeys<PaneKeyAction, object>({
        shown: true,
        loaded: true,
        initialPane: 'main',
        page: 'page',
        sidebarKeys: [],
        openKey: null,
        readVerbs: () => ({}),
        noVerbs: {},
        follows: [],
        readKey: paneKeyAction,
        cursorKey: () => false,
        run: (action) => {
          if (action.kind === 'chord' && action.letter === 'o') {
            setAlert({ text: 'Nothing to open' });
          }
          if (action.kind === 'remove') setAlert({ text: 'Nothing to remove' });
        }
      });

      return (
        <div ref={panes.rootRef}>
          <button onClick={() => setLegend(true)} type="button">
            Show legend
          </button>
          <div className="pane" ref={panes.mainRef}>
            <div aria-label="Page" data-pane-home="page" tabIndex={-1} />
          </div>
          {legend ? (
            <KeyLegendStrip
              alert={alert}
              onAlertDismiss={(dismissed) => setAlert((now) => (now === dismissed ? null : now))}
              verbs={verbs()}
            />
          ) : null}
        </div>
      );
    }

    /**
     * A host that raises its refusal of x from a window listener of its own,
     * committed at once (`flushSync`), so the alert is the strip's before
     * the strip's own listener hears the same key.
     */
    function CommittingHost(): ReactElement {
      const [alert, setAlert] = useState<LegendAlert | null>(null);

      raise = (text) => flushSync(() => setAlert({ text }));
      return (
        <KeyLegendStrip
          alert={alert}
          onAlertDismiss={(dismissed) => setAlert((now) => (now === dismissed ? null : now))}
          verbs={verbs()}
        />
      );
    }

    let raise: (text: string) => void = () => undefined;
    const refuseX = (event: KeyboardEvent): void => {
      if (event.key === 'x') raise('Nothing to open here');
    };

    for (const hostFirst of [true, false]) {
      it(`keeps an alert committed at once by the key that raised it, the host's listener added ${hostFirst ? 'first' : 'last'}`, () => {
        if (hostFirst) window.addEventListener('keydown', refuseX, true);
        render(<CommittingHost />);
        if (!hostFirst) window.addEventListener('keydown', refuseX, true);
        try {
          const said = (): string | null => screen.getByRole('status').textContent;

          press(document.body, { key: 'x' });
          expect(said()).toBe('Nothing to open here');
          // Raised again while one shows: the new one stays.
          press(document.body, { key: 'x' });
          expect(said()).toBe('Nothing to open here');
          press(document.body, { key: 'ArrowDown' });
          expect(said()).toBe('');
        } finally {
          window.removeEventListener('keydown', refuseX, true);
        }
      });
    }

    it('puts a new node in the live region for a repeat of the same words', () => {
      const { rerender } = render(
        <KeyLegendStrip alert={{ text: 'Nothing to remove' }} verbs={verbs()} />
      );
      const region = screen.getByRole('status');
      const first = region.firstElementChild;
      const changes: MutationRecord[] = [];
      const observer = new MutationObserver((records) => changes.push(...records));

      observer.observe(region, { childList: true, subtree: true, characterData: true });
      rerender(<KeyLegendStrip alert={{ text: 'Nothing to remove' }} verbs={verbs()} />);
      changes.push(...observer.takeRecords());
      observer.disconnect();

      expect(region.textContent).toBe('Nothing to remove');
      expect(region.firstElementChild).not.toBe(first);
      expect(changes.some((change) => change.addedNodes.length > 0)).toBe(true);
      // The same alert drawn again is the same node: nothing new to say.
      const shown = { text: 'Nothing to remove' };
      rerender(<KeyLegendStrip alert={shown} verbs={verbs()} />);
      const node = region.firstElementChild;
      rerender(<KeyLegendStrip alert={shown} verbs={verbs()} />);
      expect(region.firstElementChild).toBe(node);
    });

    for (const legendLater of [false, true]) {
      it(`shows every refusal of keys in a row, the legend’s listener added ${legendLater ? 'last' : 'first'}`, () => {
        render(<RefusingView legendLater={legendLater} />);
        if (legendLater) fireEvent.click(screen.getByRole('button', { name: 'Show legend' }));
        const page = screen.getByLabelText('Page');
        const said = (): string | null => screen.getByRole('status').textContent;

        page.focus();
        press(page, { key: 'o', metaKey: true });
        expect(said()).toBe('Nothing to open');
        // A different refusal on the next key replaces it.
        press(page, { key: 'Backspace', metaKey: true });
        expect(said()).toBe('Nothing to remove');
        // The same words again stay too: the alert is a new one.
        press(page, { key: 'Backspace', metaKey: true });
        expect(said()).toBe('Nothing to remove');
        // A key nothing refuses clears it.
        press(page, { key: 'ArrowDown' });
        expect(said()).toBe('');
      });
    }
  });
});
