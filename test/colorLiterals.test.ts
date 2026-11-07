// @vitest-environment node

/**
 * The colour guard: the library paints every colour through a token, so a
 * theme can change any of them by redefining tokens alone.
 *
 * Colour literals (hex, the colour functions, named colours used as colours,
 * and a script's `{ r, g, b }` objects of numbers) may appear only as values
 * of the custom properties in the token blocks of
 * `src/themes/themes.generated.css`, which the theme catalog writes: `:root`,
 * a theme's `:root[data-light-theme]` or `:root[data-dark-theme]` block, and a
 * theme's preview scope (`[data-theme-preview]`), each outside any query or
 * under an appearance's; and in the palette data modules (`THEME_SOURCES`:
 * the catalog's, which hold the palettes and the rules over them, and the
 * terminal's fallback colours). A rule under `@media print` draws on
 * paper, which no theme colours, so its literals stay free. Anywhere else a
 * literal must sit on a line `ALLOWED` names with the reason it stays
 * literal. `transparent` and `currentColor` are no colour of a theme's and
 * stay free.
 *
 * Nor does a component import the catalog's colours to paint with: a module
 * outside `src/themes/` may name themes through the theme list (`ids`) and
 * wear them through the attribute helpers (`attributes`), but import nothing
 * else of `src/themes/`, unless `PALETTE_IMPORTERS` names it with its reason.
 * Tests may.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Every scanned source by its path from the repository root: the stylesheets and scripts under `src/`, not the tests. */
const SOURCES: Readonly<Record<string, string>> = Object.fromEntries(
  readdirSync(join(ROOT, 'src'), { recursive: true, encoding: 'utf8' })
    .map((path) => `src/${path.split('\\').join('/')}`)
    .filter((file) => /\.(?:css|ts|tsx)$/.test(file) && !/\.test\.tsx?$/.test(file))
    .sort()
    .map((file) => [file, readFileSync(join(ROOT, file), 'utf8')])
);

/**
 * The modules that hold palette data, skipped by the literal scan: the
 * catalog's, which hold the palettes and the rules that derive tokens from
 * them, and the terminal's fallback colours. A canvas engine must have
 * concrete colours before it draws, so the terminal keeps one Catppuccin
 * Mocha theme and the engine's own defaults for a page whose stylesheet
 * sets no `--terminal-*` tokens; every themed colour still comes from them.
 */
const THEME_SOURCES = new Set([
  'src/themes/catalog.ts',
  'src/themes/color.ts',
  'src/themes/tokens.ts',
  'src/terminal/ghostty/fallbackColors.ts'
]);

/**
 * The modules outside `src/themes/` that may import a theme's colours, each
 * with its reason. Every entry must still import one, so none outlives its
 * reason.
 */
const PALETTE_IMPORTERS: readonly { file: string; reason: string }[] = [
  {
    file: 'src/index.ts',
    reason: 'The public API re-exports the catalog, so an app can generate a stylesheet of its own.'
  }
];

/** The modules of `src/themes/` any module may import: the theme list and the attribute helpers, which hold no colours. */
const COLOURLESS_THEME_MODULES = new Set(['ids', 'attributes']);

/** Each module of `src/themes/` the module at `file` imports, or re-exports, that holds colours. */
function paletteImports(file: string, source: string): string[] {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const specifiers: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] !== undefined &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return specifiers.filter((specifier) => {
    if (!specifier.startsWith('.')) return false;
    const target = normalize(join(dirname(file), specifier))
      .split('\\')
      .join('/');
    const module = /^src\/themes\/([\w.-]+?)(?:\.js|\.ts)?$/.exec(target)?.[1];
    return module !== undefined && !COLOURLESS_THEME_MODULES.has(module);
  });
}

/** The stylesheet whose token blocks hold the palette, and those blocks' selectors. */
const TOKEN_SHEET = 'src/themes/themes.generated.css';
const TOKEN_SELECTOR =
  /^(?::root(?:\[data-(?:light|dark)-theme='[a-z0-9-]+'\])?|\[data-theme-preview='[a-z0-9-]+'\])$/;
/**
 * The print query, whose rules draw on paper and keep their literals. Only
 * the bare query: a list that also names another medium (`print, screen`)
 * draws on screen too.
 */
const PRINT_CONTEXT = '@media print';
/** The only at-rules a token block may sit in: an appearance's. */
const TOKEN_CONTEXTS = new Set([
  '@media (prefers-color-scheme: light)',
  '@media (prefers-color-scheme: dark)'
]);

/**
 * The literals that stay literal, each a line pattern in one file. Every
 * entry must still match a literal, so none outlives its reason.
 */
