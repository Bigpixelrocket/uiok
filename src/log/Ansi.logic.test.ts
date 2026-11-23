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

  it('drops a CSI with private, intermediate, or any parameter bytes without applying it', () => {
    expect(ansiSegments(`${ESC}[>4;2mhello`)).toEqual([{ text: 'hello' }]);
    expect(ansiSegments(`${ESC}[<1mhi`)).toEqual([{ text: 'hi' }]);
    expect(ansiSegments(`${ESC}[1 mhello`)).toEqual([{ text: 'hello' }]);
  });

  it('drops a cut-off escape at the end of the text and one broken by a control byte', () => {
    expect(ansiSegments(`abc${ESC}[31`)).toEqual([{ text: 'abc' }]);
    expect(ansiSegments(`abc${ESC}`)).toEqual([{ text: 'abc' }]);
    expect(ansiSegments(`a${ESC}[3\nb`)).toEqual([{ text: 'a' }, { text: '\nb' }]);
    expect(ansiSegments(`${ESC}(Bx${ESC}7y${ESC}cz`)).toEqual([
      { text: 'x' },
      { text: 'y' },
      { text: 'z' }
    ]);
  });

  it('drops DCS, SOS, PM, and APC strings with their payload', () => {
    expect(ansiSegments(`${ESC}P1$r0m${ESC}\\hi`)).toEqual([{ text: 'hi' }]);
    expect(ansiSegments(`a${ESC}Xsos${ESC}\\b${ESC}^pm\u0007c${ESC}_apc`)).toEqual([
      { text: 'a' },
      { text: 'b' },
      { text: 'c' }
    ]);
  });

  it('reads colon subparameters as one parameter each', () => {
    expect(ansiSegments(`${ESC}[1;38:2::255:0:0mbold`)).toEqual([{ text: 'bold', bold: true }]);
    expect(ansiSegments(`${ESC}[4:3mcurly${ESC}[4:0m plain`)).toEqual([
      { text: 'curly', underline: true },
      { text: ' plain' }
    ]);
    expect(ansiSegments(`${ESC}[31;4:0mred`)).toEqual([{ text: 'red', fg: 'red' }]);
  });

  it('skips the underline colour whole in either form', () => {
    expect(ansiSegments(`${ESC}[58;2;1;3;4mx${ESC}[58:5:1;2my${ESC}[58;5;3mz`)).toEqual([
      { text: 'x' },
      { text: 'y', dim: true },
      { text: 'z', dim: true }
    ]);
  });

  it('reads an extended colour mode written with a leading zero', () => {
    expect(ansiSegments(`${ESC}[38;02;1;2;3mx${ESC}[48;05;3my`)).toEqual([
      { text: 'x' },
      { text: 'y' }
    ]);
  });

  it('reads the 8-bit forms: a CSI, control strings, and their terminator', () => {
    const csi = '\u009b';
    const st = '\u009c';
    // An 8-bit CSI applies its SGR; an 8-bit OSC and DCS drop their payload.
    expect(ansiSegments(`${csi}31mred${csi}0m plain`)).toEqual([
      { text: 'red', fg: 'red' },
      { text: ' plain' }
    ]);
    expect(ansiSegments(`a\u009d0;title${st}b\u0090q payload${st}c`)).toEqual([
      { text: 'a' },
      { text: 'b' },
      { text: 'c' }
    ]);
    // A 7-bit OSC ended by the 8-bit terminator keeps the words after it.
    expect(ansiSegments(`${ESC}]0;title${st}after`)).toEqual([{ text: 'after' }]);
    // A lone 8-bit control shows nothing.
    expect(ansiSegments(`x\u0085y${st}z`)).toEqual([{ text: 'x' }, { text: 'y' }, { text: 'z' }]);
  });

  it('reads hostile input in linear time', () => {
    const started = performance.now();
    expect(ansiSegments(`${ESC}[`.repeat(100_000) + 'mend')).toEqual([{ text: 'end' }]);
    expect(ansiSegments(`${ESC}[${';'.repeat(1_000_000)}mok`)).toEqual([{ text: 'ok' }]);
    expect(ansiSegments(`${ESC}]`.repeat(100_000) + 'x')).toEqual([]);
    expect(ansiSegments('\u009b'.repeat(100_000) + 'mend')).toEqual([{ text: 'end' }]);
    expect(ansiSegments('\u009d'.repeat(100_000) + 'x')).toEqual([]);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
