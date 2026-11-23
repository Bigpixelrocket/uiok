import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DialogLayer } from './DialogLayer.js';
import { SectionedDialog, type DialogSection } from './SectionedDialog.js';

const SECTIONS: readonly DialogSection[] = [
  { id: 'command', title: 'Command', children: <input aria-label="Name" /> },
  { id: 'depends', title: 'Depends on', children: <input aria-label="Waits for" /> },
  { id: 'health', title: 'Health', children: <input aria-label="Ready when" /> }
];

/** Lays the sections out 200px apart in a 300px column of 600px, as a browser would. */
function layOut(column: HTMLElement): void {
  Object.defineProperties(column, {
    clientHeight: { configurable: true, value: 300 },
    scrollHeight: { configurable: true, value: 600 }
  });
  column.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
  column.querySelectorAll<HTMLElement>('[data-dialog-section]').forEach((section, index) => {
    section.getBoundingClientRect = () => ({ top: index * 200 - column.scrollTop }) as DOMRect;
  });
}

const column = (): HTMLElement => document.querySelector('.sectioned-dialog-sections')!;

describe('SectionedDialog', () => {
  it('heads each section with its name and lists them in a named sidebar, the first marked', () => {
    render(
      <SectionedDialog labelId="edit" onCancel={vi.fn()} sections={SECTIONS} title="Edit Command" />
    );

    expect(screen.getByRole('dialog', { name: 'Edit Command' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Depends on' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Health', level: 3 })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Command' }).getAttribute('aria-current')).toBe(
      'location'
    );
  });

  it('follows the column as it scrolls, marking the section that reached its top', () => {
    render(
      <SectionedDialog labelId="edit" onCancel={vi.fn()} sections={SECTIONS} title="Edit Command" />
    );
    layOut(column());

    column().scrollTop = 210;
    fireEvent.scroll(column());

    expect(screen.getByRole('button', { name: 'Depends on' }).getAttribute('aria-current')).toBe(
      'location'
    );
    expect(screen.getByRole('button', { name: 'Command' }).getAttribute('aria-current')).toBeNull();
  });

  it('scrolls to a section a row names, leaving the focus where a press found it', () => {
    render(
      <SectionedDialog labelId="edit" onCancel={vi.fn()} sections={SECTIONS} title="Edit Command" />
    );
    layOut(column());
    const row = screen.getByRole('button', { name: 'Health' });

    fireEvent.mouseDown(row);
    fireEvent.click(row, { detail: 1 });

    expect(column().scrollTop).toBe(400 - 14);
    expect(row.getAttribute('aria-current')).toBe('location');
    expect(document.activeElement).not.toBe(screen.getByRole('textbox', { name: 'Ready when' }));
  });

  it('moves the focus to the section a row chosen from the keyboard names', () => {
    render(
      <SectionedDialog labelId="edit" onCancel={vi.fn()} sections={SECTIONS} title="Edit Command" />
    );
    layOut(column());

    fireEvent.click(screen.getByRole('button', { name: 'Depends on' }), { detail: 0 });

    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Waits for' }));
  });

  it('keeps the section it opened at marked where the column cannot bring it to the top', () => {
    // Laid out before the dialog's first layout pass: sections at 0, 200,
    // and 300 in a 300px column of 400px, so the column scrolls at most
    // 100px and the opening scroll to the second section stops at the bottom.
    const restore = [
      vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
        this: HTMLElement
      ) {
        return this.classList.contains('sectioned-dialog-sections') ? 300 : 0;
      }),
      vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (
        this: HTMLElement
      ) {
        return this.classList.contains('sectioned-dialog-sections') ? 400 : 0;
      }),
      vi.spyOn(Element.prototype, 'scrollTop', 'set').mockImplementation(function (
        this: Element,
        top: number
      ) {
        (this as HTMLElement & { scrolled?: number }).scrolled = Math.min(top, 100);
      }),
      vi.spyOn(Element.prototype, 'scrollTop', 'get').mockImplementation(function (this: Element) {
        return (this as HTMLElement & { scrolled?: number }).scrolled ?? 0;
      }),
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: Element
      ) {
        const sections = this.closest('.sectioned-dialog-sections');
        const at: Record<string, number> = { depends: 200, health: 300 };
        const top = at[this.getAttribute('data-dialog-section') ?? ''] ?? 0;

        return {
          top: sections === this || sections === null ? 0 : top - sections.scrollTop
        } as DOMRect;
      })
    ];

    try {
      render(
        <SectionedDialog
          labelId="edit"
          onCancel={vi.fn()}
          openAt="depends"
          sections={SECTIONS}
          title="Edit Command"
        />
      );
      expect(column().scrollTop).toBe(100);
      fireEvent.scroll(column());

      expect(screen.getByRole('button', { name: 'Depends on' }).getAttribute('aria-current')).toBe(
        'location'
      );
      expect(
        screen.getByRole('button', { name: 'Health' }).getAttribute('aria-current')
      ).toBeNull();
    } finally {
      restore.forEach((spy) => spy.mockRestore());
    }
  });

  it('opens at its section under a DialogLayer, which mounts the frame after the first commit', () => {
    const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      const at: Record<string, number> = { depends: 200, health: 400 };
      const top = at[this.getAttribute('data-dialog-section') ?? ''] ?? 0;
      const sections = this.closest('.sectioned-dialog-sections');

      return {
        top: sections === this || sections === null ? 0 : top - sections.scrollTop
      } as DOMRect;
    });

    try {
      render(
        <DialogLayer>
          <SectionedDialog
            labelId="edit"
            onCancel={vi.fn()}
            openAt="depends"
            sections={SECTIONS}
            title="Edit Command"
          />
        </DialogLayer>
      );

      expect(column().scrollTop).toBe(200 - 14);
    } finally {
      spy.mockRestore();
    }
  });

  it('moves the keyboard focus to the first control that takes it, past disabled ones', () => {
    render(
      <SectionedDialog
        labelId="edit"
        onCancel={vi.fn()}
        sections={[
          SECTIONS[0]!,
          {
            id: 'depends',
            title: 'Depends on',
            children: (
              <>
                <button disabled tabIndex={0} type="button">
                  Unavailable
                </button>
                <fieldset disabled>
                  <input aria-label="Locked" />
                </fieldset>
                <input aria-label="Waits for" />
              </>
            )
          }
        ]}
        title="Edit Command"
      />
    );
    layOut(column());

    fireEvent.click(screen.getByRole('button', { name: 'Depends on' }), { detail: 0 });

    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Waits for' }));
  });

  it("goes to a row's section on Return, never running the dialog's primary verb", () => {
    const save = vi.fn();

    render(
      <SectionedDialog
        labelId="edit"
        legend={{ leave: { label: 'Cancel' }, primary: { label: 'Save', onRun: save } }}
        onCancel={vi.fn()}
        sections={SECTIONS}
        title="Edit Command"
      />
    );
    layOut(column());
    const row = screen.getByRole('button', { name: 'Depends on' });

    row.focus();
    fireEvent.keyDown(row, { key: 'Enter' });

    expect(save).not.toHaveBeenCalled();
    expect(row.getAttribute('aria-current')).toBe('location');
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Waits for' }));
  });

  it("passes over a control out of the Tab order, a row's, to the first Tab stops on", () => {
    render(
      <SectionedDialog
        labelId="edit"
        onCancel={vi.fn()}
        sections={[
          SECTIONS[0]!,
          {
            id: 'depends',
            title: 'Depends on',
            children: (
              <>
                <button tabIndex={-1} type="button">
                  Remove
                </button>
                <button type="button">Add Dependency</button>
              </>
            )
          }
        ]}
        title="Edit Command"
      />
    );
    layOut(column());

    fireEvent.click(screen.getByRole('button', { name: 'Depends on' }), { detail: 0 });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Add Dependency' }));
  });

  it('keeps its notice outside the scrolling column', () => {
    render(
      <SectionedDialog
        labelId="edit"
        notice={<p role="alert">The command could not be saved.</p>}
        onCancel={vi.fn()}
        sections={SECTIONS}
        title="Edit Command"
      />
    );

    expect(column().contains(screen.getByRole('alert'))).toBe(false);
  });
});
