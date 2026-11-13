/**
 * The scale tokens drawn at their own size: each type step set in its size,
 * each space as a bar of its length, each corner on a box, each line as a
 * rule that thick, each control height as a box that tall, the focus ring at
 * each of its offsets, each icon size, and the dot and swatch marks. Motion
 * and layers have no still look; every hover on the site eases at
 * `--duration-fast`. Values are read from the
 * page, so the demo shows what `src/tokens.css` holds now.
 */

import { Folder } from 'lucide-react';
import { useLayoutEffect, useState, type ReactNode } from 'react';

import { ICON_LG, ICON_MD, ICON_SM, ICON_XL } from '@bigpixelrocket/uiok/icon';

const TYPE = ['key', 'caption', 'small', 'body', 'heading', 'display'];
const SPACE = ['1', '2', '3', '4', '5', '6', '8', '10', '12', '16'];
const RADIUS = ['xs', 'sm', 'md', 'lg', 'pill'];
const LINES = ['--line', '--line-strong'];
const FOCUS = ['--focus-offset', '--focus-offset-flush', '--focus-offset-inset'];
const MARKS = ['--dot'];
const HEIGHT = [
  '--control-height-xs',
  '--control-height-sm',
  '--row-height-dense',
  '--row-height',
  '--bar-height',
  '--control-height',
  '--bar-height-lg'
];
const ICONS = [
  { name: 'ICON_SM', size: ICON_SM },
  { name: 'ICON_MD', size: ICON_MD },
  { name: 'ICON_LG', size: ICON_LG },
  { name: 'ICON_XL', size: ICON_XL }
];

/** Every token the demo reads a value for. */
const NAMES: readonly string[] = [
  ...TYPE.map((step) => `--font-size-${step}`),
  ...SPACE.map((step) => `--space-${step}`),
  ...RADIUS.map((step) => `--radius-${step}`),
  ...LINES,
  ...HEIGHT,
  ...FOCUS,
  ...MARKS,
  '--space-4'
];

/** Each token's computed value on the root, read once the stylesheet applies. */
function useTokenValues(): Readonly<Record<string, string>> {
  const [values, setValues] = useState<Readonly<Record<string, string>>>({});
  useLayoutEffect(() => {
    const style = getComputedStyle(document.documentElement);
    setValues(Object.fromEntries(NAMES.map((name) => [name, style.getPropertyValue(name).trim()])));
  }, []);
  return values;
}

/** One token's row: its name, its value, and a sample drawn with it. */
function TokenRow({
  name,
  value,
  children
}: {
  readonly name: string;
  readonly value: string | undefined;
  readonly children: ReactNode;
}) {
  return (
    <li className="scale-row">
      <code className="token-name">{name}</code>
      <code className="token-value">{value ?? ''}</code>
      <span className="scale-sample">{children}</span>
    </li>
  );
}

/** The scale tokens page's demo. */
export function TokensDemo() {
  const values = useTokenValues();
  return (
    <div className="demo-stack tokens-demo">
      <section aria-label="Type">
        <h3 className="demo-subhead">Type</h3>
        <ul className="scale-list">
          {TYPE.map((step) => {
            const name = `--font-size-${step}`;
            return (
              <TokenRow key={name} name={name} value={values[name]}>
                <span className="scale-type" style={{ fontSize: `var(${name})` }}>
                  Aa 0:42
                </span>
              </TokenRow>
            );
          })}
        </ul>
      </section>
      <section aria-label="Space">
        <h3 className="demo-subhead">Space</h3>
        <ul className="scale-list">
          {SPACE.map((step) => {
            const name = `--space-${step}`;
            return (
              <TokenRow key={name} name={name} value={values[name]}>
                <span className="scale-space" style={{ width: `var(${name})` }} />
              </TokenRow>
            );
          })}
        </ul>
      </section>
      <section aria-label="Corners">
        <h3 className="demo-subhead">Corners</h3>
        <ul className="scale-list">
          {RADIUS.map((step) => {
            const name = `--radius-${step}`;
            return (
              <TokenRow key={name} name={name} value={values[name]}>
                <span className="scale-radius" style={{ borderRadius: `var(${name})` }} />
              </TokenRow>
            );
          })}
        </ul>
      </section>
      <section aria-label="Lines">
        <h3 className="demo-subhead">Lines</h3>
        <ul className="scale-list">
          {LINES.map((name) => (
            <TokenRow key={name} name={name} value={values[name]}>
              <span className="scale-line" style={{ height: `var(${name})` }} />
            </TokenRow>
          ))}
        </ul>
      </section>
      <section aria-label="Heights">
        <h3 className="demo-subhead">Heights</h3>
        <ul className="scale-list">
          {HEIGHT.map((name) => (
            <TokenRow key={name} name={name} value={values[name]}>
              <span className="scale-height" style={{ height: `var(${name})` }} />
            </TokenRow>
          ))}
        </ul>
      </section>
      <section aria-label="Focus">
        <h3 className="demo-subhead">Focus</h3>
        <ul className="scale-list">
          {FOCUS.map((name) => (
            <TokenRow key={name} name={name} value={values[name]}>
              {/* The ring drawn as the base sheet draws it, at this offset. */}
              <span className="scale-focus" style={{ outlineOffset: `var(${name})` }} />
            </TokenRow>
          ))}
        </ul>
      </section>
      <section aria-label="Icons">
        <h3 className="demo-subhead">Icons</h3>
        <ul className="scale-list">
          {ICONS.map(({ name, size }) => (
            <TokenRow key={name} name={name} value={`${size}px`}>
              <Folder
                absoluteStrokeWidth={size > ICON_LG}
                aria-hidden="true"
                className="scale-icon"
                size={size}
              />
            </TokenRow>
          ))}
        </ul>
      </section>
      <section aria-label="Marks">
        <h3 className="demo-subhead">Marks</h3>
        <ul className="scale-list">
          <TokenRow name="--dot" value={values['--dot']}>
            <span className="scale-dot" />
          </TokenRow>
          <TokenRow name="--space-4 (swatch)" value={values['--space-4']}>
            <span className="scale-swatch" />
          </TokenRow>
        </ul>
      </section>
    </div>
  );
}