const ALLOWED: readonly { file: string; line: RegExp; reason: string }[] = [];

/** CSS's named colours and system colours; `transparent` and `currentColor` are left out on purpose. */
const NAMED_COLORS = new Set(
  (
    'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet ' +
    'brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan ' +
    'darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta ' +
    'darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue ' +
    'darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey ' +
    'dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray ' +
    'green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush ' +
    'lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray ' +
    'lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray ' +
    'lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon ' +
    'mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue ' +
    'mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin ' +
    'navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen ' +
    'paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple ' +
    'rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna ' +
    'silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle ' +
    'tomato turquoise violet wheat white whitesmoke yellow yellowgreen ' +
    'accentcolor accentcolortext activetext buttonborder buttonface buttontext canvas canvastext ' +
    'field fieldtext graytext highlight highlighttext linktext mark marktext selecteditem ' +
    'selecteditemtext visitedtext'
  ).split(' ')
);

/** A hex colour: 3, 4, 6, or 8 digits after `#`. */
const HEX = /(?<![\w&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/i;
/** A colour function in a stylesheet, whatever its arguments. */
const CSS_FUNCTION = /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
/** A colour function in a script string with literal channels (not a template filling them in). */
const SCRIPT_FUNCTION =
  /(?<![\w-])(?:(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*(?:[\d.+-]|none)|color\(\s*(?:srgb|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz))/i;
/** Identifiers in a CSS value, a custom property's name excluded. */
const IDENTIFIER = /(?<![\w-])[a-z][\w-]*/gi;

/** Object keys, JSX attributes, and canvas properties whose string values are colours. */
const COLOR_KEY =
  /^(?:fill|stroke|stopColor|floodColor|lightingColor|fillStyle|strokeStyle|shadowColor)$|color|background|border|outline|shadow|caret|decoration/i;

interface Finding {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

/** Blanks what matches `pattern`, keeping every offset and line break in place. */
function blank(source: string, pattern: RegExp): string {
  return source.replace(pattern, (match) => match.replace(/[^\n]/g, ' '));
}

const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;
const CSS_STRING = /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g;

/** Whether `value` names a colour by keyword. */
function hasNamedColor(value: string): boolean {
  return [...value.matchAll(IDENTIFIER)].some((match) => NAMED_COLORS.has(match[0].toLowerCase()));
}

/** Whether a CSS value holds a colour literal of any form. */
function cssColorLiteral(value: string): boolean {
  return HEX.test(value) || CSS_FUNCTION.test(value) || hasNamedColor(value);
}

/** The lines of a stylesheet's declarations that hold a colour literal outside the token blocks. */
function cssFindings(file: string, source: string): number[] {
  // Selectors keep their quotes (`[data-theme-preview='nord']`); values lose
  // them, so a string such as `content: 'red'` is never read as a colour.
  const selectors = blank(source, CSS_COMMENT);
  const text = blank(selectors, CSS_STRING);
  const lineAt = (offset: number) => text.slice(0, offset).split('\n').length;
  const blocks: string[] = [];
  const lines: number[] = [];
  let start = 0;

  const declaration = (end: number) => {
    const chunk = text.slice(start, end);
    const colon = chunk.indexOf(':');
    if (colon < 0 || blocks.length === 0) return;
    const property = chunk.slice(0, colon).trim();
    const value = chunk.slice(colon + 1);
    const inTokenBlock =
      file === TOKEN_SHEET &&
      property.startsWith('--') &&
      TOKEN_SELECTOR.test(blocks.at(-1) ?? '') &&
      blocks.slice(0, -1).every((context) => TOKEN_CONTEXTS.has(context));
    if (inTokenBlock) return;
    // Paper has no theme: print rules keep their ink.
    if (blocks.includes(PRINT_CONTEXT)) return;
    // Each line of the value that holds a literal, so a multi-line shadow names its own.
    const first = lineAt(start + colon + 1);
    value.split('\n').forEach((valueLine, index) => {
      if (cssColorLiteral(valueLine)) lines.push(first + index);
    });
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '{') {
      blocks.push(selectors.slice(start, index).trim().replace(/\s+/g, ' '));
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
  return lines;
}

/**
 * Whether `parent` passes `node`'s value through as its own: parentheses, a
 * type assertion, a non-null assertion, a conditional's branch (not its
 * condition), or the default on the right of `??` or `||`.
 */
function passesThrough(parent: ts.Node, node: ts.Node): boolean {
  return (
    ts.isParenthesizedExpression(parent) ||
    ts.isAsExpression(parent) ||
    ts.isSatisfiesExpression(parent) ||
    ts.isTypeAssertionExpression(parent) ||
    ts.isNonNullExpression(parent) ||
    (ts.isConditionalExpression(parent) &&
      (parent.whenTrue === node || parent.whenFalse === node)) ||
    (ts.isBinaryExpression(parent) &&
      parent.right === node &&
      (parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
        parent.operatorToken.kind === ts.SyntaxKind.BarBarToken))
  );
}

/**
 * The name an object key, JSX attribute, or assignment target gives the
 * string it holds, through any wrapper that passes the string on unchanged.
 */
function colorKeyOf(literal: ts.Node): string | undefined {
  let node = literal;
  while (node.parent !== undefined && passesThrough(node.parent, node)) node = node.parent;
  const parent = node.parent;
  if (parent === undefined) return undefined;
  if (ts.isJsxAttribute(parent)) return parent.name.getText();
  if (ts.isJsxExpression(parent) && ts.isJsxAttribute(parent.parent)) {
    return parent.parent.name.getText();
  }
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
    return parent.name.getText().replace(/^['"]|['"]$/g, '');
  }
  if (
    ts.isBinaryExpression(parent) &&
    parent.right === node &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    ts.isPropertyAccessExpression(parent.left)
  ) {
    return parent.left.name.text;
  }
  if (
    ts.isCallExpression(parent) &&
    ts.isPropertyAccessExpression(parent.expression) &&
    parent.expression.name.text === 'setProperty' &&
    parent.arguments[1] === node
  ) {
    return 'color';
  }
  return undefined;
}

/** Whether `node` is an object literal of numeric `r`, `g`, and `b`: a colour by its channels. */
function isRgbObject(node: ts.Node): boolean {
  if (!ts.isObjectLiteralExpression(node)) return false;
  const numeric = new Set(
    node.properties
      .filter(
        (property): property is ts.PropertyAssignment =>
          ts.isPropertyAssignment(property) && ts.isNumericLiteral(property.initializer)
      )
      .map((property) => property.name.getText())
  );
  return ['r', 'g', 'b'].every((channel) => numeric.has(channel));
}

/**
 * The lines of a script's strings that hold a colour literal: hex or a colour
 * function in any string, a named colour where a colour goes, and an object
 * of numeric channels.
 */
function scriptFindings(file: string, source: string): number[] {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const lines: number[] = [];

  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      const value = node.text;
      const key = colorKeyOf(node);
      const named = key !== undefined && COLOR_KEY.test(key) && hasNamedColor(value);
      if (HEX.test(value) || SCRIPT_FUNCTION.test(value) || named) {
        lines.push(sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1);
      }
    } else if (isRgbObject(node)) {
      lines.push(sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return lines;
}

/** The literals outside the token blocks and the exceptions, and which exceptions matched one. */
function findings(): { readonly found: Finding[]; readonly used: Set<number> } {
  const found: Finding[] = [];
  const used = new Set<number>();

  for (const [file, source] of Object.entries(SOURCES)) {
    if (THEME_SOURCES.has(file)) continue;
    const sourceLines = source.split('\n');
    const lines = file.endsWith('.css') ? cssFindings(file, source) : scriptFindings(file, source);

    for (const line of new Set(lines)) {
      const text = sourceLines[line - 1] ?? '';
      const allowed = ALLOWED.findIndex((entry) => entry.file === file && entry.line.test(text));
      if (allowed >= 0) used.add(allowed);
      else found.push({ file, line, text: text.trim() });
    }
  }
  return { found, used };
}

describe('colour literals in the library', () => {
  const { found, used } = findings();

  it('reads every library source', () => {
    expect(Object.keys(SOURCES)).toEqual(
      expect.arrayContaining([
        'src/styles.css',
        TOKEN_SHEET,
        'src/index.ts',
        'src/VisuallyHidden.tsx',
        ...THEME_SOURCES
      ])
    );
    expect(Object.keys(SOURCES).filter((file) => /\.test\./.test(file))).toEqual([]);
  });

  it('paints every colour through a token block of themes.generated.css or a listed exception', () => {
    expect(
      found.map(({ file, line, text }) => `${file}:${line}: ${text}`),
      'Derive each colour as a token in src/themes/tokens.ts, regenerate themes.generated.css, and use var()'
    ).toEqual([]);
  });

  it('keeps no exception that no longer names a literal', () => {
    expect(ALLOWED.filter((_, index) => !used.has(index)).map((entry) => entry.file)).toEqual([]);
  });

  it('reads token blocks and finds literals outside them', () => {
    const sheet = [
      ':root { --a: #fff; }',
      '@media (prefers-color-scheme: dark) { :root { --a: rgb(0 0 0 / 10%); } }',
      '.x { --b: #fff; }',
      '.y { color: red; box-shadow: 0 1px var(--shadow-red); }',
      '.z { background: color-mix(in srgb, var(--a) 50%, white); }',
      ".w { content: 'red'; background: transparent; color: currentColor; }",
      "@media (prefers-color-scheme: light) { :root[data-light-theme='x-y'] { --a: #fff; } }",
      "[data-theme-preview='x-y'] { --a: #fff; }",
      '@media (min-width: 1px) { :root { --a: #fff; } }',
      ':root { color: #fff; }',
      '@media print { .p { color: #000; border: 1px solid #999; } }'
    ].join('\n');
    expect(cssFindings(TOKEN_SHEET, sheet)).toEqual([3, 4, 5, 9, 10]);
    expect(cssFindings('src/x.css', '@media screen { .p { color: #000; } }')).toEqual([1]);
    for (const query of ['print, screen', 'print, (min-width: 1px)', 'print-preview']) {
      expect(cssFindings('src/x.css', `@media ${query} { .p { color: #000; } }`), query).toEqual([
        1
      ]);
    }
    expect(cssFindings('src/styles.css', ':root { --a: #fff; }')).toEqual([1]);

    const script = [
      "const a = { color: 'white', key: 'red' };",
      "const b = '#1e66f5';",
      'const c = `rgb(${r}, ${g}, ${b})`;',
      "const d = 'rgba(0, 0, 0, 0.5)';",
      'const e = <rect fill="black" />;'
    ].join('\n');
    expect(scriptFindings('x.tsx', script)).toEqual([1, 2, 4, 5]);
    expect(
      scriptFindings('x.ts', 'const f = { r: 30, g: 30, b: 46 };\nconst g = { r, g: 1, b: 2 };')
    ).toEqual([1]);

    // A named colour behind a conditional or a type assertion still sits under
    // its key; one in a conditional's condition or under another key does not.
    const wrapped = [
      "const h = <i style={{ color: active ? 'red' : (",
      "  'blue'",
      ') }} />;',
      "const i = { background: 'white' as const };",
      "const k = { color: 'red' === tone ? 'var(--a)' : 'var(--b)' };",
      "const l = { label: active ? 'red' : 'blue' };"
    ].join('\n');
    expect(scriptFindings('x.tsx', wrapped)).toEqual([1, 2, 4]);
    const asserted = [
      "const m = { fill: <const>'black',",
      "  stroke: ('navy' satisfies string)! };"
    ].join('\n');
    expect(scriptFindings('x.ts', asserted)).toEqual([1, 2]);
    // A named colour given as a default still sits under its key.
    const defaults = ["const n = { color: tone ?? 'red',", "  fill: ink || 'black' };"].join('\n');
    expect(scriptFindings('x.ts', defaults)).toEqual([1, 2]);
  });
});

describe("the theme catalog's colours in the library", () => {
  const importers = Object.entries(SOURCES)
    .filter(([file]) => /\.tsx?$/.test(file) && !file.startsWith('src/themes/'))
    .map(([file, source]) => ({ file, modules: paletteImports(file, source) }))
    .filter(({ modules }) => modules.length > 0);

  it('stay out of every module but a listed one, which names themes by id alone', () => {
    const listed = new Set(PALETTE_IMPORTERS.map((entry) => entry.file));
    expect(
      importers
        .filter(({ file }) => !listed.has(file))
        .map(({ file, modules }) => `${file}: ${modules.join(', ')}`),
      'Paint with the tokens (var(--…)); name a theme through src/themes/ids'
    ).toEqual([]);
    const importing = new Set(importers.map(({ file }) => file));
    expect(PALETTE_IMPORTERS.filter(({ file }) => !importing.has(file))).toEqual([]);
  });

  it('are found however a module imports them', () => {
    const source = [
      "import { THEMES } from '../themes/catalog.js';",
      "import { themeTokens } from '../themes/tokens';",
      "export { mix } from '../themes/color.js';",
      "const later = () => import('../themes/index.js');",
      "import { LIGHT_THEME_IDS } from '../themes/ids.js';",
      "import { wearThemes } from '../themes/attributes.js';",
      "import type { Theme } from '../themes/catalog.js';",
      "import { Button } from '../button/Button.js';"
    ].join('\n');
    expect(paletteImports('src/chart/Chart.tsx', source)).toEqual([
      '../themes/catalog.js',
      '../themes/tokens',
      '../themes/color.js',
      '../themes/index.js',
      '../themes/catalog.js'
    ]);
  });
});
