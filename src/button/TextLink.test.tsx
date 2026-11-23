import { fireEvent, render, screen } from '@testing-library/react';
import { BookOpen } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
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
});
