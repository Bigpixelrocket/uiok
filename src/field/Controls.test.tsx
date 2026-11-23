import { fireEvent, render, screen } from '@testing-library/react';
import { Search } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { Check } from './Check.js';
import {
  FieldBox,
  Meter,
  Radio,
  Range,
  RestoreDefault,
  Select,
  TextArea,
  TextField
} from './Controls.js';
import { FieldGrid, FieldGroup, FieldOption, FieldRow } from './FieldLayout.js';

describe('FieldRow', () => {
  it('wires its one control to the label, note, problem, and help with no ids from the app', () => {
    render(
      <FieldGrid>
        <FieldRow
          help="A name this computer can reach."
          label="Host"
          note="Saved with the connection."
          problem="The host does not answer."
        >
          <TextField onChange={vi.fn()} value="db" />
        </FieldRow>
      </FieldGrid>
    );
    const field = screen.getByLabelText('Host');
    const problem = screen.getByText('The host does not answer.');
    const note = screen.getByText('Saved with the connection.');

    expect(field.classList.contains('field')).toBe(true);
    expect(field.getAttribute('aria-invalid')).toBe('true');
    const help = screen.getByText('A name this computer can reach.');

    expect(field.getAttribute('aria-describedby')).toBe(`${problem.id} ${note.id} ${help.id}`);
    expect(field.hasAttribute('aria-description')).toBe(false);
    expect(problem.classList.contains('field-problem')).toBe(true);
    expect(note.classList.contains('field-note')).toBe(true);
    expect(screen.getByText('Host').hasAttribute('data-label-help')).toBe(true);
  });

  it('keeps a control valid with no problem, and its own description ids first', () => {
    render(
      <FieldRow label="Port" note="Usually 5432.">
        <TextField aria-describedby="own" onChange={vi.fn()} value="5432" />
      </FieldRow>
    );
    const field = screen.getByLabelText('Port');

    expect(field.hasAttribute('aria-invalid')).toBe(false);
    expect(field.getAttribute('aria-describedby')?.startsWith('own ')).toBe(true);
  });

  it("names the control by the row's id over one the control sets", () => {
    render(
      <FieldRow id="host-field" label="Host">
        <TextField id="ignored" onChange={vi.fn()} value="db" />
      </FieldRow>
    );

    expect(screen.getByLabelText('Host').id).toBe('host-field');
  });

  it("names a slider and a meter by their row's label over their own", () => {
    render(
      <FieldGrid>
        <FieldRow label="Volume">
          <Range label="Loudness" onChange={vi.fn()} value={40} />
        </FieldRow>
        <FieldRow label="Strength">
          <Meter high={0.75} label="Score" low={0.4} optimum={1} value={0.6} />
        </FieldRow>
      </FieldGrid>
    );

    expect(screen.getByRole('slider', { name: 'Volume' })).toBeTruthy();
    expect(screen.getByRole('meter', { name: 'Strength' })).toBeTruthy();
    expect(screen.queryByLabelText('Loudness')).toBeNull();
  });

  it('labels and describes a slider, a meter, and a boxed field from their rows', () => {
    render(
      <FieldGrid>
        <FieldRow label="Volume" note="Applies to every window.">
          <Range onChange={vi.fn()} value={40} />
        </FieldRow>
        <FieldRow label="Strength">
          <Meter high={0.75} low={0.4} optimum={1} value={0.6} />
        </FieldRow>
        <FieldRow label="Filter" problem="No table matches.">
          <FieldBox glyph={Search} onChange={vi.fn()} value="zz" />
        </FieldRow>
      </FieldGrid>
    );
    const volume = screen.getByLabelText('Volume');
    const filter = screen.getByLabelText('Filter');

    expect(volume.getAttribute('type')).toBe('range');
    expect(volume.getAttribute('aria-describedby')).toBe(
      screen.getByText('Applies to every window.').id
    );
    expect(screen.getByLabelText('Strength').tagName).toBe('METER');
    expect(filter.tagName).toBe('INPUT');
    expect(filter.getAttribute('aria-invalid')).toBe('true');
    expect(filter.closest('.field-box')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('names a group of choices instead of one control', () => {
    render(
      <FieldRow group label="Appearance" labelDetail="In use now">
        <FieldOption>
          <Radio checked label="Light" name="mode" onChange={vi.fn()} value="light" />
          <Radio checked={false} label="Dark" name="mode" onChange={vi.fn()} value="dark" />
        </FieldOption>
      </FieldRow>
    );

    expect(screen.getByRole('group', { name: /^Appearance/ })).toBeTruthy();
    expect(screen.getByText('In use now').classList.contains('settings-label-detail')).toBe(true);
  });
});

describe('the field controls', () => {
  it('hears typed text, sizes and widths by name, and is read-only without onChange', () => {
    const onChange = vi.fn();
    render(
      <>
        <TextField
          aria-label="Count"
          onChange={onChange}
          size="sm"
          tone="accent"
          value="5"
          width="count"
        />
        <TextField aria-label="Shown" value="fixed" />
      </>
    );
    const count = screen.getByLabelText('Count');

    fireEvent.change(count, { target: { value: '50' } });
    expect(onChange).toHaveBeenCalledWith('50', expect.anything());
    expect(count.className).toBe('field field-sm settings-count');
    expect(count.dataset.tone).toBe('accent');
    expect((screen.getByLabelText('Shown') as HTMLInputElement).readOnly).toBe(true);
  });

  it('draws a select from its options, runs included, and hears the value chosen', () => {
    const onChange = vi.fn();
    render(
      <Select
        aria-label="Encoding"
        onChange={onChange}
        options={[
          { value: 'utf-8', label: 'UTF-8' },
          { group: 'Legacy', options: [{ value: 'latin-1', label: 'Latin-1' }] }
        ]}
        value="utf-8"
      />
    );
    const select = screen.getByLabelText('Encoding');

    expect(screen.getByRole('group', { name: 'Legacy' })).toBeTruthy();
    fireEvent.change(select, { target: { value: 'latin-1' } });
    expect(onChange).toHaveBeenCalledWith('latin-1', expect.anything());
  });

  it('frames a glyph and a bare input in a field box, the box outlined and the input invalid', () => {
    render(
      <FieldBox aria-label="Filter" glyph={Search} invalid onChange={vi.fn()} size="sm" value="" />
    );
    const input = screen.getByLabelText('Filter');
    const box = input.closest('label');

    expect(box?.className).toBe('field-box field-sm');
    expect(box?.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.className).toBe('');
  });

  it('draws a textarea in the well', () => {
    render(<TextArea aria-label="Notes" onChange={vi.fn()} value="hi" />);

    expect(screen.getByLabelText('Notes').className).toBe('field');
  });

  it('hears a radio’s value and a check’s label, in field-choice labels', () => {
    const onRadio = vi.fn();
    render(
      <FieldGroup columns={3} legend="Show">
        <Radio checked={false} label="Dark" name="mode" onChange={onRadio} value="dark" />
        <Check checked="mixed" label="All" onChange={vi.fn()} tone="danger" />
      </FieldGroup>
    );

    fireEvent.click(screen.getByLabelText('Dark'));
    expect(onRadio).toHaveBeenCalledWith('dark');
    const all = screen.getByLabelText('All') as HTMLInputElement;
    expect(all.indeterminate).toBe(true);
    expect(all.dataset.tone).toBe('danger');
    expect(all.closest('label')?.className).toBe('field-choice');
    const group = screen.getByRole('group', { name: 'Show' });
    expect(group.className).toBe('field-group field-columns');
    expect(group.style.getPropertyValue('--field-columns')).toBe('3');
  });

  it('fills a slider up to its value and names a meter', () => {
    const onChange = vi.fn();
    render(
      <>
        <Range label="Volume" max={200} onChange={onChange} value={50} />
        <Meter high={0.75} label="Strength" low={0.4} optimum={1} value={0.6} />
      </>
    );
    const range = screen.getByRole('slider', { name: 'Volume' });

    expect(range.style.getPropertyValue('--range-fill')).toBe('25%');
    fireEvent.change(range, { target: { value: '100' } });
    expect(onChange).toHaveBeenCalledWith(100);
    expect(screen.getByRole('meter', { name: 'Strength' })).toBeTruthy();
  });

  it('sets a setting back from its restore button', () => {
    const onClick = vi.fn();
    render(<RestoreDefault onClick={onClick}>Restore Default</RestoreDefault>);

    fireEvent.click(screen.getByRole('button', { name: 'Restore Default' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('sets the label column’s width on the grid', () => {
    const { container } = render(
      <FieldGrid labelWidth="136px">
        <FieldRow label="Name">
          <TextField onChange={vi.fn()} value="" />
        </FieldRow>
      </FieldGrid>
    );

    expect(
      (container.firstElementChild as HTMLElement).style.getPropertyValue('--field-label-width')
    ).toBe('136px');
  });
});
