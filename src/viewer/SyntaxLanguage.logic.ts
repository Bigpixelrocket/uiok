/**
 * Which grammar highlights a file, and whether it is highlighted at all. The
 * language comes from the file's name (a known name such as `Dockerfile`,
 * then its extension) and, failing that, from a `#!` line naming the
 * interpreter. Highlighting steps down to plain text past a file size, and a
 * line steps down past a length; both numbers were measured on real files
 * (see the constants), and the view says why whenever it steps down.
 */

import type { ViewerContentKind } from './types.js';
import type { ViewerLabels } from '../labels/viewer.js';

/**
 * The grammars the viewer ships, by Shiki's id, with the name the status bar
 * shows, a proper name left untranslated. `SyntaxHighlighter.ts` loads each
 * lazily.
 */
export const SYNTAX_LANGUAGES = {
  apache: 'Apache',
  blade: 'Blade',
  c: 'C',
  cpp: 'C++',
  css: 'CSS',
  csv: 'CSV',
  diff: 'Diff',
  docker: 'Dockerfile',
  dotenv: 'dotenv',
  fish: 'Fish',
  go: 'Go',
  html: 'HTML',
  ini: 'INI',
  java: 'Java',
  javascript: 'JavaScript',
  json: 'JSON',
  jsonc: 'JSON with Comments',
  jsx: 'JSX',
  kotlin: 'Kotlin',
  less: 'Less',
  lua: 'Lua',
  make: 'Makefile',
  markdown: 'Markdown',
  nginx: 'nginx',
  'objective-c': 'Objective-C',
  perl: 'Perl',
  php: 'PHP',
  python: 'Python',
  ruby: 'Ruby',
  rust: 'Rust',
  scss: 'SCSS',
  shellscript: 'Shell',
  sql: 'SQL',
  'ssh-config': 'SSH Config',
  swift: 'Swift',
  toml: 'TOML',
  tsx: 'TSX',
  typescript: 'TypeScript',
  vue: 'Vue',
  xml: 'XML',
  yaml: 'YAML'
} as const;

/** A shipped grammar's id. */
export type SyntaxLanguageId = keyof typeof SYNTAX_LANGUAGES;

/**
 * Files past this size open as plain text. Highlighting costs the same per
 * screen at any size, since only the rows in view are tokenized, so this is
 * no speed limit: it keeps generated data plain. Measured on this Mac's
 * sources: the largest hand-written ones (sqlite3.c at 9.0 MB, typescript.js
 * at 9.1 MB) stay highlighted, while generated tables (PHP's fileinfo
 * `data_file.c`, 16.9 to 48 MB of byte arrays) and logs step down.
 */
export const HIGHLIGHT_MAX_FILE_BYTES = 16 * 1024 * 1024;

/**
 * Lines longer than this show as plain text. Tokenizing a line costs more
 * than its length: on five minified bundles (tldts, ajv, Testing Library,
 * Go's webcomponents, yt-dlp's solver), a 4 KB prefix of the longest line
 * took 8 to 43 ms with the JavaScript regex engine, 8 KB took up to 103 ms,
 * and 20 KB up to 375 ms. 4 KB keeps every line under 50 ms.
 */
export const HIGHLIGHT_MAX_LINE_BYTES = 4 * 1024;

/** Names that mean a language whatever their extension, lowercased. */
const FILE_NAMES: Readonly<Record<string, SyntaxLanguageId>> = {
  dockerfile: 'docker',
  containerfile: 'docker',
  makefile: 'make',
  gnumakefile: 'make',
  '.zshrc': 'shellscript',
  '.zshenv': 'shellscript',
  '.zprofile': 'shellscript',
  '.zlogin': 'shellscript',
  '.zlogout': 'shellscript',
  '.bashrc': 'shellscript',
  '.bash_profile': 'shellscript',
  '.bash_login': 'shellscript',
  '.bash_logout': 'shellscript',
  '.bash_aliases': 'shellscript',
  '.profile': 'shellscript',
  '.kshrc': 'shellscript',
  '.env': 'dotenv',
  '.gitconfig': 'ini',
  '.editorconfig': 'ini',
  '.npmrc': 'ini',
  '.htaccess': 'apache',
  'httpd.conf': 'apache',
  'apache2.conf': 'apache',
  'nginx.conf': 'nginx',
  ssh_config: 'ssh-config',
  sshd_config: 'ssh-config',
  'tsconfig.json': 'jsonc',
  'jsconfig.json': 'jsonc',
  gemfile: 'ruby',
  rakefile: 'ruby',
  podfile: 'ruby',
  brewfile: 'ruby',
  vagrantfile: 'ruby'
};

