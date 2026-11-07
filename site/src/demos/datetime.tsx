/** Date, time, and date-time fields with the picker beside each; any value can still be typed. */

import { useState } from 'react';

import { DateTimePicker, formatPicker } from '@bigpixelrocket/uiok/datetime';

/** The date-time picker page's demo. */
export function DateTimeDemo() {
  const [due, setDue] = useState('2026-11-20');
  const [alarm, setAlarm] = useState('07:30:00');
  const [start, setStart] = useState('2026-11-07 09:15:00.250');
  return (
    <div className="demo-stack datetime-demo">
      <div className="demo-row">
        <span className="demo-label">Due</span>
        <input
          aria-label="Due"
          className="demo-input"
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
          className="demo-input"
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
          className="demo-input wide"
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
    </div>
  );
}
