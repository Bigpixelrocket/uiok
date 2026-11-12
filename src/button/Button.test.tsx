import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { applyStylesheets, readStylesheet } from '../../test/stylesheets.js';
import { Button } from './Button.js';
import { IconButton } from './IconButton.js';

describe('Button', () => {
  it('never submits a form unless asked to', () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>
        <Button>Cancel</Button>
        <Button type="submit" variant="primary">
          Save
        </Button>
      </form>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('draws its tier and size from classes, keeping a layout class beside them', () => {
    render(
      <>
        <Button>Close</Button>
        <Button className="wide" size="small" variant="tonal">
          Install
        </Button>
      </>
    );

    expect(screen.getByRole('button', { name: 'Close' }).className).toBe('button button-neutral');
    expect(screen.getByRole('button', { name: 'Install' }).className).toBe(
      'button button-tonal button-small wide'
    );
  });
});

describe('the danger and pressed looks', () => {
  const styles = readStylesheet('src/button/button.css');

  it('draws a danger Button red-outlined, washed red under the pointer and while held', () => {
    render(<Button variant="danger">Delete</Button>);

    expect(screen.getByRole('button', { name: 'Delete' }).className).toBe('button button-danger');
    expect(styles).toMatch(
      /\.button-danger \{\s*border-color: var\(--danger\);\s*color: var\(--danger-text\);/
    );
    expect(styles).toMatch(/\.button-danger:hover[^{]*\{\s*background: var\(--danger-wash\);/);
    expect(styles).toMatch(
      /\.button-danger:active[^{]*\{\s*background: var\(--danger-wash-strong\);/
    );
  });

  it('presses a fill past its hover tone, never back to rest', () => {
    expect(styles).toMatch(
      /\.button-primary:active[^{]*\{\s*background: var\(--primary-pressed\);/
    );
    expect(styles).toMatch(/\.button-tonal:active[^{]*\{\s*background: var\(--tonal-pressed\);/);
  });
});

describe('a disabled Button or IconButton', () => {
  it('fades to --disabled-opacity under the same arrow an enabled one shows', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    render(
      <>
        <Button disabled variant="primary">
          Save
        </Button>
        <IconButton aria-label="Refresh" disabled>
          <svg aria-hidden="true" />
        </IconButton>
        <Button>Close</Button>
      </>
    );

    for (const name of ['Save', 'Refresh']) {
      const style = getComputedStyle(screen.getByRole('button', { name }));
      expect(style.cursor, name).toBe('default');
      expect(style.opacity, name).toBe('var(--disabled-opacity)');
    }
    expect(getComputedStyle(screen.getByRole('button', { name: 'Close' })).cursor).toBe('default');
  });
});

describe('IconButton', () => {
  it('is named by its label and never submits a form', () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>
        <IconButton aria-label="Refresh" size="small">
          <svg aria-hidden="true" />
        </IconButton>
      </form>
    );

    const button = screen.getByRole('button', { name: 'Refresh' });
    fireEvent.click(button);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(button.className).toBe('icon-button icon-button-small');
  });
});
