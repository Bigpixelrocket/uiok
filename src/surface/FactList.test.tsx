import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { PageSlot, PanePage, SideBySide } from '../frame/index.js';
import { PaneBox, PaneList } from '../pane/Pane.js';
import { Card } from './Card.js';

import { Fact, FactColumns, FactList } from './FactList.js';

describe('FactList', () => {
  it('names the list by its heading and pairs each name with its value', () => {
    render(
      <FactColumns>
        <FactList title="Command">
          <Fact name="Runs">php artisan serve --port=8000</Fact>
          <Fact name="In">~/Developer/shop</Fact>
        </FactList>
      </FactColumns>
    );

    const list = screen.getByRole('region', { name: 'Command' });
    const terms = list.querySelectorAll('dt');
    const values = list.querySelectorAll('dd');

    expect(screen.getByRole('heading', { name: 'Command', level: 3 })).toBeTruthy();
    expect([...terms].map((term) => term.textContent)).toEqual(['Runs', 'In']);
    expect(values[0]?.textContent).toBe('php artisan serve --port=8000');
    expect(list.closest('.fact-columns')).not.toBeNull();
  });

  it('takes an accessible name of its own over its heading', () => {
    render(
      <FactList label="Crash details" title="Crash">
        <Fact name="Exit">1</Fact>
      </FactList>
    );

    expect(screen.getByRole('region', { name: 'Crash details' })).toBeTruthy();
  });

  it('marks a value in a tone and keeps printed lines as printed', () => {
    render(
      <FactList title="Crash">
        <Fact name="Exit" tone="danger">
          exited 1
        </Fact>
        <Fact name="Printed" printed>
          {'Error: listen EADDRINUSE\n    at Server.listen'}
        </Fact>
      </FactList>
    );

    expect(screen.getByText('exited 1').closest('.fact-list-item')?.getAttribute('data-tone')).toBe(
      'danger'
    );
    expect(screen.getByText(/EADDRINUSE/).classList.contains('printed')).toBe(true);
  });

  it('keeps the rows’ inset from the pane’s edge set straight in a pane’s body, and only there', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const inset = 'var(--space-4) var(--pane-row-inset)';
    const facts = (title: string) => (
      <FactList title={title}>
        <Fact name="Runs">php artisan serve</Fact>
      </FactList>
    );
    render(
      <div className="listing-root">
        <PaneBox>
          <PaneList label="Overview">{facts('In a list')}</PaneList>
        </PaneBox>
        <PaneBox>
          <PanePage>
            <FactColumns>
              {facts('In columns')}
              {facts('Beside it')}
            </FactColumns>
          </PanePage>
        </PaneBox>
        <PaneBox>
          <PageSlot shown>{facts('In a slot')}</PageSlot>
        </PaneBox>
        <PaneBox>
          <SideBySide
            first={facts('First part')}
            firstLabel="First"
            from={640}
            second={facts('Second part')}
            secondLabel="Second"
          />
        </PaneBox>
        <PaneList label="Cards">
          <Card>{facts('In a card')}</Card>
        </PaneList>
      </div>
    );
    const padding = (name: string) =>
      declaredValues(screen.getByRole('region', { name }), 'padding').at(-1);
    const columns = screen.getByRole('region', { name: 'In columns' }).parentElement as HTMLElement;

    expect(padding('In a list')).toBe(inset);
    expect(declaredValues(columns, 'padding').at(-1)).toBe(inset);
    expect(padding('In a slot')).toBe(inset);
    expect(padding('First part')).toBe(inset);
    // The row of lists insets them once; a card is its own container.
    expect(padding('In columns')).toBeUndefined();
    expect(padding('In a card')).toBeUndefined();
  });
});
