/** The eight ANSI colours by name, in SGR order (30–37, 40–47; 90–97 and 100–107 are the same names). */
export const ANSI_COLOURS = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white'
] as const;

/** One of the eight ANSI colours. */
export type AnsiColour = (typeof ANSI_COLOURS)[number];

/** A run of text in one style. */
export interface AnsiSegment {
  readonly text: string;
  /** Its foreground colour; the line's own when absent. */
  readonly fg?: AnsiColour;
  /** Its background colour: a filled run (an `INFO` badge). */
  readonly bg?: AnsiColour;
  readonly bold?: boolean;
  readonly dim?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
}

interface Style {
  fg?: AnsiColour;
  bg?: AnsiColour;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  inverse?: boolean;
}

const ESC = 0x1b;
const BEL = 0x07;
/** The 8-bit string terminator (ST), the one-byte form of `ESC \`. */
const ST = 0x9c;
/** The 8-bit CSI, the one-byte form of `ESC [`. */
const CSI = 0x9b;
/** The 8-bit control-string introducers: DCS, SOS, OSC, PM, APC (`ESC P`, `X`, `]`, `^`, `_`). */
const STRING_INTRODUCERS: ReadonlySet<number> = new Set([0x90, 0x98, 0x9d, 0x9e, 0x9f]);
/** Where a sequence or a control may start: `ESC`, or any 8-bit control (C1). */
// The escape and the 8-bit controls are what the pattern exists to find.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u001b\u0080-\u009f]/g;

/** Whether `code` lies in the inclusive byte range `low`–`high`. */
function within(code: number, low: number, high: number): boolean {
  return code >= low && code <= high;
}

/** Index of the first byte at or after `from` that is not in `low`–`high`. */
function skipRange(text: string, from: number, low: number, high: number): number {
  let at = from;
  while (at < text.length && within(text.charCodeAt(at), low, high)) at += 1;
  return at;
}

/**
 * The end of a control string (OSC, DCS, SOS, PM, APC) whose payload starts
 * at `from`: past its BEL or ST (`ESC \` or the 8-bit ST), at an escape
 * that starts the next sequence, or at the end of the text when it never
 * ends. Any other byte, an 8-bit control included, is payload (SOS may
 * carry anything but SOS and ST), so none of it shows.
 */
function controlStringEnd(text: string, from: number): number {
  for (let at = from; at < text.length; at += 1) {
    const code = text.charCodeAt(at);
    if (code === BEL || code === ST) return at + 1;
    if (code === ESC) return text.charCodeAt(at + 1) === 0x5c ? at + 2 : at;
  }
  return text.length;
}

/** One sequence read at an `ESC` or an 8-bit control: where it ends, and the SGR parameters when it is one. */
interface Escape {
  readonly end: number;
  readonly sgr?: string;
}

/**
 * Reads the sequence starting at the `ESC` or 8-bit control at `start`,
 * after ECMA-48: a CSI (`ESC [` or its 8-bit form, parameter bytes `0`–`?`,
 * intermediate bytes space–`/`, a final byte `@`–`~`); an OSC (`ESC ]`) or
 * DCS, SOS, PM, or APC (`ESC P`, `X`, `^`, `_`), or their 8-bit forms, a
 * string to BEL or ST; any other escape (intermediates then one final
 * byte); or a lone 8-bit control, dropped alone. A sequence cut off by the end of the text runs to
 * the end; one broken by a control byte ends before it, so the `ESC` never
 * shows. Only a CSI ending in `m`, with no intermediate and no private
 * marker (`<`, `=`, `>`, `?`), is an SGR.
 */
function readEscape(text: string, start: number): Escape {
  const lead = text.charCodeAt(start);

  // The 8-bit forms: a CSI, a control string, or a lone control.
  if (lead === CSI) return readCsi(text, start + 1);
  if (STRING_INTRODUCERS.has(lead)) return { end: controlStringEnd(text, start + 1) };
  if (lead !== ESC) return { end: start + 1 };

  const kind = text.charCodeAt(start + 1);

  if (kind === 0x5b) return readCsi(text, start + 2);
  if (kind === 0x5d || kind === 0x50 || kind === 0x58 || kind === 0x5e || kind === 0x5f) {
    return { end: controlStringEnd(text, start + 2) };
  }

  const intermediatesEnd = skipRange(text, start + 1, 0x20, 0x2f);
  if (intermediatesEnd >= text.length) return { end: text.length };
  return within(text.charCodeAt(intermediatesEnd), 0x30, 0x7e)
    ? { end: intermediatesEnd + 1 }
    : { end: intermediatesEnd };
}

