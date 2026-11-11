/**
 * Every form control in each of its states, one labelled grid per control:
 * fields, selects, and textareas at rest, hovered, focused, read-only,
 * invalid, in the warning tone, and disabled; checks, radios, switches, and
 * the slider off, on, mixed, hovered, pressed, toned, and disabled; the
 * three field heights by place; then a working form on one label column.
 *
 * A cell that shows a pointer or focus state carries `data-force` (with
 * `data-force-sel` naming the control inside it): the screenshot harness
 * forces that pseudo-class through the DevTools protocol, so hover, focus,
 * and press can be captured side by side. In a browser the attributes do
 * nothing and the cell shows the control at rest.
 */

import { useState, type CSSProperties, type ReactNode } from 'react';

import { Check } from '@bigpixelrocket/uiok/field';

import { DemoState, DemoStates } from '../DemoStates';

const ITEMS = ['Logs', 'Caches', 'Backups'];

/** A state cell whose control is forced into a pseudo-class for captures. */
function Forced({
  force,
  sel,
  children
}: {
  readonly force: string;
  readonly sel: string;
  readonly children: ReactNode;
}) {
  return (
    <span data-force={force} data-force-sel={sel}>
      {children}
    </span>
  );
}

/** A check, radio, or switch with its words, as a form puts it. */
function Choice({ children }: { readonly children: ReactNode }) {
  return <label className="field-choice">{children}</label>;
}

