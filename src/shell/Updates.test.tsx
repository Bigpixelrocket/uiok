import { fireEvent, render, screen } from '@testing-library/react';
import { CircleCheck, Download } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { UpdateCard, UpdateChecks, UpdateNotes, UpdatesPage } from './Updates.js';

describe('UpdateCard', () => {
  it('says where the updater stands and runs its one verb', () => {
    const onRun = vi.fn();
    const { container } = render(
      <UpdateCard
        glyph={Download}
        note="Installs the next time the app opens."
        sub="Installed 2.4.0"
        title={
          <>
            Version <strong>2.5.0</strong> is available
          </>
        }
        tone="ready"
        verb={{ label: 'Download', primary: true, onRun }}
        when="checked 2 minutes ago"
      />
    );

    expect(container.querySelector('.update-card')?.getAttribute('data-tone')).toBe('ready');
    expect(screen.getByRole('status').textContent).toBe(
      'Version 2.5.0 is availableInstalled 2.4.0 · checked 2 minutes ago'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Installs the next time the app opens.')).toBeTruthy();
  });

  it('follows a download in the progress header under a quieter head', () => {
    const { container } = render(
      <UpdateCard
        glyph={Download}
        run={{ state: 'running', headline: 'Downloading 2.5.0', figure: '42%' }}
        title="Version 2.5.0"
        tone="busy"
      />
    );

    expect(container.querySelector('.update-card')?.classList.contains('with-run')).toBe(true);
    expect(screen.getByText('Downloading 2.5.0')).toBeTruthy();
  });

  it('turns its ring while it checks and shows a failure of its verb', () => {
    const { container } = render(
      <UpdateCard
        failure="The update could not be installed."
        glyph="checking"
        title="Checking…"
        tone="busy"
      />
    );

    expect(container.querySelector('svg.spinner.update-card-glyph')).not.toBeNull();
    expect(screen.getByRole('alert').textContent).toBe('The update could not be installed.');
  });
});

describe('UpdateNotes', () => {
  it('lists the notes under their areas, in a box the keys can scroll', () => {
    render(
      <UpdateNotes
        empty="No changes listed."
        groups={[
          { title: 'Services', lines: ['Start shows the reason a service stopped'] },
          { title: 'App', lines: ['Settings open on the page asked for'] }
        ]}
        heading="What's new"
        lines={[]}
      />
    );

    const box = screen.getByRole('group', { name: "What's new" });
    expect(box.tabIndex).toBe(0);
    expect(screen.getByRole('list', { name: 'Services' }).textContent).toBe(
      'Start shows the reason a service stopped'
    );
  });

  it('says so when the build lists no change', () => {
    render(<UpdateNotes empty="No changes listed." heading="What's new" lines={[]} />);

    expect(screen.getByText('No changes listed.')).toBeTruthy();
  });
});

describe('UpdateChecks and UpdatesPage', () => {
  it('is busy until a card arrives, then sets the cadence over the card', () => {
    const onChange = vi.fn();
    const checks = (
      <UpdateChecks
        choices={[
          { value: 'daily', label: 'Daily' },
          { value: 'never', label: 'Never' }
        ]}
        label="Check for updates"
        note="The next check is tomorrow."
        onChange={onChange}
        value="daily"
      />
    );
    const { container, rerender } = render(<UpdatesPage checks={checks} />);

    expect(container.querySelector('.updates-page')?.getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByRole('combobox')).toBeNull();

    rerender(
      <UpdatesPage
        card={<UpdateCard glyph={CircleCheck} title="Up to date" tone="ok" />}
        checks={checks}
      />
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Check for updates' }), {
      target: { value: 'never' }
    });
    expect(onChange).toHaveBeenCalledWith('never');
  });
});
