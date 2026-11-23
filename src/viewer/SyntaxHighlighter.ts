/**
 * Shiki bound to the text view: the shipped grammars, each loaded only when a
 * file needs it, the theme, and the line tokenizer the syntax session runs.
 *
 * Shiki runs on its JavaScript regex engine, so highlighting needs no
 * WebAssembly and the viewer's CSP grants none. `SyntaxHighlighter.test.ts`
 * compiles every pattern of every grammar here with that engine.
 *
 * The theme is Catppuccin Mocha, the app's own palette. Its colors become
 * the palette's role names (`--syntax-mauve`, `--syntax-peach`), which every
 * theme of the catalog sets (`@bigpixelrocket/uiok/themes`), so a token
 * follows the window's theme without being tokenized again. A line's tokens cover
 * only its styled text; the rest draws in the text's own color.
 */

import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import { createShikiPrimitiveAsync, type LanguageRegistration } from '@shikijs/primitive';
import { EncodedTokenMetadata, INITIAL, type StateStack } from '@shikijs/primitive/textmate';

import type { SyntaxLanguageId } from './SyntaxLanguage.logic.js';
import type { LineTokenizer, SyntaxStyle, SyntaxToken } from './SyntaxSession.logic.js';

type GrammarModule = Promise<{ readonly default: LanguageRegistration[] }>;

/** Each shipped grammar, as a chunk of its own that loads on first use. */
export const SYNTAX_GRAMMARS: Readonly<Record<SyntaxLanguageId, () => GrammarModule>> = {
  apache: () => import('@shikijs/langs/apache'),
  blade: () => import('@shikijs/langs/blade'),
  c: () => import('@shikijs/langs/c'),
  cpp: () => import('@shikijs/langs/cpp'),
  css: () => import('@shikijs/langs/css'),
  csv: () => import('@shikijs/langs/csv'),
  diff: () => import('@shikijs/langs/diff'),
  docker: () => import('@shikijs/langs/docker'),
  dotenv: () => import('@shikijs/langs/dotenv'),
  fish: () => import('@shikijs/langs/fish'),
  go: () => import('@shikijs/langs/go'),
  html: () => import('@shikijs/langs/html'),
  ini: () => import('@shikijs/langs/ini'),
  java: () => import('@shikijs/langs/java'),
  javascript: () => import('@shikijs/langs/javascript'),
  json: () => import('@shikijs/langs/json'),
  jsonc: () => import('@shikijs/langs/jsonc'),
  jsx: () => import('@shikijs/langs/jsx'),
  kotlin: () => import('@shikijs/langs/kotlin'),
  less: () => import('@shikijs/langs/less'),
  lua: () => import('@shikijs/langs/lua'),
  make: () => import('@shikijs/langs/make'),
  markdown: () => import('@shikijs/langs/markdown'),
  nginx: () => import('@shikijs/langs/nginx'),
  'objective-c': () => import('@shikijs/langs/objective-c'),
  perl: () => import('@shikijs/langs/perl'),
  php: () => import('@shikijs/langs/php'),
  python: () => import('@shikijs/langs/python'),
  ruby: () => import('@shikijs/langs/ruby'),
  rust: () => import('@shikijs/langs/rust'),
  scss: () => import('@shikijs/langs/scss'),
  shellscript: () => import('@shikijs/langs/shellscript'),
  sql: () => import('@shikijs/langs/sql'),
  'ssh-config': () => import('@shikijs/langs/ssh-config'),
  swift: () => import('@shikijs/langs/swift'),
  toml: () => import('@shikijs/langs/toml'),
  tsx: () => import('@shikijs/langs/tsx'),
  typescript: () => import('@shikijs/langs/typescript'),
  vue: () => import('@shikijs/langs/vue'),
  xml: () => import('@shikijs/langs/xml'),
  yaml: () => import('@shikijs/langs/yaml')
};

