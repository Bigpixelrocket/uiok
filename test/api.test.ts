// @vitest-environment node

/**
 * The public API guard: every symbol `src/index.ts` exports carries a
 * docblock, so the package's contract is documented where consumers' editors
 * show it. So does every symbol of an entry kept out of the root barrel
 * (`ENTRIES_BESIDE_ROOT`), which consumers import by its own path.
 */

import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ENTRY = fileURLToPath(new URL('../src/index.ts', import.meta.url));
const CONFIG = fileURLToPath(new URL('../tsconfig.build.json', import.meta.url));

/**
 * The areas the root barrel leaves out on purpose, each importable only as
 * `@bigpixelrocket/uiok/<area>`: the terminal, so an app that shows none
 * never loads its WebAssembly.
 */
const ENTRIES_BESIDE_ROOT = {
  terminal: fileURLToPath(new URL('../src/terminal/index.ts', import.meta.url))
} as const;

/** The names an entry module exports, each with whether its declaration has a docblock. */
function publicExports(entryPath: string = ENTRY): { name: string; documented: boolean }[] {
  const config = ts.getParsedCommandLineOfConfigFile(
    CONFIG,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      }
    }
  );
  if (config === undefined) throw new Error(`Could not read ${CONFIG}`);
  const program = ts.createProgram([entryPath], config.options);
  const checker = program.getTypeChecker();
  const entry = program.getSourceFile(entryPath);
  const module = entry && checker.getSymbolAtLocation(entry);
  if (module === undefined) throw new Error(`Could not read ${entryPath}`);

  return checker.getExportsOfModule(module).map((exported) => {
    const target =
      exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    return {
      name: exported.name,
      documented: (target.declarations ?? []).some(
        (declaration) => ts.getJSDocCommentsAndTags(declaration).length > 0
      )
    };
  });
}

describe('the public API', () => {
  const exports = publicExports();

  it('exports at least one symbol', () => {
    expect(exports.map(({ name }) => name)).toContain('VisuallyHidden');
  });

  it('documents every export with a docblock', () => {
    expect(
      exports.filter(({ documented }) => !documented).map(({ name }) => name),
      'Add a /** docblock */ to each export listed'
    ).toEqual([]);
  });
});

describe('the terminal entry, beside the root', () => {
  const exports = publicExports(ENTRIES_BESIDE_ROOT.terminal);
  const names = exports.map(({ name }) => name);

  it('exports the terminal, which the root barrel leaves out', () => {
    expect(names).toContain('Terminal');
    expect(publicExports().map(({ name }) => name)).not.toContain('Terminal');
  });

  it('documents every export with a docblock', () => {
    expect(
      exports.filter(({ documented }) => !documented).map(({ name }) => name),
      'Add a /** docblock */ to each export listed'
    ).toEqual([]);
  });
});
