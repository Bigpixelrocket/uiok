/**
 * Every form control in each of its states: fields at the three heights,
 * a select, a number, a textarea; checks, radios, and switches on, off,
 * and mixed; a form on one label column with its notes and a problem.
 */

import { useState, type CSSProperties } from 'react';

import { Check } from '@bigpixelrocket/uiok/field';

const ITEMS = ['Logs', 'Caches', 'Backups'];

/** The form controls page's demo. */
export function FieldDemo() {
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set(['Logs']));
  const [port, setPort] = useState('33060');
  const [on, setOn] = useState(true);
  const [volume, setVolume] = useState(40);
  const all = checked.size === ITEMS.length ? true : checked.size === 0 ? false : 'mixed';
  const portProblem = /^\d{1,5}$/.test(port) && Number(port) < 65536 ? '' : 'A port is 0 to 65535.';
  return (
    <div className="demo-stack">
      <h3 className="demo-subhead">Fields</h3>
      <div className="demo-row">
        <input aria-label="Regular" className="field" defaultValue="~/Projects/site" />
        <input aria-label="Small" className="field field-sm" placeholder="Filter rows" />
        <input aria-label="Inline" className="field field-xs" defaultValue="rename.txt" />
      </div>
      <div className="demo-row">
        <select aria-label="Format" className="field" defaultValue="csv">
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="sql">SQL statements</option>
        </select>
        <select aria-label="Page" className="field field-xs" defaultValue="4">
          <option value="4">4 of 12</option>
          <option value="5">5 of 12</option>
        </select>
        <input
          aria-label="Disabled"
          className="field field-sm"
          defaultValue="read only here"
          disabled
        />
        <input
          aria-label="Read-only"
          className="field field-sm"
          defaultValue="sha256:9f2c"
          readOnly
        />
      </div>
      <textarea
        aria-label="Statement"
        className="field"
        defaultValue="SELECT * FROM users LIMIT 50;"
      />

      <h3 className="demo-subhead">Choices</h3>
      <div className="demo-row">
        <label className="field-choice">
          <Check
            checked={all}
            onChange={() => setChecked(all === true ? new Set() : new Set(ITEMS))}
          />
          Everything
        </label>
        {ITEMS.map((item) => (
          <label className="field-choice" key={item}>
            <input
              checked={checked.has(item)}
              className="check"
              onChange={() => {
                const next = new Set(checked);
                if (!next.delete(item)) next.add(item);
                setChecked(next);
              }}
              type="checkbox"
            />
            {item}
          </label>
        ))}
        <label className="field-choice">
          <input className="check" disabled type="checkbox" />
          Disabled
        </label>
      </div>
      <fieldset className="field-group">
        <legend>Export</legend>
        <div className="demo-row">
          <label className="field-choice">
            <input className="check" defaultChecked name="export" type="radio" />
            Quick
          </label>
          <label className="field-choice">
            <input className="check" name="export" type="radio" />
            Custom
          </label>
        </div>
      </fieldset>
      <div className="demo-row">
        <label className="field-choice">
          <input
            checked={on}
            className="switch"
            onChange={() => setOn(!on)}
            role="switch"
            type="checkbox"
          />
          Event scheduler
        </label>
        <label className="field-choice">
          <input className="switch" disabled role="switch" type="checkbox" />
          Disabled
        </label>
      </div>

      <div className="demo-row">
        <input
          aria-label="Volume"
          className="range"
          max={100}
          min={0}
          onChange={(event) => setVolume(Number(event.target.value))}
          style={{ '--range-fill': `${volume}%` } as CSSProperties}
          type="range"
          value={volume}
        />
      </div>

      <h3 className="demo-subhead">A form on one label column</h3>
      <div className="field-grid">
        <label className="field-label" htmlFor="demo-host">
          Host
        </label>
        <div className="field-value">
          <input className="field field-sm" defaultValue="db.internal" id="demo-host" />
          <p className="field-note">A name or an address this computer can reach.</p>
        </div>
        <label className="field-label" htmlFor="demo-port">
          Port
        </label>
        <div className="field-value">
          <input
            aria-describedby="demo-port-problem"
            aria-invalid={portProblem !== ''}
            className="field field-sm"
            id="demo-port"
            inputMode="numeric"
            onChange={(event) => setPort(event.target.value)}
            value={port}
          />
          {portProblem === '' ? null : (
            <p className="field-problem" id="demo-port-problem">
              {portProblem}
            </p>
          )}
        </div>
        <span className="field-label">Timeout</span>
        <div className="field-value">
          <div className="field-option">
            <input
              aria-label="Seconds"
              className="field field-sm"
              defaultValue={30}
              type="number"
            />
            <label className="field-choice">
              <input className="check" type="checkbox" />
              Retry once
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
