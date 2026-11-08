import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactElement } from 'react';

import { Button } from '../button/Button.js';
import { IconButton } from '../button/IconButton.js';
import type { DateTimeLabels } from '../labels/dateTime.js';
import { useLabels } from '../labels/UiokProvider.js';
import { tooltip } from '../tooltip/Tooltip.logic.js';
import {
  formatPicker,
  monthGrid,
  nowParts,
  parsePicker,
  stepMonth,
  utcDay,
  weekdayNames,
  type PickerKind,
  type PickerParts
} from './DateTimePicker.logic.js';

/** The fields of a time, each with its largest value. */
const TIME_FIELDS = [
  { part: 'hour', max: 23 },
  { part: 'minute', max: 59 },
  { part: 'second', max: 59 }
] as const;

/**
 * The most fraction digits a time field's own width shows whole; a longer
 * fraction field (microseconds) widens to its digit count (`.long`, with
 * `--date-picker-digits`).
 */
const SHORT_FRACTION = 3;

/** A time field's label. */
const timeFieldLabel = (
  labels: DateTimeLabels,
  part: (typeof TIME_FIELDS)[number]['part']
): string => labels[part];

/** Props for {@link DateTimePicker}. */
export interface DateTimePickerProps {
  /** What it picks: a date, a time, or both. */
  readonly kind: PickerKind;
  /** How many digits of a second a time keeps, 0 to 6; 0 shows no fraction field. */
  readonly fraction?: number;
  /** The field's value as typed, which the picker reads with `parse`. */
  readonly value: string;
  /** Called with the picked value, written with `format`. */
  readonly onChange: (value: string) => void;
  /** The week's first day in the month grid, 1 Monday to 7 Sunday; Monday unless given. */
  readonly firstDay?: number;
  /** The button's accessible name, what it picks ("Pick the due date"). */
  readonly label: string;
  /**
   * What hovering the button says; its `label` unless given. A store that
   * takes values the picker cannot pick says so here.
   */
  readonly hint?: string;
  /** Whether the button is disabled. */
  readonly disabled?: boolean;
  /**
   * Writes picked parts as the field's value; `formatPicker` (ISO 8601,
   * date and time joined by `T`) unless given. A store that joins them with
   * a space passes `(kind, parts, fraction) => formatPicker(kind, parts, fraction, ' ')`.
   */
  readonly format?: (kind: PickerKind, parts: PickerParts, fraction: number) => string;
  /**
   * Reads the field's value into parts, or null for one the picker cannot
   * show, which opens it on today; `parsePicker` unless given.
   */
  readonly parse?: (value: string) => PickerParts | null;
}

/**
 * The button beside a date or time field that opens its picker: a month's
 * days a week a row from `firstDay`, the previous and next month, Today,
 * and for a time its hour, minute, and second, with the fraction of a
 * second where the value keeps one (`fraction` digits). A pick writes the
 * value through `onChange`; Done or Escape closes it, as does a pointer
 * outside it, and a day picked for a date closes it. A value the picker
 * cannot show (a keyword, the zero date) opens it on today and stays as
 * typed until a pick. Month and weekday names come from `Intl` in the
 * `dateTime` labels' locale; the field words from the same group.
 *
 * The panel is an overlay (`data-overlay`), so a window key policy that
 * watches overlays holds its own keys while it is open.
 */
