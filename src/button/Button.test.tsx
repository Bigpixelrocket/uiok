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

describe('a disabled Button or IconButton', () => {
  it('fades to --disabled-opacity under an arrow, over its own pointer', () => {
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
    expect(getComputedStyle(screen.getByRole('button', { name: 'Close' })).cursor).toBe('pointer');
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
