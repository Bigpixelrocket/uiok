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
