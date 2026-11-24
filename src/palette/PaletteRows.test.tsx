import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { applyStylesheets, readStylesheet } from '../../test/stylesheets.js';

import {
  PaletteFailure,
  PaletteHeading,
  PaletteList,
  PaletteNote,
  PaletteNotes,
  PaletteOption
} from './PaletteRows.js';
import { KeyChord } from '../keychord/KeyChord.js';
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
          id="bun"
          name="Bun"
          onPick={() => undefined}
          trail="1.3.2"
        />
      </PaletteList>
    );
    const option = screen.getByRole('option', {
      name: 'Bun JavaScript runtime and toolkit 1.3.2 Installed'
    });

    expect(screen.getByRole('listbox', { name: 'Runtimes' }).id).toBe('list');
    expect(option.className).toBe('folder-menu-option palette-option cursor');
    expect(option.getAttribute('aria-selected')).toBe('true');
    expect(option.querySelector('.palette-context.palette-sentence')?.textContent).toBe(
      'JavaScript runtime and toolkit'
    );
    expect(option.querySelector('.palette-meta')?.textContent).toBe('1.3.2');
    expect(screen.getByRole('img', { name: 'Installed' }).className).toBe('current-dot');
    expect(screen.getByText('Languages').getAttribute('role')).toBe('presentation');
  });

  it('cuts a trail of words with its tooltip, and keeps a chord whole', () => {
    render(
      <PaletteList id="list" label="Branches">
        <PaletteOption
          id="main"
          name="main"
          onPick={() => undefined}
          trail="ahead 12, behind 340, 3 weeks ago"
        />
        <PaletteOption id="count" name="Files" onPick={() => undefined} trail={42} />
        <PaletteOption
          id="save"
          name="Save"
          onPick={() => undefined}
          trail={<KeyChord chord={{ key: 's', meta: true }} />}
        />
      </PaletteList>
    );
    const [words, count, chord] = screen.getAllByRole('option');
    const text = words?.querySelector('.palette-meta > .palette-meta-text') as HTMLElement;

    expect(text.textContent).toBe('ahead 12, behind 340, 3 weeks ago');
    expect([text.dataset.tooltip, text.hasAttribute('data-tooltip-cut')]).toEqual([
      'ahead 12, behind 340, 3 weeks ago',
      true
    ]);
    expect(count?.querySelector('.palette-meta-text')?.getAttribute('data-tooltip')).toBe('42');
    expect(chord?.querySelector('.palette-meta-text')).toBe(null);
    expect(chord?.querySelector('.palette-meta > .keychord')).not.toBe(null);
  });

  it('gives way in one order: the context, then the trail’s words, then the name', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    render(
      <PaletteList id="list" label="Branches">
        <PaletteOption
          context="Check out main"
          id="main"
          name="main"
          onPick={() => undefined}
          trail="ahead 12"
        />
        <PaletteOption
          id="save"
          name="Save"
          onPick={() => undefined}
          trail={<KeyChord chord={{ key: 's', meta: true }} />}
        />
      </PaletteList>
    );
    const [words, chord] = screen.getAllByRole('option') as [HTMLElement, HTMLElement];
    const style = (element: Element | null) => getComputedStyle(element as Element);

    expect(style(words).display).toBe('flex');
    // The context's words count for nothing in the row's sizing: it has only the room left.
    expect(style(words.querySelector('.palette-context')).contain).toBe('inline-size');
    // The trail gives a million times faster than the name, which shrinks at 1.
    expect(style(words.querySelector('.palette-text')).flexShrink).toBe('1');
    expect(style(words.querySelector('.palette-trail')).flexShrink).toBe('1000000');
    expect(style(words.querySelector('.palette-meta-text')).textOverflow).toBe('ellipsis');
    // A chord never gives.
    expect(style(chord.querySelector('.palette-trail')).flexShrink).toBe('0');
  });

  it('names itself by every word it draws, in the order drawn, and describes only what it does not draw', () => {
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
    const option = screen.getByRole('option');
    /** The option named exactly `name`, which must be this one. */
    const named = (name: string): HTMLElement => screen.getByRole('option', { name });

    expect(named('PostgreSQL The PostgreSQL server 18.1 Installed')).toBe(option);
    expect(option.hasAttribute('aria-description')).toBe(false);

    // A chord in the trail reads by its words, where it is drawn.
    rerender(
      <PaletteOption
        context="~/shop"
        contextKind="path"
        id="pg"
        name="PostgreSQL"
        onPick={() => undefined}
        trail={<KeyChord chord={{ key: 'k', meta: true, shift: true }} />}
      />
    );
    expect(named('PostgreSQL ~/shop Shift Command K')).toBe(option);

    // What it does not draw, such as why it cannot be picked, is its description.
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
    expect(named('PostgreSQL The PostgreSQL server')).toBe(option);
    expect(option.getAttribute('aria-description')).toBe('Already added');

    rerender(<PaletteOption id="pg" name="PostgreSQL" onPick={() => undefined} />);
    expect(named('PostgreSQL')).toBe(option);
    expect(option.hasAttribute('aria-description')).toBe(false);

    // A label stands in for the drawn name's words; the context and trail still follow.
    rerender(
      <PaletteOption
        context="The PostgreSQL server"
        id="pg"
        label="PostgreSQL"
        name={<MarkedText positions={[0, 1]} text="PostgreSQL" />}
        onPick={() => undefined}
        trail="18.1"
      />
    );
    expect(named('PostgreSQL The PostgreSQL server 18.1')).toBe(option);

    // An empty label is none: the drawn name reads.
    rerender(
      <PaletteOption
        context="The PostgreSQL server"
        id="pg"
        label=""
        name="PostgreSQL"
        onPick={() => undefined}
      />
    );
    expect(named('PostgreSQL The PostgreSQL server')).toBe(option);
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

  it('names a row with a marked name by its words, then its context and trail', () => {
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

    expect(
      screen
        .getByRole('option', { name: 'PostgreSQL The PostgreSQL server 18.1 Installed' })
        .hasAttribute('aria-description')
    ).toBe(false);
  });

  it('ticks a row picked with others, its check mark in the icon column, and toggles on a press', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const onPick = vi.fn();
    const { rerender } = render(
      <PaletteList id="scripts" label="Scripts">
        <PaletteOption checked id="build" mark={<svg />} name="build" onPick={onPick} />
        <PaletteOption
          checked={false}
          id="test"
          mark={<svg />}
          name="test"
          onPick={() => undefined}
        />
        <PaletteOption id="lint" name="lint" onPick={() => undefined} />
      </PaletteList>
    );
    const build = screen.getByRole('option', { name: 'build' });
    const test = screen.getByRole('option', { name: 'test' });
    // The rules that draw a check mark in a row's icon column, and whether one draws it on `option`.
    const tickRules = [...document.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules])
      .filter(
        (rule): rule is CSSStyleRule =>
          rule instanceof CSSStyleRule &&
          rule.selectorText.endsWith(' > .row-icon::before') &&
          rule.style.getPropertyValue('mask') !== ''
      );
    const tick = (option: HTMLElement) =>
      tickRules.some((rule) =>
        option.matches(rule.selectorText.replace(' > .row-icon::before', ''))
      );

    expect(tickRules.length).toBeGreaterThan(0);
    expect(build.getAttribute('aria-checked')).toBe('true');
    expect(test.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('option', { name: 'lint' }).hasAttribute('aria-checked')).toBe(false);
    // The library draws the mark from the attribute, and a checkable row's column holds it alone.
    expect(tick(build)).toBe(true);
    expect(tick(test)).toBe(false);
    expect(build.querySelector('.row-icon')?.childElementCount).toBe(0);
    expect(test.querySelector('.row-icon')?.childElementCount).toBe(0);

    fireEvent.click(build);
    expect(onPick).toHaveBeenCalledOnce();
    rerender(
      <PaletteList id="scripts" label="Scripts">
        <PaletteOption checked={false} id="build" name="build" onPick={onPick} />
      </PaletteList>
    );
    expect(screen.getByRole('option', { name: 'build' }).getAttribute('aria-checked')).toBe(
      'false'
    );
  });

  it("keeps its name's id apart from any option's id", () => {
    render(
      <>
        <PaletteOption
          id="command"
          name={<MarkedText positions={[0]} text="Open" />}
          onPick={() => undefined}
        />
        <PaletteOption
          id="command-name"
          name={<MarkedText positions={[0]} text="Close" />}
          onPick={() => undefined}
        />
      </>
    );

    // The query names its cursor row by id, which must find the row, not a name inside another.
    expect(document.getElementById('command-name')?.getAttribute('role')).toBe('option');
    expect(screen.getByRole('option', { name: 'Open' }).id).toBe('command');
    expect(screen.getByRole('option', { name: 'Close' }).id).toBe('command-name');
  });

  it('takes its label as its name over a marked name', () => {
    render(
      <PaletteOption
        id="open"
        label="Open the project"
        name={<MarkedText positions={[0]} text="Open" />}
        onPick={() => undefined}
      />
    );

    expect(screen.getByRole('option', { name: 'Open the project' }).id).toBe('open');
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
