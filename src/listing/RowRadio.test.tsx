import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Cell, Listing, Row } from './Listing.js';

describe("Row's radio", () => {
  it('leads the row with a radio named by its name, out of the Tab order, one per group', () => {
    const onPick = vi.fn();
    const onOpen = vi.fn();
    render(
      <Listing columns={[{ label: 'Size', align: 'right' }]} grid="x" title="Databases">
        <Row
          name="shop"
          onOpen={onOpen}
          radio={{ checked: true, group: 'db', onPick: vi.fn() }}
          rowKey="shop"
        >
          <Cell align="right">48.2 MB</Cell>
        </Row>
        <Row
          name="blog"
          onOpen={onOpen}
          radio={{ checked: false, group: 'db', onPick, verb: 'pick' }}
          rowKey="blog"
        >
          <Cell align="right">12.4 MB</Cell>
        </Row>
      </Listing>
    );

    const shop = screen.getByRole('radio', { name: 'shop' }) as HTMLInputElement;
    const blog = screen.getByRole('radio', { name: 'blog' }) as HTMLInputElement;

    expect(shop.checked).toBe(true);
    expect(blog.checked).toBe(false);
    expect(blog.name).toBe('db');
    expect(blog.tabIndex).toBe(-1);
    expect(blog.dataset.verb).toBe('pick');
    // The row keeps one cell a column: the radio and the name share the name's cell.
    expect(blog.closest('[role="row"]')?.querySelectorAll('[role="cell"]')).toHaveLength(2);
    expect(blog.closest('[role="row"]')?.querySelector('.row-icon')).toBeNull();

    fireEvent.click(blog);

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('holds a disabled choice where it is', () => {
    const onPick = vi.fn();
    render(
      <Listing columns={[]} grid="x" title="Databases">
        <Row
          name="blog"
          radio={{ checked: false, disabled: true, group: 'db', onPick }}
          rowKey="blog"
        />
      </Listing>
    );

    const blog = screen.getByRole('radio', { name: 'blog' }) as HTMLInputElement;

    expect(blog.disabled).toBe(true);
    fireEvent.click(blog);
    expect(onPick).not.toHaveBeenCalled();
  });

  it('keeps the radio in the Tab order in a tabbable row', () => {
    render(
      <Listing columns={[]} grid="x" title="Databases">
        <Row
          name="shop"
          radio={{ checked: true, group: 'db', onPick: vi.fn() }}
          rowKey="shop"
          tabbable
        />
      </Listing>
    );

    expect((screen.getByRole('radio', { name: 'shop' }) as HTMLInputElement).tabIndex).toBe(0);
  });
});
