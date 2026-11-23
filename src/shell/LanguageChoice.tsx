import { useId } from 'react';
import type { ChangeEvent, ReactElement } from 'react';

import { labelHelp } from '../field/labelHelp.js';

/** One language a Language page offers. */
export interface LanguageOption {
  /** What the host saves ("system", "de-DE"). */
  readonly value: string;
  /** The language by its own name ("Deutsch"), or the system choice ("Match System (English)"). */
  readonly label: string;
  /** The option's own language tag, so it is read in its language; none for the system choice. */
  readonly lang?: string | null;
}

/** Props for {@link LanguageChoice}. */
export interface LanguageChoiceProps {
  /** The row's label ("Language"). */
  readonly label: string;
  /** What changes and when, the label's tooltip. */
  readonly help?: string;
  readonly value: string;
  readonly options: readonly LanguageOption[];
  /** Hears a new choice, never the one already shown. */
  readonly onChange: (value: string) => void;
}

/**
 * A Language page of Settings: one pop-up menu on the label column, the
 * system's choice first and then every language by its own name. The host
 * saves each choice, which applies at once.
 */
export function LanguageChoice({
  label,
  help,
  value,
  options,
  onChange
}: LanguageChoiceProps): ReactElement {
  const id = useId();
  const hint = labelHelp(help);

  const choose = (event: ChangeEvent<HTMLSelectElement>): void => {
    if (event.target.value !== value) onChange(event.target.value);
  };

  return (
    <div className="field-grid">
      <label className="field-label" htmlFor={id} {...hint.label}>
        {label}
      </label>
      <div className="field-value">
        <div className="field-option">
          <select
            {...hint.control}
            className="field field-sm"
            id={id}
            onChange={choose}
            value={value}
          >
            {options.map((option) => (
              <option key={option.value} lang={option.lang ?? undefined} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
