/**
 * The library's theme picker (`ThemeChoices` from the shell area) over the
 * catalog's ids, so every page that shows a theme picker shows the same one.
 */

import type { ReactElement } from 'react';

import { ThemeChoices as LibraryThemeChoices } from '@bigpixelrocket/uiok/shell';
import { THEME_ENTRIES, type ThemeId } from '@bigpixelrocket/uiok/themes';

/** A theme's display name by id. */
export const themeName = (id: ThemeId): string =>
  THEME_ENTRIES.find((entry) => entry.id === id)?.name ?? id;

/** One appearance's themes as a radio group of miniatures, `chosen` checked. */
export function ThemeChoices({
  ids,
  label,
  chosen,
  onChoose
}: {
  readonly ids: readonly ThemeId[];
  readonly label: string;
  readonly chosen: ThemeId;
  readonly onChoose: (id: ThemeId) => void;
}): ReactElement {
  return (
    <LibraryThemeChoices
      label={label}
      onChange={(id) => {
        const next = ids.find((each) => each === id);

        if (next !== undefined) onChoose(next);
      }}
      themes={ids.map((id) => ({ id, name: themeName(id) }))}
      value={chosen}
    />
  );
}
