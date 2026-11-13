import { render, screen } from '@testing-library/react';
import { Server, SquareTerminal, Trash2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { shownItems, type DialogItem } from './DialogLists.js';

/** `count` saved servers, each with its host as the detail. */
const servers = (count: number): DialogItem[] =>
  Array.from({ length: count }, (_, index) => ({
    name: `server-${index + 1}`,
    detail: `db${index + 1}.example.com`
  }));

/** A server delete confirmation over `count` servers. */
function renderDelete(count: number, items: readonly DialogItem[] = servers(count)) {
  const itemCount = items.length < count ? count : undefined;

  render(
    <ConfirmDialog
      confirmLabel="Delete"
      icon={Trash2}
      itemCount={itemCount}
      itemIcon={Server}
      items={items}
      message={`This removes ${count.toLocaleString('en-US')} servers from the list. Their databases stay where they are.`}
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
      title={count === 1 ? 'Delete Server?' : 'Delete Servers?'}
    />
  );

  return screen.getByRole('dialog');
}

/** The rows the list draws: each one's name, or its whole text for the "+N more" row. */
const rows = () =>
  screen
    .getAllByRole('listitem')
    .map((row) => row.querySelector('.dialog-item-name')?.textContent ?? row.textContent);

describe('ConfirmDialog items', () => {
  it.each([
    [1, ['server-1']],
    [3, ['server-1', 'server-2', 'server-3']],
    [5, ['server-1', 'server-2', 'server-3', 'server-4', 'server-5']],
    [6, ['server-1', 'server-2', 'server-3', 'server-4', 'server-5', '+1 more']],
    [10, ['server-1', 'server-2', 'server-3', 'server-4', 'server-5', '+5 more']],
    [1000, ['server-1', 'server-2', 'server-3', 'server-4', 'server-5', '+995 more']]
  ])('draws %i items as the same framed list, five in full then "+N more"', (count, expected) => {
    const dialog = renderDelete(count);

    expect(rows()).toEqual(expected);
    // One list, one width, whatever the count; never a fact row.
    expect(dialog.querySelectorAll('ul.dialog-items')).toHaveLength(1);
    expect(dialog.classList.contains('confirm-items')).toBe(true);
    expect(dialog.querySelector('.dialog-facts')).toBeNull();
    // Each drawn item has its kind's glyph and its detail.
    const first = dialog.querySelector('.dialog-item');

    expect(first?.querySelector('svg.dialog-item-glyph')).toBeTruthy();
    expect(first?.querySelector('.dialog-item-detail')?.textContent).toBe('db1.example.com');
  });

  it('counts a total larger than the items a host passes', () => {
    renderDelete(1000, servers(5));

    expect(rows().at(-1)).toBe('+995 more');
    expect(shownItems(5, 1000)).toEqual({ shown: 5, more: 995 });
    expect(shownItems(3)).toEqual({ shown: 3, more: 0 });
  });

  it('wraps a long name, up to three lines, before it cuts it, with its text as a tooltip', () => {
    applyStylesheets(readStylesheet('src/dialog/dialog.css'));
    const name = 'analytics-warehouse-replica-eu-central-1-read-only-reporting-production';

    renderDelete(1, [{ name, detail: 'replica.eu-central-1.rds.example.com' }]);

    const shown = document.querySelector('.dialog-item-name') as HTMLElement;

    expect(shown.textContent).toBe(name);
    expect(declaredValues(shown, 'white-space')).not.toContain('nowrap');
    expect(declaredValues(shown, 'overflow-wrap').at(-1)).toBe('anywhere');
    expect(declaredValues(shown, '-webkit-line-clamp').at(-1)).toBe('3');
    expect(shown.dataset.tooltip).toBe(name);
    expect(shown.hasAttribute('data-tooltip-cut')).toBe(true);
  });

  it('keeps glyph, name, and detail in reading order in a right-to-left page', () => {
    applyStylesheets(readStylesheet('src/dialog/dialog.css'));
    document.documentElement.dir = 'rtl';

    try {
      renderDelete(1, [{ name: 'خادم الإنتاج', detail: 'db.example.com' }]);

      const row = document.querySelector('.dialog-item') as HTMLElement;
      const parts = [...row.children].map((part) =>
        ['dialog-item-glyph', 'dialog-item-name', 'dialog-item-detail'].find((name) =>
          part.classList.contains(name)
        )
      );

      // Logical order: the glyph at the start (the right edge), the detail at the end.
      expect(parts).toEqual(['dialog-item-glyph', 'dialog-item-name', 'dialog-item-detail']);
      // Each value takes its own direction, so a Latin host reads left to right inside.
      expect(row.querySelector('.dialog-item-detail')?.getAttribute('dir')).toBe('auto');
      expect(row.querySelector('.dialog-item-name')?.getAttribute('dir')).toBe('auto');
      // Edges are logical, so the row mirrors with the page.
      const detail = row.querySelector('.dialog-item-detail') as HTMLElement;

      expect(declaredValues(detail, 'text-align').at(-1)).toBe('end');
    } finally {
      document.documentElement.dir = '';
    }
  });

  it('is described by its lead, then the count, then the names', () => {
    const dialog = renderDelete(3);
    const ids = dialog.getAttribute('aria-describedby')?.split(' ') ?? [];
    // What a screen reader reads, piece by piece: each described element's
    // text, and inside the item list the count, then each name and detail.
    const pieces = '.visually-hidden, .dialog-item-name, .dialog-item-detail, .dialog-items-more';
    const read = ids.flatMap((id) => {
      const element = document.getElementById(id);
      if (element === null) return [];
      const inner = [...element.querySelectorAll(pieces)];
      return (inner.length > 0 ? inner : [element]).map((piece) => piece.textContent);
    });

    expect(read).toEqual([
      'This removes 3 servers from the list. Their databases stay where they are.',
      '3 items',
      'server-1',
      'db1.example.com',
      'server-2',
      'db2.example.com',
      'server-3',
      'db3.example.com'
    ]);
  });

  it('draws each labelled group with its count above the same framed list', () => {
    render(
      <ConfirmDialog
        confirmLabel="Quit"
        groups={[
          {
            label: 'Running processes',
            items: [{ name: 'npm run dev', detail: 'shop' }],
            count: 1
          },
          {
            label: 'Open terminals',
            icon: SquareTerminal,
            items: Array.from({ length: 7 }, (_, index) => ({ name: `zsh ${index + 1}` }))
          }
        ]}
        icon={Trash2}
        message="Quitting stops 1 process and closes 7 terminals."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        title="Quit?"
        tone="warning"
      />
    );

    const lists = screen.getAllByRole('list');

    expect(lists.map((list) => list.getAttribute('aria-label'))).toEqual([
      'Running processes',
      'Open terminals'
    ]);
    expect(
      [...document.querySelectorAll('.dialog-items-head')].map((head) => head.textContent)
    ).toEqual(['Running processes1', 'Open terminals7']);
    expect(lists[1]?.lastElementChild?.textContent).toBe('+2 more');
  });
});
