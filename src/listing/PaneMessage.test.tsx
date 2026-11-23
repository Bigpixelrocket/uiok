import { render, screen } from '@testing-library/react';
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
  });
});
