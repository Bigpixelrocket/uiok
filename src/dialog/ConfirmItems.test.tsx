import { render, screen } from '@testing-library/react';
import { File, Play, Server, SquareTerminal, Trash2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { DialogStatements, shownItems, type DialogItem } from './DialogLists.js';

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

  describe('details', () => {
    it('shares the row by content, with no fixed share for the detail', () => {
      applyStylesheets(readStylesheet('src/dialog/dialog.css'));
      renderDelete(1, [{ name: 'Production', detail: 'db.example.com' }]);

      const list = document.querySelector('.dialog-items') as HTMLElement;
      const detail = document.querySelector('.dialog-item-detail') as HTMLElement;
      const columns = declaredValues(list, 'grid-template-columns').at(-1) ?? '';

      // Both text columns grow from their narrowest to their one-line width
      // by what they hold: a short host beside a short name, or beside a long
      // name, gets its one line while the row has room. No percentage caps it.
      expect(columns).toBe('var(--icon-md) auto auto');
      expect(columns).not.toMatch(/%|fit-content|fr/);
      // Nothing clamps the detail at its end.
      expect(declaredValues(detail, '-webkit-line-clamp')).toEqual([]);
      expect(detail.textContent).toBe('db.example.com');
    });

    it('cuts a folder too long for three lines at its start, keeping its nearest folders', () => {
      applyStylesheets(readStylesheet('src/dialog/dialog.css'));
      const root = '~/projects/infrastructure-and-deployment-scripts/environments';
      // Three deep folders that differ only in their last part.
      const items = ['production', 'staging', 'preview'].map((stage) => ({
        name: 'main.tf',
        detail: `${root}/${stage}`
      }));

      render(
        <ConfirmDialog
          confirmLabel="Delete"
          forGood
          icon={Trash2}
          itemIcon={File}
          items={items}
          message="This deletes 3 items for good. They cannot be recovered."
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          title="Delete Now?"
        />
      );

      const details = [...document.querySelectorAll<HTMLElement>('.dialog-item-detail')];
      const detail = details[0] as HTMLElement;

      // The box is at most three lines and keeps its text at its end, so what
      // overflows, and is clipped, is the start: each row keeps the part that
      // tells it from the others.
      expect(declaredValues(detail, 'max-block-size').at(-1)).toBe('3lh');
      expect(declaredValues(detail, 'justify-content').at(-1)).toBe('flex-end');
      expect(declaredValues(detail, 'overflow').at(-1)).toBe('hidden');
      expect(details.map((part) => part.textContent)).toEqual(items.map((item) => item.detail));
    });

    it('marks only a cut detail, with its whole folder as a tooltip', async () => {
      const { DialogItems } = await import('./DialogLists.js');
      const items = [
        { name: 'main.tf', detail: '~/a/very/deep/folder/production' },
        { name: 'robots.txt', detail: 'db.example.com' }
      ];
      // Lay the text out before React reads it: the long folder runs to four lines.
      const offset = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
      const client = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight');

      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
        configurable: true,
        get(this: HTMLElement) {
          return this.textContent?.includes('production') ? 64 : 16;
        }
      });
      Object.defineProperty(Element.prototype, 'clientHeight', {
        configurable: true,
        get(this: Element) {
          return this.classList.contains('dialog-item-detail')
            ? Math.min(48, this.textContent?.includes('production') ? 48 : 16)
            : 0;
        }
      });

      try {
        render(<DialogItems icon={File} items={items} />);
        const [cut, whole] = [...document.querySelectorAll<HTMLElement>('.dialog-item-detail')];

        expect(cut?.dataset.cut).toBe('start');
        expect(cut?.dataset.tooltip).toBe('~/a/very/deep/folder/production');
        // The whole text stays in the document, for copying and screen readers.
        expect(cut?.textContent).toBe('~/a/very/deep/folder/production');
        expect(whole?.dataset.cut).toBeUndefined();
        expect(whole?.dataset.tooltip).toBeUndefined();
      } finally {
        if (offset) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', offset);
        if (client) Object.defineProperty(Element.prototype, 'clientHeight', client);
      }
    });

    it('starts a cut detail with an ellipsis at its own leading edge', () => {
      const sheet = readStylesheet('src/dialog/dialog.css');

      expect(sheet).toMatch(
        /\.dialog-item-detail\[data-cut='start'\]::before \{[^}]*inset-inline-start: 0;[^}]*content: '…';/
      );
    });
  });

  describe('statements', () => {
    const SQL = Array.from({ length: 12 }, (_, index) => `DROP TABLE t${index + 1};`);

    function renderRun(lines: readonly string[] = SQL) {
      render(
        <ConfirmDialog
          confirmLabel="Run"
          icon={Play}
          message={`This runs ${lines.length} statements on db.example.com. This cannot be undone.`}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          statements={{ label: 'SQL', lines }}
          title="Run Destructive Queries?"
        />
      );
      return screen.getByRole('dialog');
    }

    it('draws every statement, never a first few and "+N more"', () => {
      const dialog = renderRun();
      const region = screen.getByRole('region', { name: 'SQL' });

      expect(
        [...region.querySelectorAll('li.dialog-statement')].map((row) => row.textContent)
      ).toEqual(SQL);
      expect(dialog.textContent).not.toMatch(/more/);
      expect(dialog.querySelector('.dialog-items-head')?.textContent).toBe('SQL12');
      // The items width, like a list.
      expect(dialog.classList.contains('confirm-items')).toBe(true);
    });

    it('scrolls on its own past its cap, reachable by Tab, each statement wrapping whole', () => {
      applyStylesheets(readStylesheet('src/dialog/dialog.css'));
      renderRun();
      const region = screen.getByRole('region', { name: 'SQL' });
      const code = region.querySelector('code') as HTMLElement;

      expect(region.tabIndex).toBe(0);
      expect(declaredValues(region, 'overflow-y').at(-1)).toBe('auto');
      expect(declaredValues(region, 'max-block-size').at(-1)).toMatch(/8lh/);
      expect(declaredValues(code, 'white-space').at(-1)).toBe('pre-wrap');
      expect(declaredValues(code, 'user-select').at(-1)).toBe('text');
      // A screen reader reads a list of every statement.
      expect(region.querySelectorAll('ol > li')).toHaveLength(12);
    });

    it('keeps a long statement whole', () => {
      const long = `DELETE FROM orders WHERE customer_id IN (${Array.from({ length: 60 }, (_, i) => i).join(', ')});`;

      renderRun([long]);
      expect(screen.getByRole('region', { name: 'SQL' }).textContent).toBe(long);
    });

    it('takes the items width when a host passes the block as children', () => {
      applyStylesheets(readStylesheet('src/dialog/dialog.css'));
      render(
        <ConfirmDialog
          confirmLabel="Run"
          icon={Play}
          message="This runs 2 statements on Local MySQL."
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          title="Run Destructive Queries?"
        >
          <DialogStatements label="SQL" lines={SQL.slice(0, 2)} />
        </ConfirmDialog>
      );
      const dialog = screen.getByRole('dialog');

      expect(dialog.classList.contains('confirm-items')).toBe(false);
      expect(declaredValues(dialog, 'width').at(-1)).toBe('480px');
    });

    it('draws nothing for an empty batch', () => {
      const dialog = renderRun([]);

      expect(screen.queryByRole('region')).toBeNull();
      expect(dialog.classList.contains('confirm-items')).toBe(false);
    });
  });
});
