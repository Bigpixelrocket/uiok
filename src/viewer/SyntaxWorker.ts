/**
 * The highlighting worker's entry: Shiki on its JavaScript regex engine,
 * serving the text view's requests (`SyntaxService.ts`). Grammars and the
 * theme load as chunks of their own when the page names a language.
 */

import { loadLineTokenizer } from './SyntaxHighlighter.js';
import { serveSyntax, type SyntaxScope } from './SyntaxService.js';

serveSyntax(self as unknown as SyntaxScope, loadLineTokenizer);
