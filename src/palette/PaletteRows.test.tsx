import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  PaletteFailure,
  PaletteHeading,
  PaletteList,
  PaletteNote,
  PaletteNotes,
  PaletteOption
} from './PaletteRows.js';
import { MarkedText } from '../text/MarkedText.js';

describe('PaletteOption', () => {
  it('draws its name, sentence, trail, and current dot, named for assistive technology', () => {
    render(
      <PaletteList id="list" label="Runtimes">
        <PaletteHeading>Languages</PaletteHeading>
        <PaletteOption
          context="JavaScript runtime and toolkit"
          current="Installed"
          cursor
          description="JavaScript runtime and toolkit, 1.3.2 installed"
          id="bun"
          name="Bun"
          onPick={() => undefined}
          trail="1.3.2"
        />
      </PaletteList>
    );
    const option = screen.getByRole('option', { name: 'Bun' });

    expect(screen.getByRole('listbox', { name: 'Runtimes' }).id).toBe('list');
    expect(option.className).toBe('folder-menu-option cursor');
    expect(option.getAttribute('aria-selected')).toBe('true');
    expect(option.getAttribute('aria-description')).toBe(
      'JavaScript runtime and toolkit, 1.3.2 installed'
    );
    expect(option.querySelector('.palette-context.palette-sentence')?.textContent).toBe(
      'JavaScript runtime and toolkit'
    );
    expect(option.querySelector('.palette-meta')?.textContent).toBe('1.3.2');
    expect(screen.getByRole('img', { name: 'Installed' }).className).toBe('current-dot');
    expect(screen.getByText('Languages').getAttribute('role')).toBe('presentation');
  });

  it('reads its context, a trail in words, and its current state after its name unless told otherwise', () => {
    const { rerender } = render(
      <PaletteOption
        context="The PostgreSQL server"
        current="Installed"
        id="pg"
        name="PostgreSQL"
        onPick={() => undefined}
        trail="18.1"
      />
    );
    const option = screen.getByRole('option', { name: 'PostgreSQL' });

    expect(option.getAttribute('aria-description')).toBe('The PostgreSQL server, 18.1, Installed');

    // A trail that is not words reads nothing; the context still does.
    rerender(
      <PaletteOption
        context="~/shop"
        contextKind="path"
        id="pg"
        name="PostgreSQL"
        onPick={() => undefined}
        trail={<kbd>K</kbd>}
      />
    );
    expect(option.getAttribute('aria-description')).toBe('~/shop');

    rerender(
      <PaletteOption
        context="The PostgreSQL server"
        description="Already added"
        disabled
        id="pg"
        name="PostgreSQL"
        onPick={() => undefined}
      />
    );
    expect(option.getAttribute('aria-description')).toBe('Already added');

    rerender(<PaletteOption id="pg" name="PostgreSQL" onPick={() => undefined} />);
    expect(option.hasAttribute('aria-description')).toBe(false);
  });

  it('picks on a press and points on a move, and refuses both while disabled', () => {
    const onPick = vi.fn();
    const onPoint = vi.fn();
    const { rerender } = render(
      <PaletteOption id="a" name="PHP" onPick={onPick} onPoint={onPoint} />
    );
    const option = screen.getByRole('option', { name: 'PHP' });

    fireEvent.mouseMove(option);
    fireEvent.click(option);
    expect(onPoint).toHaveBeenCalledOnce();
    expect(onPick).toHaveBeenCalledOnce();

    rerender(<PaletteOption disabled id="a" name="PHP" onPick={onPick} onPoint={onPoint} />);
    fireEvent.mouseMove(option);
    fireEvent.click(option);
    expect(option.getAttribute('aria-disabled')).toBe('true');
    expect(onPoint).toHaveBeenCalledOnce();
    expect(onPick).toHaveBeenCalledOnce();
  });

  it('reads a path from its end and a command in the code face', () => {
    const { container } = render(
      <>
        <PaletteOption
          context="~/Developer/shop"
          contextKind="path"
          id="p"
          name="shop"
          onPick={() => undefined}
        />
        <PaletteOption
          context="vite build"
          contextKind="command"
          id="c"
          name="build"
          onPick={() => undefined}
        />
      </>
    );
    const [path, command] = container.querySelectorAll('.palette-context');

    expect(path?.className).toBe('palette-context');
    expect(path?.querySelector('bdi')?.textContent).toBe('~/Developer/shop');
    expect(command?.className).toBe('palette-context palette-command');
  });

  it('names a row with a marked name by its name alone, its context and trail described', () => {
    render(
      <PaletteOption
        context="The PostgreSQL server"
        current="Installed"
        id="pg"
        name={<MarkedText positions={[0, 1]} text="PostgreSQL" />}
        onPick={() => undefined}
        trail="18.1"
      />
    );
    const option = screen.getByRole('option', { name: 'PostgreSQL' });

    expect(option.getAttribute('aria-description')).toBe('The PostgreSQL server, 18.1, Installed');
  });
});

describe('PaletteNotes', () => {
  it('holds notes and a failure announced as an alert', () => {
    render(
      <PaletteNotes>
        <PaletteNote>Installs through mise.</PaletteNote>
        <PaletteFailure detail="checksum mismatch" message="Could not install PHP 8.5.4." />
      </PaletteNotes>
    );

    expect(screen.getByText('Installs through mise.').className).toBe('folder-menu-note');
    expect(screen.getByRole('alert').textContent).toBe(
      'Could not install PHP 8.5.4. checksum mismatch'
    );
  });
});
