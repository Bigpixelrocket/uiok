// @vitest-environment node

/**
 * The scale guard: where `src/tokens.css` names a step, a stylesheet uses the
 * token, not the number, so a size, corner, timing, or layer is decided once
 * and the same relationship is drawn the same way in every component
 * (`docs/tokens.md`).
 *
 * It reads every hand-written stylesheet (`src/**\/*.css` but the generated
 * theme sheet, and the docs site's `site/src/site.css`) and fails on a raw
 * value in these properties:
 *
 * - `font-size`, and the size and weight in a `font` shorthand: a type token
 *   (or the site's own prose tokens), `inherit`, or a size relative to the
 *   running text (`em`, `%`);
 * - `font-weight`: a weight token or `inherit`;
 * - `line-height`, and the line height in a `font` shorthand: a line-height
 *   token, a row height token, `1` for a single-line control, or `inherit`;
 * - `border-radius` and its longhands: a radius token, `0`, `inherit`, or a
 *   `calc()` over a radius token (a nested corner);
 * - `z-index`: a layer token, `auto`, or `inherit`;
 * - durations and easings in `transition` and `animation`: a motion token,
 *   `0s`, `linear`, or `steps()`;
 * - `gap`, `padding`, and `margin` (and their longhands, logical ones such
 *   as `padding-inline-start` included): a token, `0`, a 1px line or nudge,
 *   `auto`, `inherit`, a length in `ch` (listing columns are measured in
 *   characters), a percentage, or a `calc()` over tokens;
 * - border and outline widths (`border`, its side and logical longhands,
 *   `border-width`, `outline`, `outline-width`, `outline-offset`): no raw
 *   length; `--line`, `--line-strong`, a focus token, `0`, or `none`;
 * - `height`, `min-height`, `max-height` and their logical forms: a height,
 *   icon, or space token, a percentage or viewport length, a keyword, a
 *   1px line, or glyph geometry under 12px (a dot, a tick, a bar's
 *   thickness, below every scale step); 12px and up is a token or an
 *   exception;
 * - `opacity`: `0`, `1`, `inherit`, or a token;
 * - `box-shadow`: no blur radius outside a shadow token (an elevation is a
 *   `--shadow-*` token; a crisp ring or edge is drawn with no blur);
 * - any property: no `color-mix(` outside a custom property definition (a
 *   tint is a theme token: a wash, a line, a state ground).
 *
 * Custom properties are not checked: `tokens.css` and the site define the
 * scales there, and a component's own hook reads a token. Nor are widths,
 * insets, or letter-spacing: their values are often geometry of one
 * component (a 22px icon action, a 12px key box) that no scale step names,
 * and a check there would mostly raise false alarms. A literal that stays
 * literal is listed in `EXCEPTIONS` with its reason; every entry must still
 * match a declaration, so none outlives its reason.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Every hand-written stylesheet by its path from the repository root. */
const SHEETS: readonly string[] = [
  ...readdirSync(join(ROOT, 'src'), { recursive: true, encoding: 'utf8' })
    .map((path) => `src/${path.split('\\').join('/')}`)
    .filter((file) => file.endsWith('.css') && file !== 'src/themes/themes.generated.css'),
  'site/src/site.css'
].sort();

interface Declaration {
  readonly file: string;
  readonly line: number;
  readonly selector: string;
  readonly property: string;
  readonly value: string;
}

/** A literal that stays literal: the file, the property, and the value it holds, with why. */
interface Exception {
  readonly file: string;
  readonly property: string;
  readonly value: RegExp;
  readonly reason: string;
}

