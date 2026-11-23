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
const FOCUSABLE = 'input:not([type="hidden"]), select, textarea, button, [href], [tabindex]';

/**
 * Moves the focus to the first control of `section` that Tab would stop on
 * and that takes it: one in the Tab order (a row's control out of it, at
 * `tabIndex` -1, is the cursor row's keys' to run), not disabled (by itself
 * or a disabled fieldset), not hidden, and, should the browser still refuse
 * one, the next. So Tab goes on from it as the dialog's Tab cycle expects.
 */
const focusFirstControl = (section: Element): void => {
  for (const control of section.querySelectorAll<HTMLElement>(FOCUSABLE)) {
    if (
      control.tabIndex < 0 ||
      control.matches(':disabled') ||
      control.closest('[hidden], [inert]') !== null
    ) {
      continue;
    }

    control.focus({ preventScroll: true });

    if (control.ownerDocument.activeElement === control) return;
  }
};

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
  // The scrolling column, as state: a dialog under a `DialogLayer` mounts
  // its frame only once the layer's element exists, after this component's
  // first commit, so the effects below wait for the column, not the mount.
  const [column, setColumn] = useState<HTMLDivElement | null>(null);
  // Set while the column scrolls to the section a sidebar row chose, so that
  // scroll keeps the choice marked even where the column cannot bring it to
  // the top (a short last section).
  const chosenScrollRef = useRef(false);
  const [current, setCurrent] = useState<string | null>(openAt ?? sections[0]?.id ?? null);
  const openAtRef = useRef(openAt);

  const spy = (column: HTMLElement): void => {
    setCurrent(spiedSubsection(sectionAnchors(column), column));
  };

  // Scrolls the column to a chosen section, keeping the scroll it causes from
  // moving the mark off it.
  const scrollTo = (column: HTMLElement, id: string): void => {
    const top = subsectionScrollTop(sectionAnchors(column), id);

    if (top === null) return;

    const before = column.scrollTop;

    column.scrollTop = top;
    chosenScrollRef.current = column.scrollTop !== before;
  };

  const show = (id: string, focus: boolean): void => {
    setCurrent(id);

    if (column === null) return;

    scrollTo(column, id);

    if (focus) {
      const section = [...column.querySelectorAll<HTMLElement>(`[${SECTION_ATTRIBUTE}]`)].find(
        (candidate) => candidate.getAttribute(SECTION_ATTRIBUTE) === id
      );

      if (section !== undefined) focusFirstControl(section);
    }
  };

  // Opens on the section asked for, or marks the one in view, once the
  // column is in the document.
  useLayoutEffect(() => {
    const first = openAtRef.current;

    if (column === null) return;

    if (first === undefined) {
      spy(column);
    } else {
      scrollTo(column, first);
    }
    // Runs once per column: a later openAt does not scroll an open dialog.
  }, [column]);

  // A section that grows or shrinks as it is filled in (a dependency added)
  // moves the one in view without a scroll, so the mark follows the content.
  useLayoutEffect(() => {
    if (column === null || typeof MutationObserver === 'undefined') return undefined;

    const observer = new MutationObserver(() => {
      if (!chosenScrollRef.current) spy(column);
    });

    observer.observe(column, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [column]);

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
              // Return on a row goes to its section, as Space does, instead
              // of running the dialog's primary verb, which plain Return
              // runs from anywhere else in the dialog.
              onKeyDown={(event) => {
                if (
                  event.key !== 'Enter' ||
                  event.nativeEvent.isComposing ||
                  event.repeat ||
                  event.altKey ||
                  event.ctrlKey ||
                  event.metaKey ||
                  event.shiftKey
                ) {
                  return;
                }

                event.preventDefault();
                event.stopPropagation();
                show(section.id, true);
              }}
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
            ref={setColumn}
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
