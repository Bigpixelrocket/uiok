/*
 * The geometry of the scatter chart (`ScatterChart.tsx`), which the other
 * charts share: each axis's domain, its ticks, where a value lands in pixels
 * and back, and the domain a dragged rectangle zooms to.
 */

/** How an axis reads its values: numbers, times in milliseconds, or the index of a category. */
export type ScatterAxisKind = 'number' | 'time' | 'category';

/** One axis of the chart: its title, kind, and, for categories, their names in order. */
export interface ScatterAxis {
  readonly title: string;
  readonly kind: ScatterAxisKind;
  readonly categories?: readonly string[];
  /** Whether a time axis holds times of day (from midnight) rather than dates. */
  readonly timeOfDay?: boolean;
}

/** A domain of an axis: its lowest and highest value. */
export interface Domain {
  readonly min: number;
  readonly max: number;
}

/**
 * The domain that holds `values`, with a twentieth of its width to spare on
 * each side so no point sits on the frame; a single value gets one either
 * side, and no value the unit domain. Categories span half a step past the
 * first and the last.
 */
export function domainOf(values: readonly number[], kind: ScatterAxisKind): Domain {
  if (values.length === 0) return { min: 0, max: 1 };

  let min = Infinity;
  let max = -Infinity;

  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (kind === 'category') return { min: min - 0.5, max: max + 0.5 };
  if (min === max) {
    const spare = kind === 'time' ? 3_600_000 : Math.max(1, Math.abs(min) / 10);

    return { min: min - spare, max: max + spare };
  }

  const spare = (max - min) / 20;

  return { min: min - spare, max: max + spare };
}

/** Where `value` of `domain` lands on a pixel range from `from` to `to`. */
export const scaled = (value: number, domain: Domain, from: number, to: number): number =>
  from + ((value - domain.min) / (domain.max - domain.min || 1)) * (to - from);

/** The value of `domain` a pixel of the range from `from` to `to` stands for. */
export const unscaled = (pixel: number, domain: Domain, from: number, to: number): number =>
  domain.min + ((pixel - from) / (to - from || 1)) * (domain.max - domain.min);

/** The round step nearest `span / count`: 1, 2, or 5 times a power of ten. */
const niceStep = (span: number, count: number): number => {
  const raw = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;

  return (fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10) * power;
};

/** Time steps a time axis may tick on, in milliseconds. */
const TIME_STEPS = [
  1000,
  60_000,
  600_000,
  3_600_000,
  6 * 3_600_000,
  86_400_000,
  7 * 86_400_000,
  30 * 86_400_000,
  365 * 86_400_000
];

/**
 * The ticks of an axis over `domain`, about `count` of them: round numbers;
 * round times; or each category in the domain, every few where there are
 * more than `count`. Each tick is counted from the first, never added up,
 * and a step finer than a double can tell apart at the domain's values (an
 * integer past 2^53, a deep zoom) gives no repeats, so the ticks stay few.
 */
export function ticksOf(domain: Domain, kind: ScatterAxisKind, count = 5): number[] {
  const span = domain.max - domain.min;

  if (!(span > 0) || !Number.isFinite(span)) return [];
  if (kind === 'category') {
    const first = Math.max(0, Math.ceil(domain.min));
    const last = Math.floor(domain.max);
    const every = Math.max(1, Math.ceil((last - first + 1) / count));
    const ticks: number[] = [];

    for (let at = first; at <= last; at += every) ticks.push(at);
    return ticks;
  }

  const step =
    kind === 'time'
      ? (TIME_STEPS.find((candidate) => span / candidate <= count) ?? niceStep(span, count))
      : niceStep(span, count);
  const ticks: number[] = [];
  const first = Math.ceil(domain.min / step);

  // A step is at least two thirds of `span / count`, so at most 1.5 × count + 1 ticks fit;
  // the bound only stops a step too fine to move a double.
  for (let index = 0; index <= 3 * count + 2; index += 1) {
    const at = (first + index) * step;

    if (at > domain.max) break;

    // Round away the float error a multiple of the step carries.
    const tick = Number(at.toPrecision(12));

    if (tick !== ticks.at(-1)) ticks.push(tick);
  }
  return ticks;
}

const pad = (value: number): string => String(value).padStart(2, '0');

/** A tick's label: the number, the date or the time of day in UTC, or the category. */
export function tickLabel(value: number, axis: ScatterAxis, domain: Domain): string {
  if (axis.kind === 'category') return axis.categories?.[Math.round(value)] ?? '';
  if (axis.kind === 'number') return String(value);

  if (axis.timeOfDay === true) {
    const seconds = Math.round(value / 1000);
    const sign = seconds < 0 ? '-' : '';
    const whole = Math.abs(seconds);

    return `${sign}${pad(Math.floor(whole / 3600))}:${pad(Math.floor((whole % 3600) / 60))}`;
  }

  const date = new Date(value);
  const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

  return domain.max - domain.min > 3 * 86_400_000
    ? day
    : `${day} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

/**
 * The domains a rectangle dragged from one pixel to another zooms to, in a
 * plot of `width` by `height` (y grows upward), or null for a rectangle too
 * small to mean a zoom (a click) or a zoom narrower than a double can tell
 * values apart in.
 */
export function zoomedTo(
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
  domains: { readonly x: Domain; readonly y: Domain },
  width: number,
  height: number
): { readonly x: Domain; readonly y: Domain } | null {
  if (Math.abs(to.x - from.x) < 4 || Math.abs(to.y - from.y) < 4) return null;

  const left = Math.min(from.x, to.x);
  const right = Math.max(from.x, to.x);
  const top = Math.min(from.y, to.y);
  const bottom = Math.max(from.y, to.y);

  const zoomed = {
    x: { min: unscaled(left, domains.x, 0, width), max: unscaled(right, domains.x, 0, width) },
    y: { min: unscaled(bottom, domains.y, height, 0), max: unscaled(top, domains.y, height, 0) }
  };

  // Past what a double tells apart at these values, a zoom shows nothing new.
  return finest(zoomed.x) || finest(zoomed.y) ? null : zoomed;
}

/** Whether a domain is too narrow to tell its values apart: a few doubles wide, or none. */
const finest = (domain: Domain): boolean =>
  !(
    domain.max - domain.min >
    64 * Number.EPSILON * Math.max(Math.abs(domain.min), Math.abs(domain.max), 1e-300)
  );
