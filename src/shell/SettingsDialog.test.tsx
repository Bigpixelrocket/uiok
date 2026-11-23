import { fireEvent, render, screen } from '@testing-library/react';
import { Download, Palette } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  SettingsDialog,
  SettingsSaveFailure,
  type SettingsGroup,
  type SettingsPageRequest
} from './SettingsDialog.js';
import { useSettingsPageKeys } from './SettingsPageKeys.js';
import { SettingsSubsection } from './SettingsSubsection.js';

/** A page with keys of its own: Escape clears its find while it shows. */
function FindPage({ onClear }: { readonly onClear: () => void }): ReactElement {
  useSettingsPageKeys({
    legend: { leave: { label: 'Clear' }, primary: { label: 'Record', onRun: () => undefined } },
    onLeave: onClear
  });

  return <p>Shortcuts</p>;
}

const groups = (onClear = vi.fn()): readonly SettingsGroup[] => [
  {
    id: 'app',
    title: 'App',
    pages: [
      {
        id: 'appearance',
        title: 'Appearance',
        Icon: Palette,
        subsections: [
          { id: 'theme', title: 'Theme' },
          { id: 'fonts', title: 'Fonts' }
        ],
        body: (
          <>
            <SettingsSubsection id="theme" title="Theme">
              <p>Themes</p>
            </SettingsSubsection>
            <SettingsSubsection id="fonts" title="Fonts">
              <p>Fonts</p>
            </SettingsSubsection>
          </>
        )
      },
      {
        id: 'updates',
        title: 'Updates',
        Icon: Download,
        subsections: [],
        fills: true,
        trailing: <span className="settings-sidebar-chip">2.5.0</span>,
        body: <p>Update card</p>
      }
    ]
  },
  {
    id: 'keys',
    title: 'Keyboard',
    pages: [
      {
        id: 'shortcuts',
        title: 'Shortcuts',
        Icon: Palette,
        subsections: [],
        body: <FindPage onClear={onClear} />
      }
    ]
  }
];

describe('SettingsDialog', () => {
  it('opens on the first page with its subsections on the rail, the first marked', () => {
    render(<SettingsDialog groups={groups()} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Settings pages' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Appearance', level: 3 })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Appearance' }).getAttribute('aria-current')).toBe(
      'page'
    );
    expect(screen.getByRole('button', { name: 'Theme' }).getAttribute('aria-current')).toBe(
      'location'
    );
    expect(screen.getByRole('button', { name: 'Fonts' }).getAttribute('aria-current')).toBeNull();
  });

  it('turns to a page from the sidebar, telling the host which page shows', () => {
    const onPageShown = vi.fn();
    render(<SettingsDialog groups={groups()} onClose={vi.fn()} onPageShown={onPageShown} />);

    fireEvent.click(screen.getByRole('button', { name: /Updates/ }));

    expect(screen.getByText('Update card')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Theme' })).toBeNull();
    expect(document.querySelector('.settings-page')?.classList.contains('fills')).toBe(true);
    expect(onPageShown).toHaveBeenLastCalledWith('updates');
  });

  it('turns to the page each new request names', () => {
    function Host(): ReactElement {
      const [request, setRequest] = useState<SettingsPageRequest | null>({
        pageId: 'updates',
        seq: 1
      });

      return (
        <>
          <button onClick={() => setRequest({ pageId: 'appearance', seq: 2 })} type="button">
            ask
          </button>
          <SettingsDialog groups={groups()} onClose={vi.fn()} pageRequest={request} />
        </>
      );
    }

    render(<Host />);
    expect(screen.getByText('Update card')).toBeTruthy();
    fireEvent.click(screen.getByText('ask'));
    expect(screen.getByText('Themes')).toBeTruthy();
  });

  it('closes on Done and Escape', () => {
    const onClose = vi.fn();
    render(<SettingsDialog groups={groups()} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('gives Escape and the legend to a page with keys of its own while it shows', () => {
    const onClose = vi.fn();
    const onClear = vi.fn();
    render(<SettingsDialog groups={groups(onClear)} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Shortcuts' }));
    expect(screen.getByRole('button', { name: 'Record' })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
  });

  it('stands a notice over the page column, whose verb turns the page', () => {
    render(
      <SettingsDialog
        groups={groups()}
        notice={(pageId, choose) => (
          <SettingsSaveFailure
            action={
              pageId === 'updates'
                ? null
                : { label: 'Show Updates', onRun: () => choose('updates') }
            }
            message="settings.toml could not be saved."
          />
        )}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('alert').textContent).toBe('settings.toml could not be saved.');
    fireEvent.click(screen.getByRole('button', { name: 'Show Updates' }));
    expect(screen.getByText('Update card')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Show Updates' })).toBeNull();
  });
});
