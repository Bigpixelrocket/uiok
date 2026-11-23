import { THEMES } from '../themes/catalog.js';
import { themeTokens } from '../themes/tokens.js';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import { describe, expect, it } from 'vitest';

import { SYNTAX_LANGUAGES, type SyntaxLanguageId } from './SyntaxLanguage.logic.js';
import { loadLineTokenizer, SYNTAX_GRAMMARS } from './SyntaxHighlighter.js';

/** A few lines each grammar colors something in. */
const SAMPLES: Readonly<Record<SyntaxLanguageId, string>> = {
  apache: '<VirtualHost *:80>\n  ServerName example.test\n</VirtualHost>',
  blade: '@if ($user)\n  <p>{{ $user->name }}</p>\n@endif',
  c: '#include <stdio.h>\nint main(void) { return 0; } /* done */',
  cpp: '#include <vector>\nstd::vector<int> values{1, 2};\nauto x = "text";',
  css: '.row { color: #fff; margin: 0 auto; }',
  csv: 'name,size,kind\nreadme.md,120,text',
  diff: '--- a/file\n+++ b/file\n@@ -1 +1 @@\n-old\n+new',
  docker: 'FROM node:24\nRUN npm ci\nCMD ["node", "index.js"]',
  dotenv: '# settings\nAPP_KEY=secret\nDEBUG=true',
  fish: 'function greet\n  echo "hi $argv"\nend',
  go: 'package main\n\nfunc main() { println("hi") }',
  html: '<!doctype html>\n<p class="note">Hello <b>there</b></p>',
  ini: '[core]\nbare = false ; comment',
  java: 'public class App { static int x = 1; // note\n}',
  javascript: 'const x = 1; // note\nexport function f(a) { return `v${a}`; }',
  json: '{ "name": "app", "count": 3, "ok": true }',
  jsonc: '{\n  // comment\n  "name": "app"\n}',
  jsx: 'const App = () => <div className="x">{value}</div>;',
  kotlin: 'fun main() { val x = "hi"; println(x) }',
  less: '@width: 10px;\n.box { width: @width; }',
  lua: 'local x = 1 -- note\nfunction f() return "s" end',
  make: 'all: build\n\t@echo "done" # note',
  markdown: '# Title\n\nSome *emphasis* and `code`.\n\n```js\nconst x = 1;\n```',
  nginx: 'server {\n  listen 80;\n  location / { return 200 "ok"; }\n}',
  'objective-c': '#import <Foundation/Foundation.h>\n@interface App : NSObject\n@end',
  perl: 'my $x = "hi"; # note\nprint "$x\\n";',
  php: '<?php\nnamespace App;\nfunction f(int $a): string { return "v{$a}"; } // note',
  python: 'def f(a):\n    return f"v{a}"  # note',
  ruby: 'def greet(name)\n  "hi #{name}" # note\nend',
  rust: 'fn main() { let x: i32 = 1; println!("{x}"); }',
  scss: '$c: red;\n.a { .b { color: $c; } }',
  shellscript: '#!/bin/sh\nfor f in *.txt; do echo "$f"; done # note',
  sql: 'SELECT id, name FROM users WHERE id = 1; -- note',
  'ssh-config': 'Host example\n  HostName example.test\n  User git',
  swift: 'let x: Int = 1 // note\nfunc f() -> String { "s" }',
  toml: '[package]\nname = "app"\nversion = 1',
  tsx: 'const App = (p: Props) => <div>{p.value}</div>;',
  typescript: 'interface A { x: number }\nconst a: A = { x: 1 }; // note',
  vue: '<template><p>{{ message }}</p></template>\n<script setup lang="ts">\nconst message = "hi";\n</script>',
  xml: '<?xml version="1.0"?>\n<root attr="1"><!-- note --><item/></root>',
  yaml: 'name: app # note\nitems:\n  - one\n  - 2'
};

/** Every regular expression a grammar holds, embedded rules included. */
function patternsOf(grammar: unknown): string[] {
  const found: string[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
    } else if (node !== null && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        if (['match', 'begin', 'end', 'while'].includes(key) && typeof value === 'string') {
          found.push(value);
        } else {
          visit(value);
        }
      }
    }
  };

  visit(grammar);
  return found;
}

/**
 * The budget of a case that compiles or runs a whole grammar: the large ones
 * (C++, Ruby, Blade) take seconds, longer when other processes share the machine.
 */
const GRAMMAR_TIMEOUT_MS = 30_000;

describe('shipped grammars', { timeout: GRAMMAR_TIMEOUT_MS }, () => {
  it('ships a grammar for every language the detection names', () => {
    expect(Object.keys(SYNTAX_GRAMMARS).sort()).toEqual(Object.keys(SYNTAX_LANGUAGES).sort());
  });

  it.each(Object.keys(SYNTAX_GRAMMARS) as SyntaxLanguageId[])(
    'compiles every pattern of %s with the JavaScript regex engine',
    async (language) => {
      const engine = createJavaScriptRegexEngine();
      const registrations = (await SYNTAX_GRAMMARS[language]()).default;
      const failures: string[] = [];
      let compiled = 0;

      for (const registration of registrations) {
        for (const pattern of patternsOf(registration)) {
          try {
            // A search builds a long pattern the engine compiles lazily.
            engine.createScanner([pattern]).findNextMatchSync('', 0, 0);
            compiled += 1;
          } catch (error) {
            failures.push(`${registration.name}: ${pattern} (${String(error)})`);
          }
        }
      }

      expect(failures).toEqual([]);
      expect(compiled).toBeGreaterThan(0);
    }
  );

  it.each(Object.keys(SYNTAX_GRAMMARS) as SyntaxLanguageId[])(
    'highlights a sample of %s',
    async (language) => {
      const tokenizer = await loadLineTokenizer(language);
      let state = tokenizer.initial;
      let styled = 0;

      for (const line of SAMPLES[language].split('\n')) {
        const result = tokenizer.tokenizeLine(line, state);
        state = result.state;
        styled += result.tokens.filter(
          (token) => tokenizer.styles[token.style]?.color?.startsWith('var(--syntax-') ?? false
        ).length;
      }

      expect(styled).toBeGreaterThan(0);
    }
  );

  it('rejects a language id that names no shipped grammar', async () => {
    await expect(loadLineTokenizer('constructor' as SyntaxLanguageId)).rejects.toThrow();
  });

  it("draws every theme color but the text's own from a palette token every theme sets as hex", async () => {
    const { styles: themeStyles } = await loadLineTokenizer('json');
    const roles = new Set(
      themeStyles.flatMap(
        (style) => style.color?.match(/^var\(--syntax-([a-z0-9]+)\)$/u)?.[1] ?? []
      )
    );

    // Catppuccin's sixteen accent and overlay roles; the seventeenth color is the text.
    expect(roles.size).toBe(16);
    for (const theme of THEMES) {
      const syntax = Object.entries(themeTokens(theme)).flatMap(([name, value]) => {
        const role = /^--syntax-([a-z0-9]+)$/u.exec(name)?.[1];
        return role === undefined ? [] : [[role, value] as const];
      });
      expect(new Set(syntax.map(([role]) => role)), theme.id).toEqual(roles);
      for (const [role, value] of syntax)
        expect(value, `${theme.id} ${role}`).toMatch(/^#[0-9a-f]{6}$/u);
    }
  });
});
