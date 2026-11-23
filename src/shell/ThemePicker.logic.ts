import type { AppearanceMode } from '../labels/settings.js';
import type { ThemeAppearance } from '../themes/ids.js';

/**
 * Where an arrow key moves the choice in a radio group of `count` options
 * from `index`: Right and Down to the next, Left and Up to the previous,
 * wrapping at either end. Null for any other key.
 */
export function steppedIndex(key: string, index: number, count: number): number | null {
  const delta =
    key === 'ArrowRight' || key === 'ArrowDown'
      ? 1
      : key === 'ArrowLeft' || key === 'ArrowUp'
        ? -1
        : 0;

  if (delta === 0 || count === 0) {
    return null;
  }

  return (index + delta + count) % count;
}

/**
 * The appearance the window wears now: the one chosen, or, while it follows
 * the system, the one the system uses (`systemDark`).
 */
export function appearanceInUse(mode: AppearanceMode, systemDark: boolean): ThemeAppearance {
  if (mode === 'system') {
    return systemDark ? 'dark' : 'light';
  }

  return mode;
}
