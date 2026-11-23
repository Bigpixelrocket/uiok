import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
});