const EXCEPTIONS: readonly Exception[] = [
  {
    file: 'src/keychord/keychord.css',
    property: 'font',
    value: /\/\s*12px /,
    reason: "A key cap's letter sits on the key's own 12px box, glyph geometry, not a text line."
  },
  {
    file: 'src/listing/listing.css',
    property: 'font',
    value: /\/\s*19px /,
    reason: "A terminal well sets plain text on the terminal engine's 19px cell height."
  },
  {
    file: 'src/terminal/terminal.css',
    property: 'font',
    value: /\/\s*19px /,
    reason: "The failure text sits where the engine's first line would, on its 19px cell height."
  },
  {
    file: 'src/activity/activity.css',
    property: 'animation',
    value: /0\.9s/,
    reason: "The stripes' loop is timed against their 16.97px period: a speed, not a change."
  },
  {
    file: 'src/palette/palette.css',
    property: 'padding',
    value: /104px/,
    reason: 'A palette hangs a fixed distance below the window top, a placement, not a space.'
  },
  {
    file: 'site/src/site.css',
    property: 'padding',
    value: /40px 64px|48px/,
    reason: "The docs page's outer margins are a reading layout's, wider than the interface scale."
  },
  ...(['height', 'min-height', 'max-height'] as const).map((property) => ({
    file: 'site/src/site.css',
    property,
    value: /^\d+px$/,
    reason:
      "A docs page's demo frame (and the brand mark) sizes a sample for reading, not a control."
  })),
  {
    file: 'src/charts/charts.css',
    property: 'min-height',
    value: /^1[28]0px$/,
    reason: 'A plot keeps room to draw its axes and an empty message: plot geometry, not a control.'
  },
  {
    file: 'src/charts/charts.css',
    property: 'height',
    value: /^380px$/,
    reason: "A scatter plot's drawing height, plot geometry."
  },
  {
    file: 'src/field/field.css',
    property: 'height',
    value: /^12px$/,
    reason: "The slider's knob sits on its 4px trough: glyph geometry, not an icon."
  },
  {
    file: 'src/keychord/keychord.css',
    property: 'height',
    value: /^1[28]px$/,
    reason:
      'A key cap is a glyph box (12px for a letter key, 18px for a cap in a strip), no scale step.'
  },
  {
    file: 'src/legend/legend.css',
    property: 'height',
    value: /^18px$/,
    reason: "A dock key cap matches the strip's 18px key cap, glyph geometry."
  },
  {
    file: 'src/shell/shell.css',
    property: 'height',
    value: /^min\(620px, 100%\)$/,
    reason:
      "The Settings dialog's fixed frame height, a layout size, not a control; fixed so switching pages never moves the frame."
  },
  {
    file: 'src/styles.css',
    property: 'opacity',
    value: /^0\.35$/,
    reason: "The shared pulse's low point is a keyframe of the motion, not a state's opacity."
  }
];

/** Blanks what matches `pattern`, keeping every offset and line break in place. */
function blank(source: string, pattern: RegExp): string {
  return source.replace(pattern, (match) => match.replace(/[^\n]/g, ' '));
}

/** Every declaration of a stylesheet, with its line and the selector of the block it sits in. */
function declarations(file: string, source: string): Declaration[] {
  const text = blank(source, /\/\*[\s\S]*?\*\//g);
  const lineAt = (offset: number) => text.slice(0, offset).split('\n').length;
  const blocks: string[] = [];
  const found: Declaration[] = [];
  let start = 0;

  const declaration = (end: number) => {
    const chunk = text.slice(start, end);
    const colon = chunk.indexOf(':');
    if (colon < 0 || blocks.length === 0) return;
    const property = chunk.slice(0, colon).trim();
    if (!/^[a-z-]+$/.test(property) || property.startsWith('--')) return;
    found.push({
      file,
      line: lineAt(start + chunk.search(/\S/)),
      selector: blocks.at(-1) ?? '',
      property,
      value: chunk
        .slice(colon + 1)
        .trim()
        .replace(/\s+/g, ' ')
    });
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '{') {
      blocks.push(text.slice(start, index).trim().replace(/\s+/g, ' '));
      start = index + 1;
    } else if (character === ';') {
      declaration(index);
      start = index + 1;
    } else if (character === '}') {
      declaration(index);
      blocks.pop();
      start = index + 1;
    }
  }
  return found;
}

/**
 * A value with every `var(…)` taken out, so a token's name never reads as a
 * literal; a fallback that is itself a token or 0 goes with it
 * (`var(--hook, var(--space-6))` is a token, `var(--hook, 7px)` is not).
 */
function withoutVars(value: string): string {
  let plain = value;
  for (;;) {
    const next = plain.replace(/var\(--[\w-]+(?:,\s*(?:TOKEN|0))?\)/g, 'TOKEN');
    if (next === plain) return next;
    plain = next;
  }
}

/** A length with a unit that a scale would name. */
const LENGTH = /(?<![\w.-])-?\d*\.?\d+(?:px|rem|pt)\b/;

/**
 * The value with each `calc()` over tokens folded into one `TOKEN`, when no
 * length inside it but a 1px line is raw (`calc(var(--radius-lg) - 1px)`, a
 * nested corner); a `calc()` holding another raw length stays as written.
 */