export function DateTimePicker({
  kind,
  fraction = 0,
  value,
  onChange,
  firstDay = 1,
  label,
  hint,
  disabled = false,
  format = formatPicker,
  parse = parsePicker
}: DateTimePickerProps): ReactElement {
  const labels = useLabels().dateTime;
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<PickerParts>(() => parse(value) ?? nowParts());
  const box = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const picked = parse(value);

  // A pointer outside the picker closes it.
  useEffect(() => {
    if (!open) return;

    const onPointer = (event: PointerEvent): void => {
      if (!(event.target instanceof Node) || !box.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener('pointerdown', onPointer, true);
    return () => document.removeEventListener('pointerdown', onPointer, true);
  }, [open]);

  const write = (parts: PickerParts): void => {
    setShown(parts);
    onChange(format(kind, parts, fraction));
  };
  const base = picked ?? shown;
  const days = monthGrid(shown.year, shown.month, firstDay);
  const monthName = new Intl.DateTimeFormat(labels.locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(utcDay(shown.year, shown.month - 1, 1));
  const close = (): void => setOpen(false);

  return (
    <div className="date-picker" ref={box}>
      <IconButton
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        onClick={() => {
          setShown(parse(value) ?? nowParts());
          setOpen(!open);
        }}
        size="small"
        {...tooltip(hint ?? label)}
      >
        {kind === 'time' ? <Clock aria-hidden size={13} /> : <CalendarDays aria-hidden size={13} />}
      </IconButton>
      {open && (
        <div
          aria-labelledby={titleId}
          className="date-picker-panel"
          data-overlay
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              close();
            }
          }}
          role="dialog"
        >
          {kind !== 'time' && (
            <>
              <div className="date-picker-head">
                <IconButton
                  aria-label={labels.previousMonth}
                  onClick={() => setShown(stepMonth(shown, -1))}
                  size="small"
                >
                  <ChevronLeft aria-hidden size={13} />
                </IconButton>
                <strong id={titleId}>{monthName}</strong>
                <IconButton
                  aria-label={labels.nextMonth}
                  onClick={() => setShown(stepMonth(shown, 1))}
                  size="small"
                >
                  <ChevronRight aria-hidden size={13} />
                </IconButton>
              </div>
              <div className="date-picker-days" role="grid">
                <div className="date-picker-week" role="row">
                  {weekdayNames(firstDay, labels.locale).map((name) => (
                    <span className="date-picker-weekday" key={name} role="columnheader">
                      {name}
                    </span>
                  ))}
                </div>
                {Array.from({ length: days.length / 7 }, (_, week) => (
                  <div className="date-picker-week" key={week} role="row">
                    {days.slice(week * 7, week * 7 + 7).map((day) => {
                      const current =
                        picked !== null &&
                        picked.year === day.year &&
                        picked.month === day.month &&
                        picked.day === day.day;

                      return (
                        <button
                          aria-selected={current}
                          className={[
                            'date-picker-day',
                            day.inMonth ? '' : 'outside',
                            current ? 'current' : ''
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          key={`${day.month}-${day.day}`}
                          onClick={() => {
                            write({ ...base, year: day.year, month: day.month, day: day.day });
                            if (kind === 'date') close();
                          }}
                          role="gridcell"
                          type="button"
                        >
                          {day.day}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          )}
          {kind !== 'date' && (
            <div className="date-picker-time" id={kind === 'time' ? titleId : undefined}>
              {TIME_FIELDS.map((field) => (
                <label className="date-picker-field" key={field.part}>
                  {timeFieldLabel(labels, field.part)}
                  <input
                    className="date-picker-input"
                    inputMode="numeric"
                    max={field.max}
                    min={0}
                    onChange={(event) => {
                      const next = Math.min(
                        field.max,
                        Math.max(0, Number(event.currentTarget.value))
                      );

                      if (Number.isFinite(next)) write({ ...base, [field.part]: next });
                    }}
                    type="number"
                    value={base[field.part]}
                  />
                </label>
              ))}
              {fraction > 0 && (
                <label className="date-picker-field">
                  {fraction > 3 ? labels.microsecond : labels.millisecond}
                  <input
                    className={
                      fraction > SHORT_FRACTION ? 'date-picker-input long' : 'date-picker-input'
                    }
                    inputMode="numeric"
                    onChange={(event) =>
                      write({
                        ...base,
                        fraction: event.currentTarget.value.replace(/\D/gu, '').slice(0, fraction)
                      })
                    }
                    style={
                      fraction > SHORT_FRACTION
                        ? ({ '--date-picker-digits': fraction } as CSSProperties)
                        : undefined
                    }
                    value={base.fraction.padEnd(fraction, '0').slice(0, fraction)}
                  />
                </label>
              )}
            </div>
          )}
          <div className="date-picker-foot">
            <Button
              onClick={() => {
                write(nowParts());
                if (kind === 'date') close();
              }}
              size="small"
            >
              {kind === 'date' ? labels.today : labels.now}
            </Button>
            <Button onClick={close} size="small" variant="primary">
              {labels.done}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
