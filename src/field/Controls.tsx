import type { LucideIcon } from 'lucide-react';
import type {
  ChangeEvent,
  ComponentPropsWithRef,
  CSSProperties,
  ReactElement,
  ReactNode
} from 'react';

import { ICON_SM } from '../icon/sizes.js';
import { useFieldWiring } from './FieldLayout.js';

/**
 * A field's height by where it stands: `md` (28px) in a dialog or a single
 * prompt, `sm` (24px) in a page form, a toolbar, or a settings row, `xs`
 * (20px) inside a row or a path bar.
 */
export type FieldSize = 'md' | 'sm' | 'xs';

/**
 * A field's width: `full`, its column's (the default); `short`, eight
 * characters for a port or a code; `count`, a few digits; `countOrWord`, a
 * count whose empty field reads as a word ("No limit").
 */
export type FieldWidth = 'full' | 'short' | 'count' | 'countOrWord';

/**
 * A field's tone: `warning` a value that works but needs a second look,
 * `accent` a value changed from its default. A problem wins over either.
 */
export type FieldTone = 'warning' | 'accent';

const SIZE_CLASS: Readonly<Record<FieldSize, string>> = { md: '', sm: 'field-sm', xs: 'field-xs' };
const WIDTH_CLASS: Readonly<Record<FieldWidth, string>> = {
  full: '',
  short: 'field-short',
  count: 'settings-count',
  countOrWord: 'settings-count-or-word'
};

const classes = (...names: readonly (string | false | undefined)[]): string =>
  names.filter(Boolean).join(' ');

/** The props every field shares, beside its element's own. */
interface FieldLook {
  /** Its height by place; `md` unless given. */
  readonly size?: FieldSize;
  /** Outlines it in the danger tone; a `FieldRow` with a problem sets it on its own. */
  readonly invalid?: boolean;
  /** A warning or a changed value. */
  readonly tone?: FieldTone;
}

/** Props for {@link TextField}: an input's own, but its class, style, and change handler. */
export interface TextFieldProps
  extends
    FieldLook,
    Omit<
      ComponentPropsWithRef<'input'>,
      'className' | 'style' | 'size' | 'onChange' | 'value' | 'defaultValue'
    > {
  /** The text it holds. */
  readonly value: string;
  /** Hears the text as typed. */
  readonly onChange?: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
  /** Its width; its column's unless given. */
  readonly width?: FieldWidth;
  /**
   * The field holds no value (SQL NULL): its placeholder shows in the
   * missing value's dim italic.
   */
  readonly nullValue?: boolean;
}

/**
 * A text, number, password, or search field in the shared well, its value in
 * the code face. A number field draws the stepper cap. In a `FieldRow` it
 * takes the row's label, note, problem, and help. Draws `input.field`.
 */
export function TextField({
  value,
  onChange,
  size = 'md',
  width = 'full',
  invalid,
  tone,
  nullValue = false,
  id,
  'aria-describedby': describedBy,
  type = 'text',
  ...props
}: TextFieldProps): ReactElement {
  const wiring = useFieldWiring({ id, describedBy, invalid });

  return (
    <input
      {...props}
      {...wiring}
      className={classes('field', SIZE_CLASS[size], WIDTH_CLASS[width], nullValue && 'value-null')}
      data-tone={tone}
      onChange={onChange === undefined ? undefined : (event) => onChange(event.target.value, event)}
      readOnly={props.readOnly ?? onChange === undefined}
      type={type}
      value={value}
    />
  );
}

/** Props for {@link TextArea}: a textarea's own, but its class, style, and change handler. */
export interface TextAreaProps
  extends
    FieldLook,
    Omit<
      ComponentPropsWithRef<'textarea'>,
      'className' | 'style' | 'onChange' | 'value' | 'defaultValue'
    > {
  /** The text it holds. */
  readonly value: string;
  /** Hears the text as typed. */
  readonly onChange?: (value: string, event: ChangeEvent<HTMLTextAreaElement>) => void;
}

/**
 * Text of several lines in the shared well, with no corner grip: its pane or
 * dialog sizes it (`rows`). In a `FieldRow` it takes the row's wiring.
 * Draws `textarea.field`.
 */
export function TextArea({
  value,
  onChange,
  size = 'md',
  invalid,
  tone,
  id,
  'aria-describedby': describedBy,
  ...props
}: TextAreaProps): ReactElement {
  const wiring = useFieldWiring({ id, describedBy, invalid });

  return (
    <textarea
      {...props}
      {...wiring}
      className={classes('field', SIZE_CLASS[size])}
      data-tone={tone}
      onChange={onChange === undefined ? undefined : (event) => onChange(event.target.value, event)}
      readOnly={props.readOnly ?? onChange === undefined}
      value={value}
    />
  );
}