function foldCalc(plain: string): string {
  return plain.replace(/calc\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)/g, (calc) =>
    calc.includes('TOKEN') && !LENGTH.test(calc.replace(/(?<![\w.-])-?1px\b/g, '')) ? 'TOKEN' : calc
  );
}

/** Whether every space-separated part of a value matches `part`, tokens and token calc() included. */
const everyPart = (value: string, part: RegExp): boolean =>
  foldCalc(withoutVars(value))
    .split(' ')
    .every((piece) => piece === 'TOKEN' || part.test(piece));

/** The checks by property: each returns what is wrong with a value, or undefined. */
const RULES: readonly { property: RegExp; problem: (value: string) => string | undefined }[] = [
  {
    property: /^font-size$/,
    problem: (value) =>
      everyPart(value, /^(?:inherit|\d*\.?\d+(?:em|%))$/)
        ? undefined
        : 'a font size that is not a type token'
  },
  {
    property: /^font-weight$/,
    problem: (value) => (everyPart(value, /^inherit$/) ? undefined : 'a weight that is not a token')
  },
  {
    property: /^line-height$/,
    problem: (value) =>
      everyPart(value, /^(?:inherit|1)$/) ? undefined : 'a line height that is not a token'
  },
  {
    // `[weight] size[/line-height] family`: the family is a token or a name.
    // A formatter may space the slash (`size / line-height`); read it as one part.
    property: /^font$/,
    problem: (value) => {
      const plain = withoutVars(value).replace(/\s*\/\s*/g, '/');
      if (plain === 'inherit') return undefined;
      if (/^(?:\d+|bold|bolder|lighter)(?=\s)/.test(plain)) return 'a weight in a font shorthand';
      const [size = '', lineHeight] = (
        plain.split(' ').find((part) => part.includes('/')) ??
        plain.split(' ').find((part) => /^(?:TOKEN|[\d.])/.test(part)) ??
        ''
      ).split('/');
      if (LENGTH.test(size)) return 'a size in a font shorthand';
      if (lineHeight !== undefined && lineHeight !== 'TOKEN' && lineHeight !== '1') {
        return 'a line height in a font shorthand';
      }
      return undefined;
    }
  },
  {
    property: /^border(?:-[a-z]+)?-radius$/,
    problem: (value) =>
      everyPart(value, /^(?:0|inherit)$/) ? undefined : 'a radius that is not a token'
  },
  {
    property: /^z-index$/,
    problem: (value) =>
      everyPart(value, /^(?:auto|inherit)$/) ? undefined : 'a layer that is not a token'
  },
  {
    property: /^(?:transition|animation)(?:-duration|-timing-function)?$/,
    problem: (value) => {
      const plain = withoutVars(value);
      if (/(?<![\w.-])(?:0*[1-9]\d*|\d*\.\d+)m?s\b/.test(plain))
        return 'a duration that is not a token';
      if (/(?<![\w-])(?:ease(?:-in|-out|-in-out)?|cubic-bezier)(?![\w-])/.test(plain)) {
        return 'an easing that is not a token';
      }
      return undefined;
    }
  },
  {
    property: /^(?:gap|row-gap|column-gap|padding(?:-[a-z]+){0,2}|margin(?:-[a-z]+){0,2})$/,
    problem: (value) =>
      everyPart(value, /^(?:0|-?1px|auto|inherit|-?\d*\.?\d+(?:ch|%))$/)
        ? undefined
        : 'a space that is not a token'
  },
  {
    property:
      /^(?:border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-width)?|outline(?:-width|-offset)?)$/,
    problem: (value) =>
      LENGTH.test(foldCalc(withoutVars(value)).replace(/calc\([^)]*\)/g, 'TOKEN'))
        ? 'a line width that is not a token'
        : undefined
  },
  {
    property: /^(?:min-|max-)?(?:height|block-size)$/,
    problem: (value) =>
      everyPart(
        value,
        /^(?:0|auto|none|inherit|fit-content|min-content|max-content|1px|(?:\d|1[01]|\d\.\d+|1[01]\.\d+)px|\d*\.?\d+(?:%|vh|dvh|svh|lh|em))$/
      )
        ? undefined
        : 'a height that is not a token'
  },
  {
    property: /^opacity$/,
    problem: (value) =>
      everyPart(value, /^(?:0|1|inherit)$/) ? undefined : 'an opacity that is not a token'
  },
  {
    property: /^box-shadow$/,
    problem: (value) =>
      withoutVars(value)
        .split(/,(?![^(]*\))/)
        .some((shadow) => {
          const lengths = shadow
            .trim()
            .split(/\s+/)
            .filter((part) => /^-?\d*\.?\d+(?:px|rem|em)?$/.test(part));
          return lengths.length >= 3 && !/^-?0*\.?0+(?:px|rem|em)?$/.test(lengths[2] ?? '0');
        })
        ? 'a blurred shadow that is not a shadow token'
        : undefined
  },
  {
    property: /^[a-z-]+$/,
    problem: (value) =>
      value.includes('color-mix(') ? 'a color-mix() outside a custom property' : undefined
  }
];

