/**
 * Date, time, and date-time fields with the picker beside each; any value
 * can still be typed. Under them, a time to the microsecond, a picker that
 * is disabled, a week that starts on Sunday, a value the picker cannot read
 * (it opens on today), and the regular size beside a dialog's 28px field.
 */

import { useState } from 'react';

import { DateTimePicker, formatPicker } from '@bigpixelrocket/uiok/datetime';

/** The date-time picker page's demo. */
export function DateTimeDemo() {
  const [due, setDue] = useState('2026-11-20');
  const [alarm, setAlarm] = useState('07:30:00');
  const [start, setStart] = useState('2026-11-07 09:15:00.250');
  const [stamp, setStamp] = useState('2026-11-07 09:15:00.250000');
  const [run, setRun] = useState('2026-11-21 06:00:00');
  const [ships, setShips] = useState('2026-11-15');
  const [since, setSince] = useState('now');
  return (
    <div className="demo-stack datetime-demo">
      <div className="demo-row">
        <span className="demo-label">Due</span>
        <input
          aria-label="Due"
          className="field field-sm demo-input"
          onChange={(event) => setDue(event.target.value)}
          spellCheck={false}
          value={due}
        />
        <DateTimePicker kind="date" label="Pick the due date" onChange={setDue} value={due} />
      </div>
      <div className="demo-row">
        <span className="demo-label">Alarm</span>
        <input
          aria-label="Alarm"
          className="field field-sm demo-input"
          onChange={(event) => setAlarm(event.target.value)}
          spellCheck={false}
          value={alarm}
        />
        <DateTimePicker kind="time" label="Pick the alarm time" onChange={setAlarm} value={alarm} />
      </div>
      <div className="demo-row">
        <span className="demo-label">Start</span>
        <input
          aria-label="Start"
          className="field field-sm demo-input wide"
          onChange={(event) => setStart(event.target.value)}
          spellCheck={false}
          value={start}
        />
        <DateTimePicker
          format={(kind, parts, fraction) => formatPicker(kind, parts, fraction, ' ')}
          fraction={3}
          hint="Values the picker cannot pick can be typed into the field."
          kind="datetime"
          label="Pick the start"
          onChange={setStart}
          value={start}
        />
      </div>
      <h3 className="demo-subhead">Microseconds and disabled</h3>
      <div className="demo-row">
        <span className="demo-label">Logged</span>
        <input
          aria-label="Logged"
          className="field field-sm demo-input wide"
          onChange={(event) => setStamp(event.target.value)}
          spellCheck={false}
          value={stamp}
        />
        <DateTimePicker
          format={(kind, parts, fraction) => formatPicker(kind, parts, fraction, ' ')}
          fraction={6}
          kind="datetime"
          label="Pick the log time"
          onChange={setStamp}
          value={stamp}
        />
      </div>
      <div className="demo-row">
        <span className="demo-label">Locked</span>
        <input
          aria-label="Locked"
          className="field field-sm demo-input"
          disabled
          readOnly
          value="2026-11-01"
        />
        <DateTimePicker
          disabled
          kind="date"
          label="Pick the locked date"
          onChange={() => undefined}
          value="2026-11-01"
        />
      </div>
      <h3 className="demo-subhead">Week start and typed values</h3>
      <div className="demo-row">
        <span className="demo-label">Ships</span>
        <input
          aria-label="Ships"
          className="field field-sm demo-input"
          onChange={(event) => setShips(event.target.value)}
          spellCheck={false}
          value={ships}
        />
        <DateTimePicker
          firstDay={7}
          kind="date"
          label="Pick the ship date, weeks from Sunday"
          onChange={setShips}
          value={ships}
        />
      </div>
      <div className="demo-row">
        <span className="demo-label">Since</span>
        <input
          aria-label="Since"
          className="field field-sm demo-input"
          onChange={(event) => setSince(event.target.value)}
          spellCheck={false}
          value={since}
        />
        <DateTimePicker
          hint="A keyword stays as typed; the picker opens on today."
          kind="date"
          label="Pick the start date"
          onChange={setSince}
          value={since}
        />
      </div>
      <h3 className="demo-subhead">In a dialog</h3>
      <div className="demo-row">
        <span className="demo-label">Runs at</span>
        <input
          aria-label="Runs at"
          className="field demo-input wide"
          onChange={(event) => setRun(event.target.value)}
          spellCheck={false}
          value={run}
        />
        <DateTimePicker
          format={(kind, parts, fraction) => formatPicker(kind, parts, fraction, ' ')}
          kind="datetime"
          label="Pick the run time"
          onChange={setRun}
          size="regular"
          value={run}
        />
      </div>
    </div>
  );
}