/** One item of a `Select`. */
export interface SelectOption {
  /** What `onChange` hears when it is chosen. */
  readonly value: string;
  /** Its words in the list. */
  readonly label: string;
  readonly disabled?: boolean;
}

/** A named run of a `Select`'s items. */
export interface SelectOptionGroup {
  /** The run's heading in the list. */
  readonly group: string;
  readonly options: readonly SelectOption[];
}

/** Props for {@link Select}: a select's own, but its class, style, children, and change handler. */
export interface SelectProps
  extends
    FieldLook,
    Omit<
      ComponentPropsWithRef<'select'>,
      | 'className'
      | 'style'
      | 'onChange'
      | 'value'
      | 'defaultValue'
      | 'children'
      | 'multiple'
      | 'size'
    > {
  /** The chosen item's value. */
  readonly value: string;
  /** Its items, plain or in named runs. */
  readonly options: readonly (SelectOption | SelectOptionGroup)[];
  /** Hears the value chosen. */
  readonly onChange: (value: string, event: ChangeEvent<HTMLSelectElement>) => void;
}

const optionElement = (option: SelectOption): ReactElement => (
  <option disabled={option.disabled} key={option.value} value={option.value}>
    {option.label}
  </option>
);

/**
 * A pop-up of items in the shared well with an up and down chevron pair; in
 * a `FieldRow` it is as wide as its longest item. Draws `select.field`.
 */
export function Select({
  value,
  options,
  onChange,
  size = 'md',
  invalid,
  tone,
  id,
  'aria-describedby': describedBy,
  ...props
}: SelectProps): ReactElement {
  const wiring = useFieldWiring({ id, describedBy, invalid });

  return (
    <select
      {...props}
      {...wiring}
      className={classes('field', SIZE_CLASS[size])}
      data-tone={tone}
      onChange={(event) => onChange(event.target.value, event)}
      value={value}
    >
      {options.map((entry) =>
        'group' in entry ? (
          <optgroup key={`group:${entry.group}`} label={entry.group}>
            {entry.options.map(optionElement)}
          </optgroup>
        ) : (
          optionElement(entry)
        )
      )}
    </select>
  );
}

/** Props for {@link FieldBox}: a text field with a glyph before it. */
export interface FieldBoxProps extends Omit<TextFieldProps, 'width' | 'nullValue' | 'tone'> {
  /** The glyph before the text (a magnifier for a filter). */
  readonly glyph: LucideIcon;
}

/**
 * The field's frame round a leading glyph and its text: a filter or search
 * box. Draws `.field-box` round a bare input.
 */
export function FieldBox({
  glyph: Glyph,
  value,
  onChange,
  size = 'md',
  invalid,
  id,
  'aria-describedby': describedBy,
  type = 'text',
  ...props
}: FieldBoxProps): ReactElement {
  const wiring = useFieldWiring({ id, describedBy, invalid });

  // The frame draws the danger outline; the input is what a screen reader
  // hears as invalid.
  return (
    <label aria-invalid={wiring['aria-invalid']} className={classes('field-box', SIZE_CLASS[size])}>
      <Glyph aria-hidden size={ICON_SM} />
      <input
        {...props}
        {...wiring}
        onChange={
          onChange === undefined ? undefined : (event) => onChange(event.target.value, event)
        }
        readOnly={props.readOnly ?? onChange === undefined}
        type={type}
        value={value}
      />
    </label>
  );
}

/** Props for {@link FieldEditor}. */
export interface FieldEditorProps {
  /** The editor the app brings (CodeMirror, Monaco), given its height. */
  readonly children: ReactNode;
  /** Outlines it in the danger tone. */
  readonly invalid?: boolean;
  /** Marks a value changed from its default. */
  readonly changed?: boolean;
  /** Recesses its ground and draws no focus edge: a value to read, not edit. */
  readonly readOnly?: boolean;
}

/**
 * A code editor standing in a form as a field: the field's well, hover,
 * focus edge, and tones on its container, clipped to the field's corners.
 * Draws `.field-editor`.
 */
export function FieldEditor({
  children,
  invalid = false,
  changed = false,
  readOnly = false
}: FieldEditorProps): ReactElement {
  return (
    <div
      aria-invalid={invalid ? true : undefined}
      className={readOnly ? 'field-editor read-only' : 'field-editor'}
      data-tone={changed ? 'accent' : undefined}
    >
      {children}
    </div>
  );
}

