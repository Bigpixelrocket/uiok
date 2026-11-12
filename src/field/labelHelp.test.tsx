import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { labelHelp } from './labelHelp.js';

describe('labelHelp', () => {
  it('puts the help on the label as a tooltip and on the control for a screen reader', () => {
    const help = labelHelp('A name or an address this computer can reach.');

    render(
      <>
        <label className="field-label" htmlFor="host" {...help.label}>
          Host
        </label>
        <input className="field" id="host" {...help.control} />
      </>
    );

    expect(screen.getByText('Host').getAttribute('data-tooltip')).toBe(
      'A name or an address this computer can reach.'
    );
    expect(screen.getByRole('textbox', { name: 'Host' }).getAttribute('aria-description')).toBe(
      'A name or an address this computer can reach.'
    );
  });

  it('adds nothing without help', () => {
    expect(labelHelp(undefined)).toEqual({ label: {}, control: {} });
    expect(labelHelp('')).toEqual({ label: {}, control: {} });
  });
});
