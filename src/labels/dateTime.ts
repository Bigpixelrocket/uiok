/**
 * The words every date and time picker repeats: its month steps, its time
 * fields, its Today, Now, and Done, and the locale its month and weekday
 * names are written in. What a picker's button picks (its accessible name)
 * and what hovering it says are its own props.
 */
export interface DateTimeLabels {
  /** The BCP 47 locale month and weekday names are written in, through `Intl`: "en-US". */
  readonly locale: string;
  /** The button that shows the month before: "Previous month". */
  readonly previousMonth: string;
  /** The button that shows the month after: "Next month". */
  readonly nextMonth: string;
  /** The hour field: "Hour". */
  readonly hour: string;
  /** The minute field: "Minute". */
  readonly minute: string;
  /** The second field: "Second". */
  readonly second: string;
  /** The fraction field when it holds up to three digits: "Millisecond". */
  readonly millisecond: string;
  /** The fraction field when it holds four to six digits: "Microsecond". */
  readonly microsecond: string;
  /** The button that picks today's date: "Today". */
  readonly today: string;
  /** The button that picks the current time, or today at it: "Now". */
  readonly now: string;
  /** The button that closes the picker: "Done". */
  readonly done: string;
}

/** English picker words and names: the `dateTime` group `UiokProvider` starts from. */
export const DEFAULT_DATE_TIME_LABELS: DateTimeLabels = {
  locale: 'en-US',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  hour: 'Hour',
  minute: 'Minute',
  second: 'Second',
  millisecond: 'Millisecond',
  microsecond: 'Microsecond',
  today: 'Today',
  now: 'Now',
  done: 'Done'
};
