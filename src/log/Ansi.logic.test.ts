import { describe, expect, it } from 'vitest';

import { ansiSegments } from './Ansi.logic.js';

const ESC = '\u001b';

describe('ansiSegments', () => {
  it('keeps a line with no escape as one plain run', () => {
    expect(ansiSegments('Server running')).toEqual([{ text: 'Server running' }]);
  });

  it('reads colours, bright colours, backgrounds, and bold, each reset as SGR resets it', () => {
    expect(
      ansiSegments(
        `${ESC}[44;97m INFO ${ESC}[0m Server ${ESC}[1;32mready${ESC}[22m on ${ESC}[39m:8000`
      )
    ).toEqual([
      { text: ' INFO ', fg: 'white', bg: 'blue' },
      { text: ' Server ' },
      { text: 'ready', fg: 'green', bold: true },
      { text: ' on ', fg: 'green' },
      { text: ':8000' }
    ]);
  });

  it('turns inverse into a filled run and reads dim, italic, and underline', () => {
    expect(ansiSegments(`${ESC}[31;7mERROR${ESC}[27;2;3;4m tail`)).toEqual([
      { text: 'ERROR', bg: 'red' },
      { text: ' tail', fg: 'red', dim: true, italic: true, underline: true }
    ]);
  });

  it('skips extended colours whole and drops every other escape sequence', () => {
    expect(
      ansiSegments(
        `${ESC}]0;title${ESC}\\${ESC}[2K${ESC}[38;5;208mhot${ESC}[38;2;1;2;3;1m bold${ESC}[?25l!`
      )
    ).toEqual([{ text: 'hot' }, { text: ' bold', bold: true }, { text: '!', bold: true }]);
  });
});
