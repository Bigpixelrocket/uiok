// @vitest-environment node

/**
 * The public API guard: every symbol `src/index.ts` exports carries a
 * docblock, so the package's contract is documented where consumers' editors
 * show it.
 */

import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ENTRY = fileURLToPath(new URL('../src/index.ts', import.meta.url));
const CONFIG = fileURLToPath(new URL('../tsconfig.build.json', import.meta.url));

/** The names `src/index.ts` exports, each with whether its declaration has a docblock. */
function publicExports(): { name: string; documented: boolean }[] {
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
  const program = ts.createProgram([ENTRY], config.options);
  const checker = program.getTypeChecker();
  const entry = program.getSourceFile(ENTRY);
  const module = entry && checker.getSymbolAtLocation(entry);
  if (module === undefined) throw new Error(`Could not read ${ENTRY}`);

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