/** Extensions, lowercased and without the dot. */
const EXTENSIONS: Readonly<Record<string, SyntaxLanguageId>> = {
  html: 'html',
  htm: 'html',
  xhtml: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',
  vue: 'vue',
  php: 'php',
  phtml: 'php',
  json: 'json',
  jsonl: 'json',
  ndjson: 'json',
  webmanifest: 'json',
  jsonc: 'jsonc',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'toml',
  ini: 'ini',
  cfg: 'ini',
  properties: 'ini',
  xml: 'xml',
  plist: 'xml',
  svg: 'xml',
  xsd: 'xml',
  xsl: 'xml',
  xslt: 'xml',
  env: 'dotenv',
  nginx: 'nginx',
  csv: 'csv',
  diff: 'diff',
  patch: 'diff',
  md: 'markdown',
  markdown: 'markdown',
  mdown: 'markdown',
  mkd: 'markdown',
  sql: 'sql',
  dockerfile: 'docker',
  mk: 'make',
  mak: 'make',
  sh: 'shellscript',
  bash: 'shellscript',
  zsh: 'shellscript',
  ksh: 'shellscript',
  command: 'shellscript',
  fish: 'fish',
  c: 'c',
  h: 'c',
  cc: 'cpp',
  cpp: 'cpp',
  cxx: 'cpp',
  'c++': 'cpp',
  hh: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  'h++': 'cpp',
  ipp: 'cpp',
  m: 'objective-c',
  rs: 'rust',
  go: 'go',
  swift: 'swift',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  py: 'python',
  pyi: 'python',
  pyw: 'python',
  rb: 'ruby',
  rake: 'ruby',
  gemspec: 'ruby',
  ru: 'ruby',
  pl: 'perl',
  pm: 'perl',
  lua: 'lua'
};

/** Interpreters a `#!` line names, without a version suffix. */
const INTERPRETERS: Readonly<Record<string, SyntaxLanguageId>> = {
  sh: 'shellscript',
  bash: 'shellscript',
  zsh: 'shellscript',
  ksh: 'shellscript',
  mksh: 'shellscript',
  dash: 'shellscript',
  ash: 'shellscript',
  fish: 'fish',
  node: 'javascript',
  nodejs: 'javascript',
  bun: 'javascript',
  deno: 'typescript',
  'ts-node': 'typescript',
  tsx: 'typescript',
  python: 'python',
  pypy: 'python',
  ruby: 'ruby',
  jruby: 'ruby',
  perl: 'perl',
  php: 'php',
  lua: 'lua',
  luajit: 'lua',
  make: 'make',
  gmake: 'make'
};

/**
 * The language a `#!` line names: the interpreter's base name, or the
 * command `env` runs (past its options and variable assignments), with a
 * version suffix dropped (`python3.12` is Python). Null for any other line.
 */
export function languageFromShebang(firstLine: string): SyntaxLanguageId | null {
  if (!firstLine.startsWith('#!')) return null;

  const words = firstLine.slice(2).trim().split(/\s+/u);
  let command = words[0]?.split('/').at(-1) ?? '';

  if (command === 'env') {
    command = words.slice(1).find((word) => !word.startsWith('-') && !word.includes('=')) ?? '';
  }

  return INTERPRETERS[command.replace(/[\d.]+$/u, '')] ?? null;
}

/**
 * The language of a file named `name` whose first line is `firstLine`: a
 * known file name first (`Dockerfile`, `.zshrc`, `Dockerfile.dev`,
 * `.env.local`), then the extension, then a `#!` line. Null when none names
 * a shipped grammar.
 */
export function languageFor(name: string, firstLine: string): SyntaxLanguageId | null {
  const lower = name.toLowerCase();
  const known = FILE_NAMES[lower];
  if (known) return known;

  if (lower.endsWith('.blade.php')) return 'blade';
  if (lower.startsWith('dockerfile.') || lower.startsWith('containerfile.')) return 'docker';
  if (lower.startsWith('.env.')) return 'dotenv';

  const dot = lower.lastIndexOf('.');
  const byExtension = dot > 0 ? EXTENSIONS[lower.slice(dot + 1)] : undefined;

  return byExtension ?? languageFromShebang(firstLine);
}

/** Whether a file is highlighted, and if not, why. */
export type HighlightPlan =
  | { readonly kind: 'none' }
  | { readonly kind: 'highlight'; readonly language: SyntaxLanguageId }
  | { readonly kind: 'too-large'; readonly language: SyntaxLanguageId };

/**
 * The plan for a file: no known language, highlighted, or stepped down for
 * its size. A file detected as SVG (`kind`) is XML whatever its name says,
 * so its source highlights even as `logo` or `logo.js`.
 */
export function highlightPlan(
  name: string,
  sizeBytes: number,
  firstLine: string,
  kind: ViewerContentKind
): HighlightPlan {
  const language = kind === 'svg' ? 'xml' : languageFor(name, firstLine);

  if (language === null) return { kind: 'none' };
  if (sizeBytes > HIGHLIGHT_MAX_FILE_BYTES) return { kind: 'too-large', language };

  return { kind: 'highlight', language };
}

/** Why a highlighted file shows some of its text plain. */
export type HighlightNote = 'too-large' | 'long-lines' | 'unavailable' | null;

/** The status bar's word on highlighting: the language, and why it stepped down if it did. */
export function highlightStatus(
  language: SyntaxLanguageId,
  note: HighlightNote,
  labels: ViewerLabels
): string {
  const name = SYNTAX_LANGUAGES[language];

  switch (note) {
    case 'too-large':
      return labels.text.tooLarge(name, labels.size(HIGHLIGHT_MAX_FILE_BYTES));
    case 'long-lines':
      return labels.text.longLines(name, labels.size(HIGHLIGHT_MAX_LINE_BYTES));
    case 'unavailable':
      return labels.text.unavailable(name);
    case null:
      return name;
  }
}