/** Props for {@link Radio}. */
export interface RadioProps {
  /** The group it belongs to: every radio of one choice shares it. */
  readonly name: string;
  /** What `onChange` hears when it is chosen. */
  readonly value: string;
  /** Whether it is the chosen one. */
  readonly checked: boolean;
  /** Hears its value when it is chosen. */
  readonly onChange: (value: string) => void;
  /** Its words, beside it; the whole label is its target. */
  readonly label: ReactNode;
  /** A choice whose effect is destructive (`danger`) or needs care (`warning`). */
  readonly tone?: 'danger' | 'warning';
  /** Marks the choice wrong. */
  readonly invalid?: boolean;
  readonly disabled?: boolean;
}

/**
 * One choice of several, a disc in the shared `.check` look with its words
 * in a `field-choice` label. Put a run of them in a `FieldGroup`.
 */
export function Radio({
  name,
  value,
  checked,
  onChange,
  label,
  tone,
  invalid = false,
  disabled = false
}: RadioProps): ReactElement {
  return (
    <label className="field-choice">
      <input
        aria-invalid={invalid ? true : undefined}
        checked={checked}
        className="check"
        data-tone={tone}
        disabled={disabled}
        name={name}
        onChange={() => onChange(value)}
        type="radio"
        value={value}
      />
      {label}
    </label>
  );
}

/** Props for {@link Range}. */
export interface RangeProps {
  /** Where the knob stands. */
  readonly value: number;
  /** Hears the value as the knob moves. */
  readonly onChange: (value: number) => void;
  /** The smallest value; 0 unless given. */
  readonly min?: number;
  /** The largest value; 100 unless given. */
  readonly max?: number;
  /** The step between values; any value unless given. */
  readonly step?: number | 'any';
  /** Its accessible name ("Volume"); in a `FieldRow` the row's label names it. */
  readonly label?: string;
  /** The value as words, read by assistive technology ("1:05 of 3:20"). */
  readonly valueText?: string;
  readonly disabled?: boolean;
}

/**
 * A slider: a trough filled in the accent up to the knob. In a `FieldRow` it
 * takes the row's label and description. Draws `input.range` with
 * `--range-fill` set from the value.
 */
export function Range({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 'any',
  label,
  valueText,
  disabled = false
}: RangeProps): ReactElement {
  const span = max - min;
  const fill = span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 0;
  const wiring = useFieldWiring({});

  return (
    <input
      {...wiring}
      aria-label={label}
      aria-valuetext={valueText}
      className="range"
      disabled={disabled}
      max={max}
      min={min}
      onChange={(event) => onChange(Number(event.target.value))}
      step={step}
      style={{ '--range-fill': `${fill}%` } as CSSProperties}
      type="range"
      value={value}
    />
  );
}

/** Props for {@link Meter}. */
export interface MeterProps {
  /** The measure (a password's strength, a quota used). */
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
  /** Where the low range ends. */
  readonly low: number;
  /** Where the high range starts. */
  readonly high: number;
  /** A value in the range that is good: low, middle, or high. */
  readonly optimum: number;
  /** Its accessible name ("Strength"); in a `FieldRow` the row's label names it. */
  readonly label?: string;
}

/**
 * A measure in a pill trough, filled in the success tone in its optimum
 * range, the warning tone one range away, and the danger tone at the least
 * good. In a `FieldRow` it takes the row's label and description. Draws a
 * themed `<meter>`.
 */
export function Meter({
  value,
  min = 0,
  max = 1,
  low,
  high,
  optimum,
  label
}: MeterProps): ReactElement {
  const { id, 'aria-describedby': describedBy } = useFieldWiring({});

  return (
    <meter
      aria-describedby={describedBy}
      aria-label={label}
      id={id}
      high={high}
      low={low}
      max={max}
      min={min}
      optimum={optimum}
      value={value}
    />
  );
}

/** Props for {@link RestoreDefault}. */
export interface RestoreDefaultProps {
  /** Its words: "Restore Default". */
  readonly children: string;
  /** Sets the setting back to its default. */
  readonly onClick: () => void;
}

/**
 * The dim link-like button beside a setting changed from its default that
 * sets it back. Draws `.text-link.settings-restore`.
 */
export function RestoreDefault({ children, onClick }: RestoreDefaultProps): ReactElement {
  return (
    <button className="text-link settings-restore" onClick={onClick} type="button">
      <span className="text-link-words">{children}</span>
    </button>
  );
}
