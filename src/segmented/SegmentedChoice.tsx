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
  /**
   * Choices that cannot be chosen now: drawn faded where they stand, so the
   * control keeps its shape, and passed over by a click and the arrow keys.
   * None unless given; the chosen one should not be among them.
   */
  readonly disabledChoices?: readonly T[];
  /**
   * What the choice does, as the group's accessible description: the
   * `control` half of `labelHelp(help)` spread on the group, whose `label`
   * half is the tooltip on the element `labelId` names. A screen reader
   * hears it when the group takes focus.
   */
  readonly 'aria-description'?: string;
}

/**
 * One choice of several, drawn as a segmented control and announced as a
 * radio group: one Tab stop (the checked segment), and the arrow keys move
 * the choice, wrapping at the ends and passing over a disabled choice, with
 * the focus following it. Help that explains the choice is the label's
 * tooltip and the group's description (`aria-description`, from
 * `labelHelp`), as a field's is. Its look is
 * its own (`.segmented-choice` in `@bigpixelrocket/uiok/styles.css`), so it draws the same
 * in a dialog and on a page.
 */
export function SegmentedChoice<T extends string | number | null>({
  labelId,
  choices,
  value,
  onChange,
  render,
  disabledChoices = [],
  'aria-description': description
}: SegmentedChoiceProps<T>): ReactElement {
  const group = useRef<HTMLDivElement>(null);
  const step = (event: KeyboardEvent, delta: number): void => {
    event.preventDefault();
    const from = choices.indexOf(value);

    // The next choice that can be chosen, at most one lap round.
    for (let moved = 1; moved < choices.length; moved += 1) {
      const index = (from + delta * moved + choices.length * moved) % choices.length;
      const choice = choices[index] as T;

      if (!disabledChoices.includes(choice)) {
        onChange(choice);
        group.current?.querySelectorAll<HTMLElement>('[role="radio"]')[index]?.focus();
        return;
      }
    }
  };

  return (
    <div
      aria-description={description}
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
          disabled={disabledChoices.includes(choice)}
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
