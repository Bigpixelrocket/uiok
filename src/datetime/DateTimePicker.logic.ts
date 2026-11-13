/*
 * The pure parts of `DateTimePicker`: a date or time value read into its
 * parts and written back, the days a month's grid shows from the week's
 * first day, and a month's step.
 */

/** What the picker picks: a date, a time, or both, with `fraction` digits of a second. */
export type PickerKind = 'date' | 'time' | 'datetime';

/** A value's parts; a missing date or time reads as 1 January of year 0 or midnight. */
export interface PickerParts {
  /** The year, four digits when written. */
  readonly year: number;
  /** The month, 1 to 12. */
  readonly month: number;
  /** The day of the month, from 1. */
  readonly day: number;
  /** The hour, 0 to 23. */
  readonly hour: number;
  /** The minute, 0 to 59. */
  readonly minute: number;
  /** The second, 0 to 59. */
  readonly second: number;
  /** The fraction of a second as its digits, empty for none. */
  readonly fraction: string;
}

const pad = (value: number, width = 2): string => String(Math.abs(value)).padStart(width, '0');

/** Today and now, in the computer's own time zone. */
export const nowParts = (now: Date = new Date()): PickerParts => ({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
  hour: now.getHours(),
  minute: now.getMinutes(),
  second: now.getSeconds(),
  fraction: ''
});

/**
 * A value's parts, or null when it is not a date or time the picker can
 * show (a keyword such as `now`, the zero date `0000-00-00`, a time past a
 * day), which the field keeps as typed. It reads `YYYY-MM-DD`, `HH:MM`,
 * `HH:MM:SS` with up to six digits of a fraction, and a date and a time
 * joined by `T` or a space.
 */
export function parsePicker(value: string): PickerParts | null {
  const match =
    /^(?:(\d{4})-(\d{2})-(\d{2}))?(?:[ T]?(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?)?$/u.exec(
      value.trim()
    );

  if (match === null || value.trim() === '') return null;

  const [, year, month, day, hour, minute, second, fraction] = match;
  const parts = {
    year: Number(year ?? 0),
    month: Number(month ?? 1),
    day: Number(day ?? 1),
    hour: Number(hour ?? 0),
    minute: Number(minute ?? 0),
    second: Number(second ?? 0),
    fraction: fraction ?? ''
  };

  if (year !== undefined && (parts.year === 0 || parts.month < 1 || parts.month > 12)) return null;
  if (parts.day < 1 || parts.day > daysIn(parts.year, parts.month)) return null;
  if (parts.hour > 23 || parts.minute > 59 || parts.second > 59) return null;
  return parts;
}

/**
 * The parts written as `kind` keeps them: `YYYY-MM-DD`, `HH:MM:SS`, or both
 * joined by `separator` (ISO 8601's `T` unless given; a space for a store
 * that writes them so), the seconds followed by `fraction` digits of a
 * second when `fraction` is above 0.
 */
export function formatPicker(
  kind: PickerKind,
  parts: PickerParts,
  fraction: number,
  separator = 'T'
): string {
  const date = `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}`;
  const digits = parts.fraction.padEnd(fraction, '0').slice(0, fraction);
  const time = `${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}${fraction > 0 ? `.${digits}` : ''}`;

  return kind === 'date' ? date : kind === 'time' ? time : `${date}${separator}${time}`;
}

/**
 * Midnight UTC on a day, `monthIndex` counting from 0 and overflowing as
 * `Date.UTC` does. Unlike `Date.UTC`, it keeps years 0 to 99 as written
 * rather than moving them to 1900 to 1999.
 */
export function utcDay(year: number, monthIndex: number, day: number): Date {
  const date = new Date(0);

  date.setUTCFullYear(year, monthIndex, day);
  return date;
}

/** The days in a month, 1 to 12. */
export const daysIn = (year: number, month: number): number => utcDay(year, month, 0).getUTCDate();

/**
 * The days a month's grid shows, a week a row from `firstDay` (1 Monday to
 * 7 Sunday): each date with whether it is in the month, the days of the
 * weeks around it filling the first and last rows.
 */
export function monthGrid(
  year: number,
  month: number,
  firstDay: number
): {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly inMonth: boolean;
}[] {
  // getUTCDay counts Sunday as 0; `firstDay` counts it as 7.
  const weekday = (utcDay(year, month - 1, 1).getUTCDay() + 6) % 7;
  const lead = (weekday - (firstDay - 1) + 7) % 7;
  const start = utcDay(year, month - 1, 1 - lead).getTime();
  const count = Math.ceil((lead + daysIn(year, month)) / 7) * 7;

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start + index * 86_400_000);

    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() + 1 === month
    };
  });
}

/** The month `by` months on, its day kept where the month has it. */
export function stepMonth(parts: PickerParts, by: number): PickerParts {
  const index = parts.year * 12 + (parts.month - 1) + by;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;

  return { ...parts, year, month, day: Math.min(parts.day, daysIn(year, month)) };
}

/** The weekday names from `firstDay` (1 Monday to 7 Sunday), short, in `locale`'s language. */
export function weekdayNames(firstDay: number, locale?: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });

  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, index) =>
    format.format(new Date(Date.UTC(2024, 0, firstDay + index)))
  );
}

/** A box in window coordinates, as `getBoundingClientRect` gives it. */
export interface PanelBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** How far the panel keeps from the window's edges, in pixels. */
export const PANEL_INSET = 8;

/** How far the panel stands off its button, in pixels (`--space-2`). */
export const PANEL_GAP = 4;

/**
 * Where the picker's panel sits in the window (`view`), given its button
 * and its own size: under the button, its left edge on the button's, unless the room
 * below is short of the panel and the room above is larger, when it opens
 * above. Either way it is moved back inside the window, `PANEL_INSET` from
 * each edge, so no part of it (its Now and Done buttons) is ever cut.
 */
export function panelPlace(
  anchor: PanelBox,
  panel: { readonly width: number; readonly height: number },
  view: { readonly width: number; readonly height: number }
): { readonly left: number; readonly top: number; readonly above: boolean } {
  const below = view.height - (anchor.top + anchor.height + PANEL_GAP) - PANEL_INSET;
  const overhead = anchor.top - PANEL_GAP - PANEL_INSET;
  const above = panel.height > below && overhead > below;
  const top = above
    ? anchor.top - PANEL_GAP - panel.height
    : anchor.top + anchor.height + PANEL_GAP;
  const clamp = (value: number, size: number, room: number): number =>
    Math.max(PANEL_INSET, Math.min(value, room - size - PANEL_INSET));

  return {
    left: clamp(anchor.left, panel.width, view.width),
    top: clamp(top, panel.height, view.height),
    above
  };
}
