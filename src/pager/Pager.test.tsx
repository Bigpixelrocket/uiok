import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UiokProvider } from '../labels/UiokProvider.js';
import { Pager } from './Pager.js';

describe('Pager', () => {
  it('draws nothing for a list of one page', () => {
    const { container } = render(<Pager onPage={() => undefined} page={0} pages={1} />);

    expect(container.innerHTML).toBe('');
  });

  it('names its steps and menu by what the pages are of, and pages through them', () => {
    const onPage = vi.fn();

    render(<Pager kind="rows" onPage={onPage} page={2} pages={5} />);

    expect(screen.getByRole('navigation', { name: 'Pages of rows' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Begin page of rows' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous page of rows' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page of rows' }));
    fireEvent.click(screen.getByRole('button', { name: 'End page of rows' }));
    expect(onPage.mock.calls).toEqual([[0], [1], [3], [4]]);

    const menu = screen.getByRole('combobox', { name: 'Page of rows' }) as HTMLSelectElement;

    expect(menu.value).toBe('3');
    expect(screen.getByRole('option', { name: '3 of 5' })).toBeDefined();
    fireEvent.change(menu, { target: { value: '5' } });
    expect(onPage).toHaveBeenLastCalledWith(4);
  });

  it('disables the steps back on the first page, End before the end is known, and both onward past a stop', () => {
    const { rerender } = render(
      <Pager endKnown={false} onPage={() => undefined} page={0} pages={5} />
    );
    const step = (name: RegExp): HTMLButtonElement =>
      screen.getByRole('button', { name }) as HTMLButtonElement;

    expect(step(/^Begin/).disabled).toBe(true);
    expect(step(/^Previous/).disabled).toBe(true);
    expect(step(/^Next/).disabled).toBe(false);
    expect(step(/^End/).disabled).toBe(true);

    rerender(<Pager forward={false} onPage={() => undefined} page={1} pages={5} />);
    expect(step(/^Previous/).disabled).toBe(false);
    expect(step(/^Next/).disabled).toBe(true);
    expect(step(/^End/).disabled).toBe(true);
  });

  it('keeps every step in its place in each look, so nothing moves between pages', () => {
    const { container, rerender } = render(<Pager onPage={() => undefined} page={0} pages={3} />);

    expect(container.querySelectorAll('button.pager-step')).toHaveLength(4);

    rerender(<Pager look="text" onPage={() => undefined} page={0} pages={3} />);
    expect(container.querySelectorAll('button.pager-step.worded')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Next page of items' }).textContent).toBe('Next');
  });

  it('takes its words and page numbers from the labels provider', () => {
    render(
      <UiokProvider
        labels={{
          pager: {
            pages: (kind) => `Seiten: ${kind}`,
            pageOption: (page, pages) => `${page}/${pages}`
          }
        }}
      >
        <Pager kind="Zeilen" onPage={() => undefined} page={0} pages={1200} />
      </UiokProvider>
    );

    expect(screen.getByRole('navigation', { name: 'Seiten: Zeilen' })).toBeDefined();
    expect(screen.getByRole('option', { name: '1/1200' })).toBeDefined();
  });

  it('groups the digits of the English page numbers', () => {
    render(<Pager onPage={() => undefined} page={0} pages={1200} />);

    expect(screen.getByRole('option', { name: '1 of 1,200' })).toBeDefined();
  });

  it('matches a toolbar’s 24px fields in the small size, and a row’s 20px ones unless given', () => {
    const { unmount } = render(<Pager onPage={() => undefined} page={0} pages={3} />);

    expect(screen.getByRole('navigation').className).toBe('pager');
    expect(screen.getByRole('combobox').classList).toContain('field-xs');
    unmount();

    render(<Pager onPage={() => undefined} page={0} pages={3} size="small" />);
    expect(screen.getByRole('navigation').classList).toContain('pager-small');
    expect(screen.getByRole('combobox').classList).toContain('field-sm');
  });
});
