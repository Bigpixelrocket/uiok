/**
 * The library's theme picker drawn on the site: one appearance's themes as
 * a radio group of miniatures (`.theme-choices`, `.theme-choice`, and
 * `.theme-preview` from the library's shell stylesheet), so every page that
 * shows a theme picker shows the same one.
 */

import type { ReactElement } from 'react';

import { THEME_ENTRIES, THEME_PREVIEW_ATTRIBUTE, type ThemeId } from '@bigpixelrocket/uiok/themes';

/** A theme's display name by id. */
export const themeName = (id: ThemeId): string =>
  THEME_ENTRIES.find((entry) => entry.id === id)?.name ?? id;

/** A theme's miniature window, painted from its preview scope. */
export function ThemePreview({ id }: { readonly id: ThemeId }): ReactElement {
  return (
    <span aria-hidden className="theme-preview" {...{ [THEME_PREVIEW_ATTRIBUTE]: id }}>
      <span className="theme-preview-header">
        <span className="theme-preview-lights">
          <span />
          <span />
          <span />
        </span>
      </span>
      <span className="theme-preview-body">
        <span className="theme-preview-sidebar">
          <span className="theme-preview-row lit" />
          <span className="theme-preview-row" />
          <span className="theme-preview-row" />
        </span>
        <span className="theme-preview-panel">
          <span className="theme-preview-line text" />
          <span className="theme-preview-line dim" />
          <span className="theme-preview-chips">
            <span className="theme-preview-chip primary" />
            <span className="theme-preview-chip accent" />
          </span>
          <span className="theme-preview-swatches">
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <span className={`theme-preview-swatch ansi-${index}`} key={index} />
            ))}
          </span>
        </span>
      </span>
    </span>
  );
}

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
    <div aria-label={label} className="theme-choices" role="radiogroup">
      {ids.map((id) => (
        <button
          aria-checked={id === chosen}
          className="theme-choice"
          key={id}
          onClick={() => onChoose(id)}
          role="radio"
          type="button"
        >
          <span className="theme-choice-frame">
            <ThemePreview id={id} />
          </span>
          <span className="theme-choice-name">{themeName(id)}</span>
        </button>
      ))}
    </div>
  );
}