/** Reads a CSI whose parameters start at `from` (after `ESC [` or the 8-bit CSI). */
function readCsi(text: string, from: number): Escape {
  const parametersEnd = skipRange(text, from, 0x30, 0x3f);
  const intermediatesEnd = skipRange(text, parametersEnd, 0x20, 0x2f);
  if (intermediatesEnd >= text.length) return { end: text.length };
  const final = text.charCodeAt(intermediatesEnd);
  if (!within(final, 0x40, 0x7e)) return { end: intermediatesEnd };
  const parameters = text.slice(from, parametersEnd);
  const sgr =
    final === 0x6d && intermediatesEnd === parametersEnd && !/[<=>?]/.test(parameters)
      ? parameters
      : undefined;
  return sgr === undefined ? { end: intermediatesEnd + 1 } : { end: intermediatesEnd + 1, sgr };
}

/**
 * Applies one SGR's parameters to `style`. Parameters split on `;`; a
 * group joined by `:` is one parameter with subparameters (`4:3` is a
 * curly underline, `4:0` underline off, `38:2::r:g:b` a colour). Extended colours (38, 48, and
 * the underline colour 58) name no ANSI colour, so each is skipped whole,
 * in either form; any other colon group but underline's is ignored.
 */
function applySgr(style: Style, parameters: string): Style {
  const groups = parameters.split(';');
  let next: Style = { ...style };

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index] ?? '';

    if (group.includes(':')) {
      const [main, kind] = group.split(':', 2).map((part) => Number(part || 0));
      if (main === 4 && kind === 0) next.underline = false;
      else if (main === 4 && kind !== undefined && kind >= 1 && kind <= 5) next.underline = true;
      continue;
    }

    const code = Number(group || 0);
    if (code === 38 || code === 48 || code === 58) {
      // 38;5;n or 38;2;r;g;b: the colour is the theme's to choose, so it is skipped whole.
      // The mode is a number, so `02` is `2`.
      const mode = Number(groups[index + 1] ?? '');
      index += mode === 5 ? 2 : mode === 2 ? 4 : 1;
      continue;
    }
    if (code === 0) next = {};
    else if (code === 1) next.bold = true;
    else if (code === 2) next.dim = true;
    else if (code === 3) next.italic = true;
    else if (code === 4) next.underline = true;
    else if (code === 7) next.inverse = true;
    else if (code === 22) next = { ...next, bold: false, dim: false };
    else if (code === 23) next.italic = false;
    else if (code === 24) next.underline = false;
    else if (code === 27) next.inverse = false;
    else if (code === 39) delete next.fg;
    else if (code === 49) delete next.bg;
    else if ((code >= 30 && code <= 37) || (code >= 90 && code <= 97)) {
      next.fg = ANSI_COLOURS[code % 10];
    } else if ((code >= 40 && code <= 47) || (code >= 100 && code <= 107)) {
      next.bg = ANSI_COLOURS[code % 10];
    }
  }

  return next;
}

/** A segment of `text` in `style`, with inverse turned into a filled run and unset flags left out. */
function segment(text: string, style: Style): AnsiSegment {
  const fg = style.inverse ? style.bg : style.fg;
  const bg = style.inverse ? (style.fg ?? 'white') : style.bg;

  return {
    text,
    ...(fg === undefined ? {} : { fg }),
    ...(bg === undefined ? {} : { bg }),
    ...(style.bold === true ? { bold: true } : {}),
    ...(style.dim === true ? { dim: true } : {}),
    ...(style.italic === true ? { italic: true } : {}),
    ...(style.underline === true ? { underline: true } : {})
  };
}

/**
 * A log line's text as runs of one style each, read from its SGR escape
 * sequences: the eight colours and their bright forms (as the same name),
 * backgrounds, bold, dim, italic, underline, and inverse, each reset as
 * SGR resets it, in the 7-bit form (`ESC [`) or the 8-bit one. Extended
 * colours (256 and true colour) are skipped, and every other escape
 * sequence, control string, 8-bit control, and cut-off escape is dropped, so the runs hold printable text alone. A line with no escape is
 * one plain run. Linear in the text's length, and pure: the text is never
 * read as markup.
 */
export function ansiSegments(text: string): readonly AnsiSegment[] {
  const segments: AnsiSegment[] = [];
  let style: Style = {};
  let at = 0;

  while (at < text.length) {
    CONTROL.lastIndex = at;
    const escape = CONTROL.exec(text)?.index ?? -1;
    const textEnd = escape === -1 ? text.length : escape;
    if (textEnd > at) segments.push(segment(text.slice(at, textEnd), style));
    if (escape === -1) break;
    const read = readEscape(text, escape);
    if (read.sgr !== undefined) style = applySgr(style, read.sgr);
    at = read.end;
  }

  return segments;
}
