import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UiokProvider } from '../labels/UiokProvider.js';
import { DARK_THEME_IDS, LIGHT_THEME_IDS } from '../themes/ids.js';
import { AppearanceSettings, ThemeChoices, themesOf } from './ThemePicker.js';

const themes = [
  { id: 'catppuccin-latte', name: 'Catppuccin Latte' },
  { id: 'github-light', name: 'GitHub Light' },
  { id: 'one-light', name: 'One Light' }
];

describe('ThemeChoices', () => {
  it('keeps one Tab stop, the chosen theme, and moves the choice and the focus with the arrows', () => {
    const onChange = vi.fn();
    render(
      <ThemeChoices label="Light theme" onChange={onChange} themes={themes} value="github-light" />
    );

    const radios = screen.getAllByRole('radio');
    expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, 0, -1]);
    expect(screen.getByRole('radio', { name: 'GitHub Light' }).getAttribute('aria-checked')).toBe(
      'true'
    );

    fireEvent.keyDown(radios[1]!, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('one-light');
    expect(document.activeElement).toBe(radios[2]);

    fireEvent.keyDown(radios[1]!, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('catppuccin-latte');
  });

  it('hears a click on another theme, never one on the chosen theme', () => {
    const onChange = vi.fn();
    render(
      <ThemeChoices label="Light theme" onChange={onChange} themes={themes} value="github-light" />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'GitHub Light' }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('radio', { name: 'One Light' }));
    expect(onChange).toHaveBeenCalledWith('one-light');
  });
});

describe('themesOf', () => {
  it('lists each appearance’s themes in the catalog’s order', () => {
    expect(themesOf('light').map((theme) => theme.id)).toEqual([...LIGHT_THEME_IDS]);
    expect(themesOf('dark').map((theme) => theme.id)).toEqual([...DARK_THEME_IDS]);
  });
});

describe('AppearanceSettings', () => {
  it('chooses the appearance, marks the band in use, and saves a theme under its appearance', () => {
    const onModeChange = vi.fn();
    const onThemeChange = vi.fn();
    render(
      <AppearanceSettings
        mode="light"
        onModeChange={onModeChange}
        onThemeChange={onThemeChange}
        themes={{ light: 'catppuccin-latte', dark: 'catppuccin-mocha' }}
      />
    );

    expect(screen.getByText('Light whatever the system uses.')).toBeTruthy();
    expect(
      screen.getByRole('radiogroup', { name: 'Light theme' }).getAttribute('aria-describedby')
    ).toMatch(/in-use/);
    expect(
      screen.getByRole('radiogroup', { name: 'Dark theme' }).getAttribute('aria-describedby')
    ).not.toMatch(/in-use/);

    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(onModeChange).toHaveBeenCalledWith('dark');

    fireEvent.click(screen.getByRole('radio', { name: 'Nord' }));
    expect(onThemeChange).toHaveBeenCalledWith('dark', 'nord');
  });

  it('speaks the app’s words from its labels', () => {
    render(
      <UiokProvider labels={{ settings: { appearance: { title: 'Thema', inUse: 'Aktiv' } } }}>
        <AppearanceSettings
          mode="system"
          onModeChange={vi.fn()}
          onThemeChange={vi.fn()}
          themes={{ light: 'catppuccin-latte', dark: 'catppuccin-mocha' }}
        />
      </UiokProvider>
    );

    expect(screen.getByRole('heading', { name: 'Thema' })).toBeTruthy();
    expect(screen.getByText('Aktiv')).toBeTruthy();
  });
});