/** Every declaration that breaks a rule and no exception covers, and every exception left unused. */
function audit(): { findings: string[]; unused: string[] } {
  const used = new Set<Exception>();
  const findings: string[] = [];
  for (const file of SHEETS) {
    for (const declaration of declarations(file, readFileSync(join(ROOT, file), 'utf8'))) {
      for (const rule of RULES) {
        if (!rule.property.test(declaration.property)) continue;
        const problem = rule.problem(declaration.value);
        if (problem === undefined) continue;
        const exception = EXCEPTIONS.find(
          (entry) =>
            entry.file === declaration.file &&
            entry.property === declaration.property &&
            entry.value.test(declaration.value)
        );
        if (exception !== undefined) {
          used.add(exception);
          continue;
        }
        findings.push(
          `${file}:${declaration.line} ${declaration.selector} { ${declaration.property}: ${declaration.value} }: ${problem}`
        );
      }
    }
  }
  return {
    findings,
    unused: EXCEPTIONS.filter((entry) => !used.has(entry)).map(
      (entry) => `${entry.file} ${entry.property} ${entry.value}`
    )
  };
}

describe('scale tokens in the stylesheets', () => {
  const { findings, unused } = audit();

  it('reads every hand-written stylesheet', () => {
    expect(SHEETS).toContain('src/tokens.css');
    expect(SHEETS).toContain('site/src/site.css');
  });

  it('writes no raw size, weight, line height, radius, layer, timing, or space where a token exists', () => {
    expect(findings).toEqual([]);
  });

  it('keeps no exception that no longer matches a declaration', () => {
    expect(unused).toEqual([]);
  });

  it('catches a raw value in each guarded property', () => {
    const bad = [
      ['font-size', '11.5px'],
      ['font-weight', '650'],
      ['line-height', '18px'],
      ['font', '600 12px var(--font-ui)'],
      ['border-radius', '5px'],
      ['z-index', '40'],
      ['transition', 'color 150ms ease'],
      ['animation', 'spin var(--duration-spin) ease-in-out infinite'],
      ['gap', '7px'],
      ['padding', 'calc(var(--space-2) + 3px)'],
      ['padding-inline-start', '18px'],
      ['margin-block-end', '3px'],
      ['border', '1px solid var(--border)'],
      ['border-inline-start', '2px solid var(--accent)'],
      ['outline', '2px solid var(--accent)'],
      ['outline-offset', '3px'],
      ['height', '22px'],
      ['min-height', '26px'],
      ['opacity', '0.35'],
      ['box-shadow', '0 0 6px var(--accent)'],
      ['background', 'color-mix(in srgb, var(--accent) 14%, transparent)']
    ] as const;
    for (const [property, value] of bad) {
      expect(
        RULES.filter((candidate) => candidate.property.test(property)).some(
          (candidate) => candidate.problem(value) !== undefined
        ),
        `${property}: ${value}`
      ).toBe(true);
    }
  });

  it('passes a token, a crisp ring, and glyph geometry', () => {
    const good = [
      ['border', 'var(--line) solid var(--border)'],
      ['border-bottom', '0'],
      ['outline', 'none'],
      ['outline-offset', 'var(--focus-offset-inset)'],
      ['height', 'var(--control-height-sm)'],
      ['height', '6px'],
      ['max-height', '100%'],
      ['opacity', 'var(--disabled-opacity)'],
      ['box-shadow', 'var(--shadow-pressed), inset 0 0 0 var(--line) var(--border-strong)'],
      ['box-shadow', 'inset 0 1px 0 var(--well-shade)'],
      ['background', 'var(--accent-wash)']
    ] as const;
    for (const [property, value] of good) {
      expect(
        RULES.filter((candidate) => candidate.property.test(property)).map((candidate) =>
          candidate.problem(value)
        ),
        `${property}: ${value}`
      ).toEqual(
        RULES.filter((candidate) => candidate.property.test(property)).map(() => undefined)
      );
    }
  });
});