/** The theme tokens are drawn from; its colors are mapped to palette roles below. */
const THEME = 'catppuccin-mocha';

/** Catppuccin Mocha's colors, as the theme spells them, by palette role. */
const MOCHA_ROLES: Readonly<Record<string, string>> = {
  '#f5e0dc': 'rosewater',
  '#f2cdcd': 'flamingo',
  '#f5c2e7': 'pink',
  '#cba6f7': 'mauve',
  '#f38ba8': 'red',
  '#eba0ac': 'maroon',
  '#fab387': 'peach',
  '#f9e2af': 'yellow',
  '#a6e3a1': 'green',
  '#94e2d5': 'teal',
  '#89dceb': 'sky',
  '#74c7ec': 'sapphire',
  '#89b4fa': 'blue',
  '#b4befe': 'lavender',
  '#a6adc8': 'subtext0',
  '#9399b2': 'overlay2'
};

/** Shiki's font style bits (TextMate's `FontStyle`). */
const ITALIC = 1;
const BOLD = 2;
const STRIKETHROUGH = 8;

/** The style for a theme color and font style; the text's own color stays unset. */
function styleFor(color: string | undefined, fontStyle: number): SyntaxStyle {
  const role = color === undefined ? undefined : MOCHA_ROLES[color.toLowerCase()];

  return {
    color: role === undefined ? null : `var(--syntax-${role})`,
    italic: (fontStyle & ITALIC) !== 0,
    bold: (fontStyle & BOLD) !== 0,
    strikethrough: (fontStyle & STRIKETHROUGH) !== 0
  };
}

/** How long one line may tokenize before the rest of it shows plain, as Shiki's own limit. */
const LINE_TIME_LIMIT_MS = 500;

/**
 * Loads `language`'s grammar (and the grammars it embeds) and the theme,
 * and returns a tokenizer over them. Rejects when a chunk fails to load.
 */
export async function loadLineTokenizer(
  language: SyntaxLanguageId
): Promise<LineTokenizer<StateStack>> {
  const shiki = await createShikiPrimitiveAsync({
    engine: createJavaScriptRegexEngine(),
    themes: [import('@shikijs/themes/catppuccin-mocha')],
    langs: [SYNTAX_GRAMMARS[language]()]
  });
  const { colorMap } = shiki.setTheme(THEME);
  const grammar = shiki.getLanguage(language);

  // One style per theme color and font style, at the index a token's
  // metadata encodes: foreground id times 16, plus the font style bits.
  const styles = Array.from({ length: colorMap.length * 16 }, (_, index) =>
    styleFor(colorMap[Math.floor(index / 16)], index % 16)
  );
  const styleOf = (metadata: number): number =>
    EncodedTokenMetadata.getForeground(metadata) * 16 + EncodedTokenMetadata.getFontStyle(metadata);
  const plain = (style: number): boolean => {
    const { color, italic, bold, strikethrough } = styles[style] ?? styleFor(undefined, 0);
    return color === null && !italic && !bold && !strikethrough;
  };

  return {
    initial: INITIAL,
    styles,
    tokenizeLine: (text, state) => {
      const result = grammar.tokenizeLine2(text, state, LINE_TIME_LIMIT_MS);
      const tokens: SyntaxToken[] = [];
      const count = result.tokens.length / 2;

      for (let index = 0; index < count; index += 1) {
        const start = result.tokens[2 * index] ?? 0;
        const end = index + 1 < count ? (result.tokens[2 * index + 2] ?? text.length) : text.length;
        const style = styleOf(result.tokens[2 * index + 1] ?? 0);
        const previous = tokens.at(-1);

        // Text in the text's own style needs no token.
        if (end <= start || plain(style)) continue;
        if (previous !== undefined && previous.style === style && previous.end === start) {
          tokens[tokens.length - 1] = { start: previous.start, end, style };
        } else {
          tokens.push({ start, end, style });
        }
      }

      return { tokens, state: result.ruleStack };
    }
  };
}
