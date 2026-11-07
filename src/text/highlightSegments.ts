/** One run of a text's characters, either all matched or all unmatched. */
export interface HighlightSegment {
  readonly text: string;
  readonly hit: boolean;
}

/**
 * Splits a text into alternating matched and unmatched runs, so a row marks
 * whole runs instead of wrapping every character in its own element.
 * `positions` are the matched UTF-16 code unit indices, ascending, as a
 * fuzzy matcher reports them; a character outside the basic plane is
 * matched by both of its code units, so it lands whole in one run.
 */
export const highlightSegments = (
  text: string,
  positions: readonly number[]
): readonly HighlightSegment[] => {
  if (positions.length === 0) {
    return text === '' ? [] : [{ text, hit: false }];
  }

  const hits = new Set(positions);
  const segments: HighlightSegment[] = [];
  let run = '';
  let runHit = hits.has(0);

  for (let index = 0; index < text.length; index += 1) {
    const hit = hits.has(index);

    if (hit !== runHit && run !== '') {
      segments.push({ text: run, hit: runHit });
      run = '';
    }

    runHit = hit;
    run += text[index] ?? '';
  }

  if (run !== '') {
    segments.push({ text: run, hit: runHit });
  }

  return segments;
};
