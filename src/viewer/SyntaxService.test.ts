import { describe, expect, it, vi } from 'vitest';

import type { SyntaxLanguageId } from './SyntaxLanguage.logic.js';
import { serveSyntax, type SyntaxScope } from './SyntaxService.js';
import type { LineTokenizer } from './SyntaxSession.logic.js';

/** A worker scope that records what it answers. */
function fakeScope(): { scope: SyntaxScope; answers: unknown[] } {
  const answers: unknown[] = [];
  const scope: SyntaxScope = { postMessage: (message) => answers.push(message), onmessage: null };
  return { scope, answers };
}

const tokenizer: LineTokenizer<null> = {
  initial: null,
  styles: [],
  tokenizeLine: () => ({ tokens: [], state: null })
};

/** Hands the scope an `open` request for `language`. */
function open(scope: SyntaxScope, language: string): void {
  scope.onmessage?.({
    data: { type: 'open', language: language as SyntaxLanguageId, maxLineBytes: 4096 }
  } as MessageEvent);
}

describe('serveSyntax', () => {
  it('answers ready for a shipped language', async () => {
    const { scope, answers } = fakeScope();
    const load = vi.fn(() => Promise.resolve(tokenizer));
    serveSyntax(scope, load);

    open(scope, 'json');

    await vi.waitFor(() => expect(answers).toEqual([{ type: 'ready', styles: [] }]));
    expect(load).toHaveBeenCalledWith('json');
  });

  it.each(['constructor', '__proto__', 'valueOf', 'klingon'])(
    'answers failed, without loading, for the unknown language %s',
    async (language) => {
      const { scope, answers } = fakeScope();
      const load = vi.fn(() => Promise.resolve(tokenizer));
      serveSyntax(scope, load);

      expect(() => open(scope, language)).not.toThrow();

      await vi.waitFor(() => expect(answers).toEqual([{ type: 'failed' }]));
      expect(load).not.toHaveBeenCalled();
    }
  );

  it('answers failed when loading throws before it returns a promise', async () => {
    const { scope, answers } = fakeScope();
    serveSyntax(scope, () => {
      throw new Error('no chunk');
    });

    expect(() => open(scope, 'json')).not.toThrow();

    await vi.waitFor(() => expect(answers).toEqual([{ type: 'failed' }]));
  });
});
