import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode
} from 'react';

import { useLabels } from '../labels/UiokProvider.js';
import {
  spiedSubsection,
  subsectionScrollTop,
  type SubsectionAnchor
} from '../shell/SettingsDialog.logic.js';
import { cutTooltip } from '../tooltip/Tooltip.logic.js';
import { ModalDialog, type ModalDialogProps } from './ModalDialog.js';

/** The attribute that marks a section of a `SectionedDialog`'s body, carrying its id. */
const SECTION_ATTRIBUTE = 'data-dialog-section';

/** What can take the focus inside a section: its first control, for a section chosen from the keyboard. */
const FOCUSABLE =
  'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

/** One headed group of a `SectionedDialog`. */
export interface DialogSection {
  /** Names the section to the sidebar; unique in the dialog, the same in every language. */
  readonly id: string;
  /** Its name, in the sidebar and as the overline over its rows: "Depends on". */
  readonly title: string;
  /** Its rows: a `FieldGrid` of `FieldRow`s, notes, a listing. */
  readonly children: ReactNode;
}

/** Props for {@link SectionedDialog}. */
export interface SectionedDialogProps extends Omit<ModalDialogProps, 'children' | 'size'> {
  /** The body's groups, in order; the sidebar lists them in the same order. */
  readonly sections: readonly DialogSection[];
  /** The section brought to the top as the dialog opens; the first unless given. */
  readonly openAt?: string;
  /**
   * A line over the scrolling column that stays in view however far it is
   * scrolled: a save that failed (a danger `Notice`).
   */
  readonly notice?: ReactNode;
}

/**
 * Where each section starts in the column, in pixels from the top of its
 * scrolled content.
 */
const sectionAnchors = (column: HTMLElement): SubsectionAnchor[] => {
  const columnTop = column.getBoundingClientRect().top - column.scrollTop;

  return [...column.querySelectorAll<HTMLElement>(`[${SECTION_ATTRIBUTE}]`)].map((section) => ({
    id: section.getAttribute(SECTION_ATTRIBUTE) ?? '',
    top: section.getBoundingClientRect().top - columnTop
  }));
};

/** A press on a sidebar row leaves the focus where it was, as a list row's does. */
const keepFocus = (event: MouseEvent): void => event.preventDefault();

/**
 * A form too long for one view (a command's settings, a connection's
 * options), in a dialog with a sidebar of its sections beside a column that
 * scrolls: each section's name heads its group as an overline, a hairline
 * between groups. The sidebar marks the section in view and follows the
 * column as it scrolls, the way the Settings dialog marks a page's
 * subsection; a row scrolls the column to its section. A press leaves the
 * focus where it was; a row chosen from the keyboard (Return or Space on
 * it) moves the focus to its section's first control, so a keyboard user
 * lands where they asked to go. A fixed frame (`.sectioned-dialog`), so the
 * dialog does not resize as its fields change; everything else, the title,
 * the legend and its keys, and Escape, is `ModalDialog`'s.
 */
export function SectionedDialog({
  sections,
  openAt,
  notice,
  className,
  ...dialog
}: SectionedDialogProps): ReactElement {
  const labels = useLabels().dialog;
  const prefix = useId();
  const columnRef = useRef<HTMLDivElement>(null);
  // Set while the column scrolls to the section a sidebar row chose, so that
  // scroll keeps the choice marked even where the column cannot bring it to
  // the top (a short last section).
  const chosenScrollRef = useRef(false);
  const [current, setCurrent] = useState<string | null>(openAt ?? sections[0]?.id ?? null);
  const openAtRef = useRef(openAt);

  const spy = (column: HTMLElement): void => {
    setCurrent(spiedSubsection(sectionAnchors(column), column));
  };

  const show = (id: string, focus: boolean): void => {
    const column = columnRef.current;

    setCurrent(id);

    if (column === null) return;

    const top = subsectionScrollTop(sectionAnchors(column), id);

    if (top !== null) {
      const before = column.scrollTop;

      column.scrollTop = top;
      chosenScrollRef.current = column.scrollTop !== before;
    }

    if (focus) {
      [...column.querySelectorAll<HTMLElement>(`[${SECTION_ATTRIBUTE}]`)]
        .find((section) => section.getAttribute(SECTION_ATTRIBUTE) === id)
        ?.querySelector<HTMLElement>(FOCUSABLE)
        ?.focus({ preventScroll: true });
    }
  };

  // Opens on the section asked for, or marks the one in view.
  useLayoutEffect(() => {
    const column = columnRef.current;
    const first = openAtRef.current;

    if (column === null) return;

    if (first === undefined) {
      spy(column);
    } else {
      const top = subsectionScrollTop(sectionAnchors(column), first);

      if (top !== null) column.scrollTop = top;
    }
  }, []);

  // A section that grows or shrinks as it is filled in (a dependency added)
  // moves the one in view without a scroll, so the mark follows the content.
  useLayoutEffect(() => {
    const column = columnRef.current;

    if (column === null || typeof MutationObserver === 'undefined') return undefined;

    const observer = new MutationObserver(() => {
      if (!chosenScrollRef.current) spy(column);
    });

    observer.observe(column, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  const classes = className === undefined ? 'sectioned-dialog' : `sectioned-dialog ${className}`;

  return (
    <ModalDialog {...dialog} className={classes}>
      <div className="sectioned-dialog-body">
        <nav aria-label={labels.sections} className="sectioned-dialog-nav scroll-fade">
          {sections.map((section) => (
            <button
              aria-controls={`${prefix}-${section.id}`}
              aria-current={section.id === current ? 'location' : undefined}
              className="sectioned-dialog-nav-row"
              key={section.id}
              onClick={(event) => show(section.id, event.detail === 0)}
              onMouseDown={keepFocus}
              type="button"
              {...cutTooltip(section.title)}
            >
              {section.title}
            </button>
          ))}
        </nav>
        <div className="sectioned-dialog-column">
          {notice}
          <div
            className="sectioned-dialog-sections scroll-fade"
            onScroll={(event) => {
              if (chosenScrollRef.current) {
                chosenScrollRef.current = false;
              } else {
                spy(event.currentTarget);
              }
            }}
            ref={columnRef}
          >
            {sections.map((section) => (
              <section
                aria-labelledby={`${prefix}-${section.id}-title`}
                className="dialog-section"
                id={`${prefix}-${section.id}`}
                key={section.id}
                {...{ [SECTION_ATTRIBUTE]: section.id }}
              >
                <h3 className="dialog-section-title overline" id={`${prefix}-${section.id}-title`}>
                  {section.title}
                </h3>
                {section.children}
              </section>
            ))}
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}
