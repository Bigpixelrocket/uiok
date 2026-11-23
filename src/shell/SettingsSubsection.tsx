import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';

/**
 * The attribute that marks a subsection of a Settings page, carrying its
 * id; `SettingsDialog` finds the subsections by it to scroll to one and to
 * follow the one in view.
 */
export const SETTINGS_SUBSECTION_ATTRIBUTE = 'data-settings-subsection';

/**
 * The attribute that marks a page's sticky head (a find field and its
 * tools, pinned at the top of the column while the subsections scroll
 * under it); `SettingsDialog` counts its height, so a subsection it scrolls
 * to, or marks as in view, starts below the head rather than under it.
 */
export const SETTINGS_PAGE_HEAD_ATTRIBUTE = 'data-settings-page-head';

/**
 * The attribute that marks the control a page brings into view as it opens
 * (the theme in use on Appearance), when it is not wholly in view at the
 * page's top.
 */
export const SETTINGS_REVEAL_ATTRIBUTE = 'data-settings-reveal';

/** Props for {@link SettingsSubsection}. */
export interface SettingsSubsectionProps {
  /** The id the page lists in its `subsections`. */
  readonly id: string;
  readonly title: string;
  /** The rows: a `field-grid` on the label column every page shares. */
  readonly children: ReactNode;
}

/**
 * One subsection of a Settings page: its name as an overline over its rows,
 * with a hairline between subsections, marked so `SettingsDialog`'s sidebar
 * can scroll to it and follow it.
 */
export function SettingsSubsection({ id, title, children }: SettingsSubsectionProps): ReactElement {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="settings-subsection"
      {...{ [SETTINGS_SUBSECTION_ATTRIBUTE]: id }}
    >
      <h4 className="settings-subsection-title overline" id={headingId}>
        {title}
      </h4>
      {children}
    </section>
  );
}
