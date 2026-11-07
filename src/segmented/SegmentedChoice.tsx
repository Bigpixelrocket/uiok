import { useRef, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';

/** Props for {@link SegmentedChoice}, over the type of its choices. */
export interface SegmentedChoiceProps<T extends string | number | null> {
  /** The id of the element that names the group, for `aria-labelledby`. */
  readonly labelId: string;
  /** Every choice, in the order the segments are drawn; each must be distinct. */
  readonly choices: readonly T[];
  /** The chosen one, which must be among `choices`. */
  readonly value: T;
  /** Called with the new choice; never for the one already chosen. */
  readonly onChange: (value: T) => void;
  /** What a segment shows for a choice: its words, an icon, or both. */
  readonly render: (choice: T) => ReactNode;
}

/**
 * One choice of several, drawn as a segmented control and announced as a
 * radio group: one Tab stop (the checked segment), and the arrow keys move
 * the choice, wrapping at the ends, with the focus following it. Its look is
 * its own (`.segmented-choice` in `@bigpixelrocket/uiok/styles.css`), so it draws the same
 * in a dialog and on a page.
 */
export function SegmentedChoice<T extends string | number | null>({
  labelId,
  choices,
  value,
  onChange,
  render
}: SegmentedChoiceProps<T>): ReactElement {
  const group = useRef<HTMLDivElement>(null);
  const step = (event: KeyboardEvent, delta: number): void => {
    event.preventDefault();
    const index = (choices.indexOf(value) + delta + choices.length) % choices.length;

    onChange(choices[index] as T);
    group.current?.querySelectorAll<HTMLElement>('[role="radio"]')[index]?.focus();
  };

  return (
    <div
      aria-labelledby={labelId}
      className="segmented-choice"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          step(event, 1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          step(event, -1);
        }
      }}
      ref={group}
      role="radiogroup"
    >
      {choices.map((choice) => (
        <button
          aria-checked={choice === value}
          className="segmented-choice-option"
          key={String(choice)}
          onClick={() => {
            // The chosen segment again changes nothing, so it reads nothing.
            if (choice !== value) {
              onChange(choice);
            }
          }}
          role="radio"
          tabIndex={choice === value ? 0 : -1}
          type="button"
        >
          {render(choice)}
        </button>
      ))}
    </div>
  );
}
