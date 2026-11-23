import {
  createContext,
  use,
  useId,
  type CSSProperties,
  type ReactElement,
  type ReactNode
} from 'react';

import { VisuallyHidden } from '../VisuallyHidden.js';
import { labelHelp } from './labelHelp.js';

/**
 * What a `FieldRow` tells the one control it holds: the id its label names,
 * the ids of what describes it (the problem, the note, and the help a
 * screen reader reads as the control takes focus), and whether its value is
 * wrong.
 */
export interface FieldRowWiring {
  readonly id: string;
  readonly describedBy: string | undefined;
  readonly invalid: boolean;
}

/** The wiring of the row a control stands in; null outside a `FieldRow`. */
const FieldRowContext = createContext<FieldRowWiring | null>(null);

/**
 * The attributes a control takes from the `FieldRow` it stands in, with
 * any it sets itself: its id (the row's, which its label names, so in a row
 * give the id to `FieldRow`), `aria-describedby` (its own ids first), and
 * `aria-invalid`.
 */
export function useFieldWiring(own: {
  readonly id?: string | undefined;
  readonly describedBy?: string | undefined;
  readonly invalid?: boolean | undefined;
}): {
  readonly id: string | undefined;
  readonly 'aria-describedby': string | undefined;
  readonly 'aria-invalid': true | undefined;
} {
  const row = use(FieldRowContext);
  const describedBy = [own.describedBy, row?.describedBy].filter(Boolean).join(' ');
  const invalid = own.invalid ?? row?.invalid ?? false;

  return {
    id: row?.id ?? own.id,
    'aria-describedby': describedBy === '' ? undefined : describedBy,
    'aria-invalid': invalid ? true : undefined
  };
}

/** Props for {@link FieldGrid}. */
export interface FieldGridProps {
  /** Its rows: `FieldRow`s, and any `FieldGroup` or line that spans both columns. */
  readonly children: ReactNode;
  /**
   * The label column's width (`136px`, `12em`); by default as wide as the
   * longest label, capped at 40% of the form.
   */
  readonly labelWidth?: string;
}

/**
 * A form laid out as rows of a label and its value on one label column,
 * each label centred on its control's first line. Draws `.field-grid`.
 */
export function FieldGrid({ children, labelWidth }: FieldGridProps): ReactElement {
  return (
    <div
      className="field-grid"
      style={
        labelWidth === undefined
          ? undefined
          : ({ '--field-label-width': labelWidth } as CSSProperties)
      }
    >
      {children}
    </div>
  );
}

/** Props for {@link FieldRow}. */
export interface FieldRowProps {
  /** What the field is for: "Host". */
  readonly label: ReactNode;
  /** A quieter second line under the label (which of two bands is in use). */
  readonly labelDetail?: ReactNode;
  /**
   * What the control is for, as the label's tooltip and the control's
   * accessible description (`labelHelp`); the label shows a dashed cue.
   */
  readonly help?: string;
  /**
   * The value: one control (`TextField`, `Select`, …), which takes the
   * row's id, note, problem, and help on its own, or `FieldOption` lines.
   */
  readonly children: ReactNode;
  /** One short line under the control on what the current choice does. */
  readonly note?: ReactNode;
  /** What is wrong with the value; marks the control invalid while set. */
  readonly problem?: ReactNode;
  /**
   * Names a group of controls (radios, checks) rather than one: the label
   * becomes the group's name, not a `<label>` for one control.
   */
  readonly group?: boolean;
  /**
   * The control's id, when the app must know it; one is made otherwise. The
   * row's id wins over one the control sets, so its label always names it.
   */
  readonly id?: string;
}

/**
 * One row of a `FieldGrid`: the label, then the value with its note and
 * problem under it. The one control inside takes the label's id, the
 * problem, note, and help as its description, and `aria-invalid` while a
 * problem stands, with no wiring by the app. Draws
 * `.field-label` and `.field-value` with `.field-note` and `.field-problem`.
 */
