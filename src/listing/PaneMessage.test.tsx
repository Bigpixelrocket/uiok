import { render, screen } from '@testing-library/react';
import { Info } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { ModalDialog } from '../dialog/ModalDialog.js';
import { PageNote } from '../frame/PageParts.js';
import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { PaneMessage } from './PaneMessage.js';

/**
 * Whether a rule drawing the tone's own glyph (a `::before`) reaches
 * `message`: jsdom matches no pseudo-element, so each such rule's selector
 * is read without it.
 */
const drawsToneGlyph = (message: Element): boolean =>
  [...document.styleSheets]
    .flatMap((sheet) => [...sheet.cssRules])
    .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
    .filter((rule) => rule.selectorText.endsWith('::before'))
    .some((rule) => message.matches(rule.selectorText.replace(/::before$/, '')));

describe('PaneMessage and PageNote outside a listing scope', () => {
  it('carry the scope themselves, so they keep their look anywhere', () => {
    render(
      <>
        <PaneMessage>Start the server to see its databases.</PaneMessage>
        <PageNote>Installs from the tap.</PageNote>
      </>
    );

    expect(
      screen.getByText('Start the server to see its databases.').closest('.pane-message')
        ?.parentElement?.className
    ).toBe('listing-root');
    expect(screen.getByText('Installs from the tap.').closest('.listing-root')).not.toBeNull();
  });

  it('add no second scope inside one', () => {
    render(
      <ModalDialog labelId="d" onCancel={() => undefined} title="Install">
        <PaneMessage tone="warning">The tap is not trusted.</PaneMessage>
      </ModalDialog>
    );

    const message = screen.getByText('The tap is not trusted.').closest('p') as HTMLElement;

    expect(message.className).toBe('pane-message warning');
    expect(message.parentElement?.getAttribute('role')).toBe('dialog');
  });

  it("draws no second glyph where the host leads the words with its own, and tones the host's", () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    render(
      <>
        <PaneMessage tone="warning">
          <svg data-testid="own-warning" />
          Slow query
        </PaneMessage>
        <PaneMessage tone="danger">
          <svg />
          Refused
        </PaneMessage>
        <PaneMessage tone="warning">Plain warning</PaneMessage>
        <PaneMessage tone="danger">Plain refusal</PaneMessage>
      </>
    );
    const message = (text: string): Element => screen.getByText(text).closest('.pane-message')!;

    expect(drawsToneGlyph(message('Slow query'))).toBe(false);
    expect(drawsToneGlyph(message('Refused'))).toBe(false);
    expect(drawsToneGlyph(message('Plain warning'))).toBe(true);
    expect(drawsToneGlyph(message('Plain refusal'))).toBe(true);
    expect(declaredValues(screen.getByTestId('own-warning'), 'color').at(-1)).toBe(
      'var(--warning)'
    );
    expect(declaredValues(message('Refused').querySelector('svg') as Element, 'color').at(-1)).toBe(
      'var(--danger)'
    );
  });

  it('leads with the icon given, its words hanging beside it, the tone’s glyph left out', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    render(
      <PaneMessage icon={Info} tone="warning">
        Slow query
      </PaneMessage>
    );
    const message = screen.getByText('Slow query').closest('.pane-message') as HTMLElement;
    const words = message.querySelector('.pane-message-text') as HTMLElement;
    const glyph = words.firstElementChild as Element;

    expect(glyph.tagName.toLowerCase()).toBe('svg');
    expect(glyph.getAttribute('aria-hidden')).toBe('true');
    expect(words.classList.contains('pane-message-led')).toBe(true);
    expect(declaredValues(words, 'padding-inline-start').at(-1)).toBe(
      'calc(var(--icon-md) + var(--space-4))'
    );
    expect(declaredValues(glyph, 'width').at(-1)).toBe('var(--icon-md)');
    expect(declaredValues(glyph, 'color').at(-1)).toBe('var(--warning)');
    expect(drawsToneGlyph(message)).toBe(false);
  });

  it('keeps an icon inside the sentence in the words, with no hanging indent, the tone’s glyph kept', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    render(
      <>
        <PaneMessage tone="danger">
          Press <svg data-testid="inline" /> to run.
        </PaneMessage>
        <PaneMessage>
          {' '}
          <svg data-testid="leading" />
          Older hosts lead with their own glyph.
        </PaneMessage>
      </>
    );
    const inline = screen.getByTestId('inline');
    const words = inline.parentElement as HTMLElement;

    expect(words.classList.contains('pane-message-led')).toBe(false);
    expect(declaredValues(words, 'padding-inline-start')).toEqual([]);
    expect(declaredValues(words, 'text-indent')).toEqual([]);
    expect(declaredValues(inline, 'width')).toEqual([]);
    expect(declaredValues(inline, 'color')).toEqual([]);
    expect(drawsToneGlyph(words.closest('.pane-message') as Element)).toBe(true);
    // A glyph first in the words, blank space aside, still leads them.
    expect(
      screen.getByTestId('leading').parentElement?.classList.contains('pane-message-led')
    ).toBe(true);
  });
});
