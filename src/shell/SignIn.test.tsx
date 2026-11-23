import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HostKeyDialog, SignInDialog } from './SignIn.js';

describe('SignInDialog', () => {
  it('says where and who, takes the focus in its field, and sends the secret on Return', () => {
    const onSubmit = vi.fn();
    render(
      <SignInDialog
        confirmLabel="Sign In"
        facts={[
          { label: 'Server', value: 'staging' },
          { label: 'Account', value: 'deploy@staging.example.com' }
        ]}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        secretLabel="Password"
        title="Sign In"
      />
    );

    const field = screen.getByLabelText('Password');
    expect(document.activeElement).toBe(field);
    expect(screen.getByText('deploy@staging.example.com')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Sign In' }) as HTMLButtonElement).disabled).toBe(
      true
    );

    fireEvent.change(field, { target: { value: 'secret' } });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('secret');
  });

  it('says why it asks again and cancels on Escape', () => {
    const onCancel = vi.fn();
    render(
      <SignInDialog
        confirmLabel="Sign In"
        facts={[]}
        onCancel={onCancel}
        onSubmit={vi.fn()}
        rejection="That password was not accepted."
        secretLabel="Password"
        title="Sign In"
      />
    );

    expect(screen.getByLabelText('Password').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('That password was not accepted.');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('HostKeyDialog', () => {
  it('shows the host and the whole fingerprint, Trust answering yes', () => {
    const onTrust = vi.fn();
    render(
      <HostKeyDialog
        confirmLabel="Trust"
        fingerprint="SHA256:abc123"
        host={{ name: 'staging.example.com', detail: 'staging' }}
        keyType="ED25519"
        message="This host key has not been seen before."
        onCancel={vi.fn()}
        onTrust={onTrust}
        title="Trust Host Key?"
      />
    );

    expect(screen.getByText('SHA256:abc123')).toBeTruthy();
    expect(screen.getByText('staging.example.com')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Trust' }));
    expect(onTrust).toHaveBeenCalledTimes(1);
  });
});
