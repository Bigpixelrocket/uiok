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

/**
 * Every escape sequence a log line may carry: a CSI sequence (`ESC [`
 * parameters, intermediates, a final byte), an OSC string (`ESC ]` to BEL
 * or ST), or a lone two-byte escape. Only an SGR (`m`) changes the style;
 * every other one is dropped, so a cursor move or a title never shows.
 */
const ESCAPE = new RegExp(
  // The escape, BEL, and ST bytes are what the pattern exists to find.
  // eslint-disable-next-line no-control-regex
  '\u001b(?:\\[([0-9;:?]*)[ -/]*([@-~])|\\][^\u0007\u001b]*(?:\u0007|\u001b\\\\)?|[@-Z\\\\-_])',
  'g'
);

/** Applies one SGR's parameters to `style`, skipping the extended colours (38, 48), which name no ANSI colour. */
function applySgr(style: Style, parameters: string): Style {
  const codes = parameters === '' ? [0] : parameters.split(/[;:]/).map((part) => Number(part || 0));
  let next: Style = { ...style };

  for (let index = 0; index < codes.length; index += 1) {
    const code = codes[index] ?? 0;

    if (code === 38 || code === 48) {
      // 38;5;n or 38;2;r;g;b: the colour is the theme's to choose, so it is skipped whole.
      const mode = codes[index + 1];
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
 * SGR resets it. Extended colours (256 and true colour) are skipped, and
 * every other escape sequence is dropped, so the runs hold printable text
 * alone. A line with no escape is one plain run. Pure: the text is never
 * read as markup.
 */
export function ansiSegments(text: string): readonly AnsiSegment[] {
  const segments: AnsiSegment[] = [];
  let style: Style = {};
  let at = 0;

  for (const match of text.matchAll(ESCAPE)) {
    if (match.index > at) segments.push(segment(text.slice(at, match.index), style));
    if (match[2] === 'm' && !(match[1] ?? '').includes('?'))
      style = applySgr(style, match[1] ?? '');
    at = match.index + match[0].length;
  }
  if (at < text.length) segments.push(segment(text.slice(at), style));

  return segments;
}
