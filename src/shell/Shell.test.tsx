import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AboutWindow } from './AboutWindow.js';
import { LanguageChoice } from './LanguageChoice.js';
import { BrandMark, Lockup } from './Lockup.js';
import { ChannelMarker, TitleBar } from './TitleBar.js';
import { UpdatePill } from './UpdatePill.js';

describe('Lockup', () => {
  it('names the product as one heading, the mark drawn for the eye only', () => {
    render(
      <Lockup
        className="shell-lockup"
        lead="Acme"
        mark={
          <BrandMark>
            <rect className="brand-mark-glyph" height="8" width="8" x="5" y="5" />
          </BrandMark>
        }
        strong="OK"
      />
    );

    const heading = screen.getByRole('heading', { name: 'AcmeOK' });
    expect(heading.classList.contains('lockup')).toBe(true);
    expect(heading.querySelector('b')?.textContent).toBe('OK');
    expect(heading.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(heading.querySelector('.brand-mark-glyph')).not.toBeNull();
  });
});

describe('TitleBar', () => {
  it('clears the window buttons where they sit at its leading end', () => {
    const { container, rerender } = render(<TitleBar trafficLights>x</TitleBar>);

    expect(container.querySelector('.shell-topbar')?.hasAttribute('data-traffic-lights')).toBe(
      true
    );
    rerender(<TitleBar>x</TitleBar>);
    expect(container.querySelector('.shell-topbar')?.hasAttribute('data-traffic-lights')).toBe(
      false
    );
  });

  it('marks a build that is not the release with its channel, detail, and unsaved changes', () => {
    render(
      <TitleBar>
        <ChannelMarker
          detail="feat/frame"
          label="Local"
          modified="Uncommitted changes"
          title="Local · feat/frame"
        />
      </TitleBar>
    );

    expect(screen.getByText('Local')).toBeTruthy();
    expect(screen.getByText('feat/frame')).toBeTruthy();
    expect(screen.getByText('Uncommitted changes').classList.contains('visually-hidden')).toBe(
      true
    );
  });
});

describe('UpdatePill', () => {
  it.each([
    ['offered', 'button-tonal'],
    ['ready', 'button-primary'],
    ['download-failed', 'button-neutral']
  ] as const)('wears its state %s as %s and opens its place', (state, look) => {
    const onOpen = vi.fn();
    render(
      <UpdatePill
        description="Update available · 2.5.0"
        label="Update"
        onOpen={onOpen}
        state={state}
      />
    );

    const pill = screen.getByRole('button', { name: 'Update' });
    expect(pill.classList.contains(look)).toBe(true);
    expect(pill.getAttribute('data-state')).toBe(state);
    fireEvent.click(pill);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe('AboutWindow', () => {
  it('shows the icon, the lockup with the channel tag, and the version', () => {
    const { container } = render(
      <AboutWindow
        channel="latest"
        channelTag="Latest"
        icon="/about-icon.png"
        lockup={<Lockup as="span" className="about-lockup-text" lead="Acme" strong="OK" />}
        version="Version 0.3.0 (412)"
      />
    );

    expect(container.querySelector('.about-window')?.getAttribute('data-channel')).toBe('latest');
    expect(container.querySelector('.channel-tag')?.textContent).toBe('Latest');
    expect(screen.getByText('Version 0.3.0 (412)')).toBeTruthy();
  });

  it('wears no channel on the release', () => {
    const { container } = render(<AboutWindow icon="/i.png" lockup="AcmeOK" />);

    expect(container.querySelector('.about-window')?.hasAttribute('data-channel')).toBe(false);
    expect(container.querySelector('.channel-tag')).toBeNull();
    expect(container.querySelector('.about-version')).toBeNull();
  });
});

describe('LanguageChoice', () => {
  it('offers every language by its own name and hears a new choice only', () => {
    const onChange = vi.fn();
    render(
      <LanguageChoice
        label="Language"
        onChange={onChange}
        options={[
          { value: 'system', label: 'Match System (English)' },
          { value: 'de-DE', label: 'Deutsch', lang: 'de-DE' }
        ]}
        value="system"
      />
    );

    const select = screen.getByRole('combobox', { name: 'Language' });
    expect(screen.getByRole('option', { name: 'Deutsch' }).getAttribute('lang')).toBe('de-DE');
    fireEvent.change(select, { target: { value: 'de-DE' } });
    expect(onChange).toHaveBeenCalledWith('de-DE');
  });
});
