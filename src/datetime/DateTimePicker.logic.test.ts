import { describe, expect, it } from 'vitest';

import { formatPicker, monthGrid, parsePicker, stepMonth } from './DateTimePicker.logic.js';

describe('date and time picker', () => {
  it('reads a date, a time, and both, and refuses what it cannot show', () => {
    expect(parsePicker('2026-10-30 14:05:09.250')).toEqual({
      year: 2026,
      month: 10,
      day: 30,
      hour: 14,
      minute: 5,
      second: 9,
      fraction: '250'
    });
    expect(parsePicker('08:30')).toMatchObject({ hour: 8, minute: 30, second: 0 });
    expect(parsePicker('now')).toBeNull();
    expect(parsePicker('0000-00-00')).toBeNull();
    expect(parsePicker('2026-02-30')).toBeNull();
  });

  it('writes the parts back, the fraction to the digits asked, date and time joined by T or a given separator', () => {
    const parts = parsePicker('2026-01-02 03:04:05.5');

    if (parts === null) throw new Error('unread');
    expect(formatPicker('date', parts, 0)).toBe('2026-01-02');
    expect(formatPicker('time', parts, 0)).toBe('03:04:05');
    expect(formatPicker('datetime', parts, 3)).toBe('2026-01-02T03:04:05.500');
    expect(formatPicker('datetime', parts, 3, ' ')).toBe('2026-01-02 03:04:05.500');
    expect(parsePicker('2026-01-02T03:04:05')).toMatchObject({ day: 2, hour: 3, second: 5 });
  });

  it('lays a month out in weeks from the first day, and steps months keeping the day where it can', () => {
    // October 2026 starts on a Thursday.
    const monday = monthGrid(2026, 10, 1);
    const sunday = monthGrid(2026, 10, 7);

    expect(monday[0]).toEqual({ year: 2026, month: 9, day: 28, inMonth: false });
    expect(monday[3]).toEqual({ year: 2026, month: 10, day: 1, inMonth: true });
    expect(monday.length % 7).toBe(0);
    expect(sunday[0]).toEqual({ year: 2026, month: 9, day: 27, inMonth: false });
    expect(
      stepMonth({ year: 2026, month: 1, day: 31, hour: 0, minute: 0, second: 0, fraction: '' }, 1)
    ).toMatchObject({ year: 2026, month: 2, day: 28 });
    expect(
      stepMonth({ year: 2026, month: 1, day: 5, hour: 0, minute: 0, second: 0, fraction: '' }, -1)
    ).toMatchObject({ year: 2025, month: 12 });
  });
});
