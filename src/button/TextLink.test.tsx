import { fireEvent, render, screen } from '@testing-library/react';
import { BookOpen } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { Cell, Listing, Row, RowCursorContext, type RowCursor } from '../listing/Listing.js';
import { verbControl } from '../pane/PaneKeys.js';
import { TextLink } from './TextLink.js';

describe('TextLink', () => {
  it('is a button named by its words that runs its action', () => {
    const onClick = vi.fn();

    render(<TextLink onClick={onClick}>DROP DATABASE in the manual</TextLink>);

    const link = screen.getByRole('button', { name: 'DROP DATABASE in the manual' });
    fireEvent.click(link);

    expect(onClick).toHaveBeenCalledOnce();
    expect(link.getAttribute('type')).toBe('button');
    expect(link.dataset.tooltip).toBeUndefined();
  });

  it('draws a glyph before its words and a tooltip with its chord when given', () => {
    render(
      <TextLink icon={BookOpen} onClick={() => undefined} shortcut="⌥⌘?" tip="dev.mysql.com/doc">
        Manual
      </TextLink>
    );

    const link = screen.getByRole('button', { name: 'Manual' });

    expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(link.dataset.tooltip).toBe('dev.mysql.com/doc');
    expect(link.dataset.tooltipShortcut).toBe('⌥⌘?');
  });

  it('wears the accent text colour, and the code face with code', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    render(
      <TextLink code onClick={() => undefined}>
        replica_io
      </TextLink>
    );

    const link = screen.getByRole('button', { name: 'replica_io' });

    expect(link.className).toBe('text-link code');
    expect(declaredValues(link, 'color')).toContain('var(--accent-text)');
    expect(
      declaredValues(link.querySelector('.text-link-words') as HTMLElement, 'font-family')
    ).toContain('var(--font-mono)');
  });

  it('takes an accessible name of its own, and refuses the press while disabled', () => {
    const onClick = vi.fn();

    render(
      <TextLink disabled label="View the whole log" onClick={onClick}>
        View
      </TextLink>
    );

    const link = screen.getByRole('button', { name: 'View the whole log' });
    fireEvent.click(link);

    expect(link.textContent).toBe('View');
    expect((link as HTMLButtonElement).disabled).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('draws a failing target in the danger tone, its reason described', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    render(
      <TextLink onClick={vi.fn()} tip="The disk is full, so writes fail." tone="danger">
        storage/logs/web.log
      </TextLink>
    );

    const link = screen.getByRole('button', { name: 'storage/logs/web.log' });

    expect(link.className).toBe('text-link danger');
    expect(link.getAttribute('aria-description')).toBe('The disk is full, so writes fail.');
    expect(link.dataset.tooltip).toBe('The disk is full, so writes fail.');
    expect(declaredValues(link, 'color')).toContain('var(--danger-text)');
  });

  describe('in a listing row', () => {
    const cursorOn = (key: string): RowCursor => ({
      current: () => key,
      subscribe: () => () => undefined,
      point: () => undefined
    });

    const board = (props: { tabbable?: boolean; verb?: string }, onOpen = vi.fn()) =>
      render(
        <RowCursorContext value={cursorOn('web')}>
          <Listing columns={[{ label: 'Port' }]} grid="20px 1fr auto" title="Services">
            <Row name="web" onOpen={onOpen} rowKey="web" tabbable={props.tabbable}>
              <Cell>
                <TextLink onClick={onPort} verb={props.verb}>
                  5173
                </TextLink>
              </Cell>
            </Row>
          </Listing>
        </RowCursorContext>
      );
    const onPort = vi.fn();

    it('leaves the Tab order with a verb, which the cursor row’s keys reach and run alone', () => {
      onPort.mockClear();
      const onOpen = vi.fn();
      board({ verb: 'open-port' }, onOpen);
      const link = screen.getByRole('button', { name: '5173' });

      expect(link.tabIndex).toBe(-1);
      expect(link.dataset.verb).toBe('open-port');
      const row = screen.getAllByRole('row')[1] as HTMLElement;
      const control = verbControl(row, 'open-port');
      expect(control).toBe(link);
      control?.click();
      expect(onPort).toHaveBeenCalledOnce();
      expect(onOpen).not.toHaveBeenCalled();
    });

    it('keeps its Tab stop without a verb, or in a tabbable row', () => {
      board({});
      expect(screen.getByRole('button', { name: '5173' }).hasAttribute('tabindex')).toBe(false);
      document.body.innerHTML = '';
      board({ tabbable: true, verb: 'open-port' });
      expect(screen.getByRole('button', { name: '5173' }).hasAttribute('tabindex')).toBe(false);
    });

    it('changes nothing outside a row but the attribute', () => {
      render(
        <TextLink onClick={() => undefined} verb="open-port">
          Manual
        </TextLink>
      );
      const link = screen.getByRole('button', { name: 'Manual' });

      expect(link.hasAttribute('tabindex')).toBe(false);
      expect(link.dataset.verb).toBe('open-port');
    });

    it('takes the selection’s words on an active selection, its own tone elsewhere', () => {
      applyStylesheets(readStylesheet('src/styles.css'));
      render(
        <div className="listing-root">
          <RowCursorContext value={cursorOn('none')}>
            <Listing columns={[{ label: 'Port' }]} grid="20px 1fr auto auto auto" title="Services">
              <Row name="web" rowKey="web" selected>
                <Cell>
                  <TextLink onClick={() => undefined}>5173</TextLink>
                </Cell>
                <Cell>
                  <TextLink onClick={() => undefined} tone="danger">
                    Log
                  </TextLink>
                </Cell>
                <Cell>
                  <TextLink disabled onClick={() => undefined}>
                    Docs
                  </TextLink>
                </Cell>
              </Row>
              <Row name="api" rowKey="api">
                <Cell>
                  <TextLink onClick={() => undefined}>8080</TextLink>
                </Cell>
              </Row>
            </Listing>
          </RowCursorContext>
        </div>
      );
      const colour = (name: string): string | undefined =>
        declaredValues(screen.getByRole('button', { name }), 'color').at(-1);

      expect(colour('5173')).toBe('var(--on-selected)');
      expect(colour('Log')).toBe('var(--on-selected)');
      expect(colour('Docs')).toBe('var(--on-selected-dim)');
      expect(colour('8080')).toBe('var(--accent-text)');

      // A selection in a window behind keeps its quiet fill, so the link its tone.
      document.documentElement.setAttribute('data-window-inactive', '');
      try {
        expect(colour('5173')).toBe('var(--accent-text)');
        expect(colour('Log')).toBe('var(--danger-text)');
      } finally {
        document.documentElement.removeAttribute('data-window-inactive');
      }
    });
  });
});