export function FieldRow({
  label,
  labelDetail,
  help,
  children,
  note,
  problem,
  group = false,
  id
}: FieldRowProps): ReactElement {
  const made = useId();
  const controlId = id ?? `${made}-control`;
  const labelId = `${made}-label`;
  const noteId = `${made}-note`;
  const problemId = `${made}-problem`;
  const helpId = `${made}-help`;
  const hasNote = note !== undefined && note !== null && note !== false;
  const hasProblem = problem !== undefined && problem !== null && problem !== false;
  const helpParts = labelHelp(help);
  // The help is read through aria-describedby with the note and problem, not
  // as aria-description, which aria-describedby would override.
  const describedBy = [hasProblem ? problemId : '', hasNote ? noteId : '', help ? helpId : '']
    .filter(Boolean)
    .join(' ');
  const wiring: FieldRowWiring = {
    id: controlId,
    describedBy: describedBy === '' ? undefined : describedBy,
    invalid: hasProblem
  };
  const labelBody = (
    <>
      {label}
      {labelDetail === undefined ? null : (
        <span className="settings-label-detail">{labelDetail}</span>
      )}
    </>
  );

  return (
    <>
      {group ? (
        <span className="field-label" id={labelId} {...helpParts.label}>
          {labelBody}
        </span>
      ) : (
        <label className="field-label" htmlFor={controlId} id={labelId} {...helpParts.label}>
          {labelBody}
        </label>
      )}
      <div
        aria-describedby={group ? wiring.describedBy : undefined}
        aria-labelledby={group ? labelId : undefined}
        className="field-value"
        role={group ? 'group' : undefined}
      >
        <FieldRowContext value={group ? null : wiring}>{children}</FieldRowContext>
        {hasProblem ? <FieldProblem id={problemId}>{problem}</FieldProblem> : null}
        {hasNote ? <FieldNote id={noteId}>{note}</FieldNote> : null}
        {help ? <VisuallyHidden id={helpId}>{help}</VisuallyHidden> : null}
      </div>
    </>
  );
}

/** Props for {@link FieldOption}. */
export interface FieldOptionProps {
  /** Choices or a field and its words, on one wrapping line. */
  readonly children: ReactNode;
}

/** One line of a row's value (a field and a choice beside it), at least a control high. Draws `.field-option`. */
export function FieldOption({ children }: FieldOptionProps): ReactElement {
  return <div className="field-option">{children}</div>;
}

/** Props for {@link FieldNote} and {@link FieldProblem}. */
export interface FieldMessageProps {
  /** Its words. */
  readonly children: ReactNode;
  /** Its id, for a control's `aria-describedby`. */
  readonly id?: string;
}

/**
 * One short line under a control on what the current choice does ("Worn
 * while the system is light."). Draws `.field-note`.
 */
export function FieldNote({ children, id }: FieldMessageProps): ReactElement {
  return (
    <p className="field-note" id={id}>
      {children}
    </p>
  );
}

/**
 * What is wrong with a value, as a status line led by the danger glyph.
 * Name it in the control's `aria-describedby` (`FieldRow` does). Draws
 * `.field-problem`.
 */
export function FieldProblem({ children, id }: FieldMessageProps): ReactElement {
  return (
    <p className="field-problem" id={id}>
      {children}
    </p>
  );
}

/** Props for {@link FieldGroup}. */
export interface FieldGroupProps {
  /** The group's name, as its legend: "Show". */
  readonly legend: ReactNode;
  /** Speaks the legend without drawing it, for a group a row's label already names. */
  readonly legendHidden?: boolean;
  /** Its choices: `Check`s or `Radio`s with their labels. */
  readonly children: ReactNode;
  /** Lays the choices in this many columns of equal width, filled row by row. */
  readonly columns?: number;
  /** One short line under the choices. */
  readonly note?: ReactNode;
  /** What is wrong with the choice. */
  readonly problem?: ReactNode;
}

/**
 * A group of choices under its legend, 4px apart, or in `columns`, described
 * by its problem and note (`aria-describedby`); a `note` or `problem` of
 * `false` draws nothing. Draws `fieldset.field-group` (`.field-columns`).
 */
export function FieldGroup({
  legend,
  legendHidden = false,
  children,
  columns,
  note,
  problem
}: FieldGroupProps): ReactElement {
  const made = useId();
  const hasProblem = problem !== undefined && problem !== null && problem !== false;
  const hasNote = note !== undefined && note !== null && note !== false;
  const describedBy = [hasProblem ? `${made}-problem` : '', hasNote ? `${made}-note` : '']
    .filter(Boolean)
    .join(' ');

  return (
    <fieldset
      aria-describedby={describedBy || undefined}
      className={columns === undefined ? 'field-group' : 'field-group field-columns'}
      style={columns === undefined ? undefined : ({ '--field-columns': columns } as CSSProperties)}
    >
      <legend className={legendHidden ? 'visually-hidden' : undefined}>{legend}</legend>
      {children}
      {hasProblem ? <FieldProblem id={`${made}-problem`}>{problem}</FieldProblem> : null}
      {hasNote ? <FieldNote id={`${made}-note`}>{note}</FieldNote> : null}
    </fieldset>
  );
}
