/*
 * Lines that name a file or a folder, cut so the name keeps its end: when a
 * line runs out of room, a long name gives way in its middle
 * ("Better.Call.Saul…CtrlHD.mkv" already exists). What follows the name
 * (` to "Seedbox"`, ` already exists in Downloads`, ` as administrator`)
 * gives way at its end, alongside the name, so the name's end and the words
 * right after it stay in view as long as they can. The words before the
 * name give way at their end only once both have gone as far as they go,
 * and the name's tail, at its front, only once those words have too, so
 * the line always ends in view and nothing is clipped without an ellipsis.
 * A short name ("Breaking Bad") is never
 * cut in its middle: it reads as words, and the words after it give way
 * first. The parts are drawn by `NameCut`; the cut itself is CSS
 * (`namecut.css`), so it follows the width the line has.
 */

/**
 * One run of a line: words, which give way at their end (the line's last
 * alongside a name's head, any others only after both); or a long name,
 * whose head gives way and whose tail, its closing quote included, stays
 * until everything before it has given way.
 */
export type CutPart =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'name'; readonly head: string; readonly tail: string };

/** The longest name kept whole: one this short reads better whole than cut. */
const SHORT_NAME_LENGTH = 20;

/** The fewest characters a cut name keeps after its ellipsis. */
const MINIMUM_TAIL_LENGTH = 10;

/**
 * The most characters a cut name keeps after its ellipsis, so a long run
 * after a name's last dot ("v1.2 final deck for the board…") is not kept
 * whole as if it were an extension, and the tail fits the lines that cut
 * a name before it has to give way itself.
 */
const MAXIMUM_TAIL_LENGTH = 24;

/**
 * A name split for a cut in its middle: the head gives way to an ellipsis
 * when space runs out, and the tail stays until the rest of its line has
 * given way. The tail is the
 * extension and the six characters before it, ten characters at least and
 * twenty-four at most, so "2026-10-17 homepage hero, final (approved by
 * client).mov" reads "2026-10-17 homepag…lient).mov" and a folder's last
 * ten characters stay.
 * A name of at most twenty characters is all tail, so it is never cut.
 */
export function middleCut(name: string): { readonly head: string; readonly tail: string } {
  if (name.length <= SHORT_NAME_LENGTH) return { head: '', tail: name };

  const dot = name.lastIndexOf('.');
  const keep = Math.min(
    Math.max(dot > 0 ? name.length - dot + 6 : 0, MINIMUM_TAIL_LENGTH),
    MAXIMUM_TAIL_LENGTH
  );
  const split = Math.max(name.length - keep, 0);

  return { head: name.slice(0, split), tail: name.slice(split) };
}

/**
 * A closing quote that ends a quoted name: straight, or the closing mark of
 * the languages `labelParts` reads (” “ » «).
 */
const CLOSING_QUOTE = /^["”“»«]/u;

/**
 * A line built from words and names, each `{ name }` cut in its middle:
 * `nameParts(['"', { name }, '" already exists'])`. A cut name keeps its
 * closing quote in its tail, so a quote is never cut on its own. A short
 * name, which is never cut in its middle, joins the words around it, so a
 * line that names only short names is words that give way at their end:
 * the words after the name go first, and the name itself only once they
 * have. Empty words are left out.
 */
export function nameParts(segments: readonly (string | { readonly name: string })[]): CutPart[] {
  const parts: CutPart[] = [];
  const addText = (words: string): void => {
    const last = parts.at(-1);
    let text = words;

    if (last?.kind === 'name') {
      const quote = CLOSING_QUOTE.exec(text)?.[0] ?? '';

      parts[parts.length - 1] = { ...last, tail: last.tail + quote };
      text = text.slice(quote.length);
    }

    if (last?.kind === 'text') {
      parts[parts.length - 1] = { kind: 'text', text: last.text + text };
    } else if (text !== '') {
      parts.push({ kind: 'text', text });
    }
  };

  for (const segment of segments) {
    if (typeof segment === 'string') {
      addText(segment);
      continue;
    }

    const cut = middleCut(segment.name);

    if (cut.head === '') {
      addText(cut.tail);
    } else {
      parts.push({ kind: 'name', ...cut });
    }
  }

  return parts;
}

/**
 * A quoted name in a line: straight quotes, as untranslated labels write them,
 * or the quotation marks of the language a translated line is in: “ ” in
 * English, „ “ or „ ” in German and Polish, « » in French, » « in
 * Slovenian, ” ” in Swedish and Finnish. French spacing inside « » stays
 * with the name.
 */
const QUOTED = /"([^"]+)"|“([^”]+)”|„([^“”]+)[“”]|«([^»]+)»|»([^«]+)«|”([^”]+)”/u;

/**
 * A line that quotes a name (an operation's label, `"name" already
 * exists`), its first quoted name cut in its middle, its closing
 * quote kept with the name's tail, and the rest of the line, later names
 * included, after it as words that give way at their end:
 * `Copying "Better.Call.Saul…CtrlHD.mkv" to "Seed…`. A
 * line that quotes no name gives way at its end, as plain text does.
 */
export function labelParts(line: string): CutPart[] {
  const match = QUOTED.exec(line);

  if (match === null) return [{ kind: 'text', text: line }];

  const opening = match.index + 1;
  const closing = match.index + match[0].length - 1;

  return nameParts([
    line.slice(0, opening),
    { name: match.slice(1).find((name) => name !== undefined) ?? '' },
    line.slice(closing)
  ]);
}

/** The whole line, as assistive technology reads it once. */
export const partsText = (parts: readonly CutPart[]): string =>
  parts.map((part) => (part.kind === 'text' ? part.text : part.head + part.tail)).join('');
