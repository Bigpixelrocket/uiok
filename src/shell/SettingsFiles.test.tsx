import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SettingsFiles } from './SettingsFiles.js';

describe('SettingsFiles', () => {
  it('lists the folder and each file with its problems in line order', () => {
    render(
      <SettingsFiles
        files={[
          {
            name: 'settings.toml',
            summary: 'Read just now',
            onOpen: () => Promise.resolve(null),
            problemsLabel: 'Problems in settings.toml',
            problems: [
              { kind: 'problem', place: 'Line 4', key: 'theme', message: 'Not a theme.' },
              { kind: 'note', place: null, key: null, message: 'An old key was renamed.' }
            ]
          },
          {
            name: 'services.toml',
            summary: 'Not created yet',
            problemsLabel: 'Problems in services.toml',
            problems: []
          }
        ]}
        folder="~/.config/app"
        folderLabel="Folder"
        onShowFolder={() => Promise.resolve(null)}
        openLabel="Open"
        showFolderLabel="Show in Finder"
      />
    );

    const problems = screen.getByRole('list', { name: 'Problems in settings.toml' });
    expect(problems.children).toHaveLength(2);
    expect(problems.children[0]?.classList.contains('notice-danger')).toBe(true);
    expect(problems.children[0]?.textContent).toBe('Line 4 · themeNot a theme.');
    expect(screen.getAllByRole('button', { name: 'Open' })).toHaveLength(1);
  });

  it('offers Show in Finder and Copy Path on a file the host gives them, each naming its file', async () => {
    const show = vi.fn(() => Promise.resolve(null));
    const copy = vi.fn(() => Promise.resolve('The path could not be copied.'));
    render(
      <SettingsFiles
        copyPathLabel="Copy Path"
        files={[
          {
            name: 'settings.toml',
            summary: 'Read just now',
            onOpen: () => Promise.resolve(null),
            onShow: show,
            onCopyPath: copy,
            problemsLabel: 'Problems in settings.toml',
            problems: []
          },
          {
            name: 'services.toml',
            summary: 'Not created yet',
            onCopyPath: copy,
            problemsLabel: 'Problems in services.toml',
            problems: []
          }
        ]}
        folder="~/.config/app"
        folderLabel="Folder"
        onShowFolder={() => Promise.resolve(null)}
        openLabel="Open"
        showFolderLabel="Show in Finder"
      />
    );

    // The folder's Show in Finder, then the one file that can be shown.
    const shows = screen.getAllByRole('button', { name: 'Show in Finder' });
    expect(shows).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Copy Path' })).toHaveLength(2);
    const [settingsCopy, servicesCopy] = screen.getAllByRole('button', { name: 'Copy Path' });
    const describedBy = (button: HTMLElement | undefined) =>
      document.getElementById(button?.getAttribute('aria-describedby') ?? '')?.textContent;
    expect(describedBy(settingsCopy)).toBe('settings.toml');
    expect(describedBy(servicesCopy)).toBe('services.toml');
    // In the order Open, Show in Finder, Copy Path.
    const settingsVerbs = [...(settingsCopy?.parentElement?.querySelectorAll('button') ?? [])];
    expect(settingsVerbs.map((button) => button.textContent)).toEqual([
      'Open',
      'Show in Finder',
      'Copy Path'
    ]);

    await act(async () => {
      fireEvent.click(shows[1] as HTMLElement);
    });
    expect(show).toHaveBeenCalledTimes(1);
    await act(async () => {
      fireEvent.click(servicesCopy as HTMLElement);
    });
    expect(copy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert').textContent).toBe('The path could not be copied.');
  });

  it('draws no Copy Path without its words, whatever a file offers', () => {
    render(
      <SettingsFiles
        files={[
          {
            name: 'settings.toml',
            summary: 'Read just now',
            onCopyPath: () => Promise.resolve(null),
            problemsLabel: 'Problems in settings.toml',
            problems: []
          }
        ]}
        folder="~/.config/app"
        folderLabel="Folder"
        onShowFolder={() => Promise.resolve(null)}
        openLabel="Open"
        showFolderLabel="Show in Finder"
      />
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('shows a refused request under its row', async () => {
    const refuse = vi.fn(() => Promise.resolve('The folder could not be shown.'));
    render(
      <SettingsFiles
        files={[]}
        folder="~/.config/app"
        folderLabel="Folder"
        onShowFolder={refuse}
        openLabel="Open"
        showFolderLabel="Show in Finder"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Show in Finder' }));
    });
    expect(screen.getByRole('alert').textContent).toBe('The folder could not be shown.');
  });
});