/** The form controls page's demo. */
export function FieldDemo() {
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set(['Logs']));
  const [port, setPort] = useState('33060');
  const [on, setOn] = useState(true);
  const [volume, setVolume] = useState(40);
  const all = checked.size === ITEMS.length ? true : checked.size === 0 ? false : 'mixed';
  const portProblem = /^\d{1,5}$/.test(port) && Number(port) < 65536 ? '' : 'A port is 0 to 65535.';
  const range = (fill: number) => ({ '--range-fill': `${fill}%` }) as CSSProperties;
  return (
    <div className="demo-stack">
      <DemoStates minCell="180px" title="Text field">
        <DemoState label="Rest">
          <input aria-label="Path" className="field" defaultValue="~/Projects/site" />
        </DemoState>
        <DemoState label="Hover">
          <Forced force="hover" sel="input">
            <input aria-label="Path" className="field" defaultValue="~/Projects/site" />
          </Forced>
        </DemoState>
        <DemoState label="Keyboard focus">
          <Forced force="focus focus-visible" sel="input">
            <input aria-label="Path" className="field" defaultValue="~/Projects/site" />
          </Forced>
        </DemoState>
        <DemoState label="Placeholder">
          <input aria-label="Filter" className="field" placeholder="Filter rows" />
        </DemoState>
        <DemoState label="Read-only">
          <input aria-label="Digest" className="field" defaultValue="sha256:9f2c" readOnly />
        </DemoState>
        <DemoState label="Invalid (aria-invalid)">
          <input aria-invalid aria-label="Port" className="field" defaultValue="abc" />
        </DemoState>
        <DemoState label="Warning (data-tone)">
          <input
            aria-label="Override"
            className="field"
            data-tone="warning"
            defaultValue="utf8mb3"
          />
        </DemoState>
        <DemoState label="Disabled">
          <input aria-label="Locked" className="field" defaultValue="read only here" disabled />
        </DemoState>
      </DemoStates>

      <DemoStates minCell="180px" title="Select">
        <DemoState label="Rest">
          <select aria-label="Format" className="field" defaultValue="csv">
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="sql">SQL statements</option>
          </select>
        </DemoState>
        <DemoState label="Hover">
          <Forced force="hover" sel="select">
            <select aria-label="Format" className="field" defaultValue="json">
              <option value="json">JSON</option>
            </select>
          </Forced>
        </DemoState>
        <DemoState label="Keyboard focus">
          <Forced force="focus focus-visible" sel="select">
            <select aria-label="Format" className="field" defaultValue="json">
              <option value="json">JSON</option>
            </select>
          </Forced>
        </DemoState>
        <DemoState label="Invalid">
          <select aria-invalid aria-label="Charset" className="field" defaultValue="">
            <option value="">Choose one</option>
          </select>
        </DemoState>
        <DemoState label="Disabled">
          <select aria-label="Engine" className="field" defaultValue="innodb" disabled>
            <option value="innodb">InnoDB</option>
          </select>
        </DemoState>
      </DemoStates>

      <DemoStates minCell="220px" title="Textarea">
        <DemoState label="Rest">
          <textarea
            aria-label="Statement"
            className="field"
            defaultValue="SELECT * FROM users LIMIT 50;"
          />
        </DemoState>
        <DemoState label="Keyboard focus">
          <Forced force="focus focus-visible" sel="textarea">
            <textarea aria-label="Statement" className="field" defaultValue="SELECT 1;" />
          </Forced>
        </DemoState>
        <DemoState label="Read-only">
          <textarea aria-label="Log" className="field" defaultValue="Query OK, 0 rows" readOnly />
        </DemoState>
        <DemoState label="Invalid">
          <textarea aria-invalid aria-label="Statement" className="field" defaultValue="SELEC" />
        </DemoState>
        <DemoState label="Disabled">
          <textarea aria-label="Statement" className="field" defaultValue="SELECT 1;" disabled />
        </DemoState>
      </DemoStates>

      <DemoStates minCell="120px" title="Checkbox">
        <DemoState label="Off">
          <Choice>
            <input className="check" type="checkbox" />
            Logs
          </Choice>
        </DemoState>
        <DemoState label="Off, hover">
          <Forced force="hover" sel="input">
            <Choice>
              <input className="check" type="checkbox" />
              Logs
            </Choice>
          </Forced>
        </DemoState>
        <DemoState label="Off, pressed">
          <Forced force="hover active" sel="input">
            <Choice>
              <input className="check" type="checkbox" />
              Logs
            </Choice>
          </Forced>
        </DemoState>
        <DemoState label="Off, focus">
          <Forced force="focus focus-visible" sel="input">
            <Choice>
              <input className="check" type="checkbox" />
              Logs
            </Choice>
          </Forced>
        </DemoState>
        <DemoState label="On">
          <Choice>
            <input className="check" defaultChecked type="checkbox" />
            Logs
          </Choice>
        </DemoState>
        <DemoState label="On, hover">
          <Forced force="hover" sel="input">
            <Choice>
              <input className="check" defaultChecked type="checkbox" />
              Logs
            </Choice>
          </Forced>
        </DemoState>
        <DemoState label="On, pressed">
          <Forced force="hover active" sel="input">
            <Choice>
              <input className="check" defaultChecked type="checkbox" />
              Logs
            </Choice>
          </Forced>
        </DemoState>
        <DemoState label="Mixed">
          <Choice>
            <Check checked="mixed" readOnly />
            Everything
          </Choice>
        </DemoState>
        <DemoState label="Mixed, pressed">
          <Forced force="hover active" sel="input">
            <Choice>
              <Check checked="mixed" readOnly />
              Everything
            </Choice>
          </Forced>
        </DemoState>
        <DemoState label="Invalid">
          <Choice>
            <input aria-invalid className="check" type="checkbox" />I agree
          </Choice>
        </DemoState>
        <DemoState label="Danger, off">
          <Choice>
            <input className="check" data-tone="danger" type="checkbox" />
            Delete data
          </Choice>
        </DemoState>
        <DemoState label="Danger, on">
          <Choice>
            <input className="check" data-tone="danger" defaultChecked type="checkbox" />
            Delete data
          </Choice>
        </DemoState>
        <DemoState label="Warning, on">
          <Choice>
            <input className="check" data-tone="warning" defaultChecked type="checkbox" />
            Overwrite
          </Choice>
        </DemoState>
        <DemoState label="Disabled, off">
          <Choice>
            <input className="check" disabled type="checkbox" />
            Logs
          </Choice>
        </DemoState>
        <DemoState label="Disabled, on">
          <Choice>
            <input className="check" defaultChecked disabled type="checkbox" />
            Logs
          </Choice>
        </DemoState>
      </DemoStates>

      <DemoStates minCell="120px" title="Radio">
        <DemoState label="Off">
          <Choice>
            <input className="check" name="demo-radio-a" type="radio" />
            Quick
          </Choice>
        </DemoState>
        <DemoState label="Off, pressed">
          <Forced force="hover active" sel="input">
            <Choice>
              <input className="check" name="demo-radio-b" type="radio" />
              Quick
            </Choice>
          </Forced>
        </DemoState>
        <DemoState label="On">
          <Choice>
            <input className="check" defaultChecked name="demo-radio-c" type="radio" />
            Custom
          </Choice>
        </DemoState>
        <DemoState label="On, pressed">
          <Forced force="hover active" sel="input">
            <Choice>
              <input className="check" defaultChecked name="demo-radio-d" type="radio" />
              Custom
            </Choice>
          </Forced>
        </DemoState>
        <DemoState label="None chosen, no name">
          <Choice>
            <input className="check" type="radio" />
            Second step
          </Choice>
        </DemoState>
        <DemoState label="Danger, on">
          <Choice>
            <input
              className="check"
              data-tone="danger"
              defaultChecked
              name="demo-radio-e"
              type="radio"
            />
            Move to Trash
          </Choice>
        </DemoState>
        <DemoState label="Disabled, off">
          <Choice>
            <input className="check" disabled name="demo-radio-f" type="radio" />
            Quick
          </Choice>
        </DemoState>
        <DemoState label="Disabled, on">
          <Choice>
            <input className="check" defaultChecked disabled name="demo-radio-g" type="radio" />
            Custom
          </Choice>
        </DemoState>
      </DemoStates>

      <DemoStates minCell="150px" title="Switch">
        <DemoState label="Off">
          <Choice>
            <input className="switch" role="switch" type="checkbox" />
            Start at login
          </Choice>
        </DemoState>
        <DemoState label="Off, hover">
          <Forced force="hover" sel="input">
            <Choice>
              <input className="switch" role="switch" type="checkbox" />
              Start at login
            </Choice>
          </Forced>
        </DemoState>
        <DemoState label="On">
          <Choice>
            <input
              checked={on}
              className="switch"
              onChange={() => setOn(!on)}
              role="switch"
              type="checkbox"
            />
            Event scheduler
          </Choice>
        </DemoState>
        <DemoState label="On, pressed">
          <Forced force="hover active" sel="input">
            <Choice>
              <input className="switch" defaultChecked role="switch" type="checkbox" />
              Event scheduler
            </Choice>
          </Forced>
        </DemoState>
        <DemoState label="Disabled, off">
          <Choice>
            <input className="switch" disabled role="switch" type="checkbox" />
            Start at login
          </Choice>
        </DemoState>
        <DemoState label="Disabled, on">
          <Choice>
            <input className="switch" defaultChecked disabled role="switch" type="checkbox" />
            Event scheduler
          </Choice>
        </DemoState>
      </DemoStates>

      <DemoStates minCell="160px" title="Slider">
        <DemoState label={`Value, ${volume}%`}>
          <input
            aria-label="Volume"
            className="range"
            max={100}
            min={0}
            onChange={(event) => setVolume(Number(event.target.value))}
            style={range(volume)}
            type="range"
            value={volume}
          />
        </DemoState>
        <DemoState label="Empty">
          <input
            aria-label="Seek"
            className="range"
            defaultValue={0}
            style={range(0)}
            type="range"
          />
        </DemoState>
        <DemoState label="Full">
          <input
            aria-label="Seek"
            className="range"
            defaultValue={100}
            style={range(100)}
            type="range"
          />
        </DemoState>
        <DemoState label="Hover">
          <Forced force="hover" sel="input">
            <input
              aria-label="Seek"
              className="range"
              defaultValue={60}
              style={range(60)}
              type="range"
            />
          </Forced>
        </DemoState>
        <DemoState label="Pressed">
          <Forced force="hover active" sel="input">
            <input
              aria-label="Seek"
              className="range"
              defaultValue={60}
              style={range(60)}
              type="range"
            />
          </Forced>
        </DemoState>
        <DemoState label="Disabled">
          <input
            aria-label="Seek"
            className="range"
            defaultValue={60}
            disabled
            style={range(60)}
            type="range"
          />
        </DemoState>
      </DemoStates>

      <DemoStates minCell="200px" title="Heights">
        <DemoState label="Dialog, 28px (.field)">
          <input aria-label="Name" className="field" defaultValue="rename.txt" />
        </DemoState>
        <DemoState label="Page form, 24px (.field-sm)">
          <input aria-label="Name" className="field field-sm" defaultValue="rename.txt" />
        </DemoState>
        <DemoState label="In a row, 20px (.field-xs)">
          <input aria-label="Name" className="field field-xs" defaultValue="rename.txt" />
        </DemoState>
      </DemoStates>

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
        <span className="field-label">Clean up</span>
        <div className="field-value">
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
        </div>
      </div>
    </div>
  );
}
