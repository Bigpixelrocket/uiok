/*
 * Fuzzy subsequence matching for filtered menus, palettes, and listings.
 *
 * fzf-style scoring: dynamic programming evaluates every valid subsequence, so
 * consecutive runs, word boundaries, and camelCase starts beat a scattered
 * match that happens to begin earlier. Anchoring on the first occurrence alone
 * (fzf's simple algorithm) would score `config` against
 * `components/config.ts` across the first word instead of on the real one.
 * Positions come back with the score because a row marks exactly the
 * characters the query hit (`MarkedText`).
 *
 * Case folding is per UTF-16 code unit, never per string, so a matched
 * position always indexes the candidate as written.
 */

/** Every matched character earns this before bonuses, so any match scores above zero. */
const BASE = 16;

/** An adjacent pair reads as one word and must outrank the same characters scattered. */
const BONUS_CONSECUTIVE = 8;

/** The first character, or one following a separator, starts a word. */
const BONUS_BOUNDARY = 14;

/** A lowercase-to-uppercase step starts a word inside a camelCase name. */
const BONUS_CAMEL = 12;

/** Opening a gap costs more than widening one, so runs stay together. */
const PENALTY_GAP_START = 3;

/** Each further skipped character inside an open gap. */
const PENALTY_GAP_EXTENSION = 1;

/** The score of a candidate the query does not match. */
const NO_MATCH = Number.NEGATIVE_INFINITY;

/** A cell no subsequence reaches. Real scores stay far above it. */
const UNREACHED = -(2 ** 30);

/** Where a query hit a candidate, and how well. */
export interface FuzzyMatch {
  /** Higher is better; zero for an empty query or one that only excludes. */
  readonly score: number;
  /** UTF-16 code unit indices into the candidate the query matched, ascending. */
  readonly positions: readonly number[];
}

interface CaseTables {
  /** The lowercase form of each code unit, or the unit itself when it has no single-unit one. */
  readonly fold: Uint16Array;
  /** 1 for a cased code unit that is already uppercase; 0 for digits and punctuation. */
  readonly upper: Uint8Array;
}

let caseTablesCache: CaseTables | null = null;

const caseTables = (): CaseTables => {
  if (caseTablesCache !== null) return caseTablesCache;

  const fold = new Uint16Array(65536);
  const upper = new Uint8Array(65536);

  for (let unit = 0; unit < 65536; unit += 1) {
    const character = String.fromCharCode(unit);
    const lower = character.toLowerCase();
    fold[unit] = lower.length === 1 ? lower.charCodeAt(0) : unit;
    upper[unit] = character === character.toUpperCase() && character !== lower ? 1 : 0;
  }

  caseTablesCache = { fold, upper };
  return caseTablesCache;
};

/** Characters that end a word in a name or a path: `/ \ - _ .` and space. */
const isSeparator = (unit: number): boolean =>
  unit === 47 || unit === 92 || unit === 45 || unit === 95 || unit === 46 || unit === 32;

/**
 * How one term reads a candidate: `fuzzy` is a subsequence scored by the
 * dynamic program, `contains` (`'text`) a contiguous run anywhere, `prefix`
 * (`^text`) and `suffix` (`text$`) a run at one end, and `equals` (`^text$`)
 * the whole candidate.
 */
type TermKind = 'fuzzy' | 'contains' | 'prefix' | 'suffix' | 'equals';

/** One fzf-style query term after its operators have been removed. */
interface CompiledTerm {
  readonly kind: TermKind;
  readonly negative: boolean;
  /** Whether the candidate is lowercased before comparing: fzf's smart case. */
  readonly fold: boolean;
  readonly needle: Uint16Array;
}

/** A query parsed once, ready to be matched against any number of candidates. */
interface CompiledQuery {
  readonly terms: readonly CompiledTerm[];
  readonly positiveTerms: number;
}

const literalScore = (length: number): number =>
  BASE * length + BONUS_CONSECUTIVE * Math.max(0, length - 1);

/**
 * Parses the compact query syntax; whitespace means AND. `!` negates, `'`
 * asks for a contiguous run, `^` and `$` anchor. A lowercase term ignores
 * case and a single uppercase character makes that term case-sensitive.
 */
const compileQuery = (query: string): CompiledQuery => {
  const terms: CompiledTerm[] = [];
  let positiveTerms = 0;

  for (const raw of query.trim().split(/\s+/u)) {
    let text = raw;
    const negative = text.startsWith('!');
    if (negative) text = text.slice(1);
    const exact = text.startsWith("'");
    if (exact) text = text.slice(1);
    const anchoredStart = text.startsWith('^');
    if (anchoredStart) text = text.slice(1);
    const anchoredEnd = text.endsWith('$');
    if (anchoredEnd) text = text.slice(0, -1);
    if (text === '') continue;

    const kind: TermKind =
      anchoredStart && anchoredEnd
        ? 'equals'
        : anchoredStart
          ? 'prefix'
          : anchoredEnd
            ? 'suffix'
            : exact
              ? 'contains'
              : 'fuzzy';
    // Indexed, not iterated: iterating a string yields code points, which would
    // drop the second half of every character outside the basic plane.
    const needle = new Uint16Array(text.length);
    for (let index = 0; index < text.length; index += 1) needle[index] = text.charCodeAt(index);

    // A folding term is already lowercase, so its needle needs no folding.
    terms.push({ kind, negative, fold: text === text.toLowerCase(), needle });
    if (!negative) positiveTerms += 1;
  }

  return { terms, positiveTerms };
};

/**
 * Whether a query holds a term once parsed; whitespace and bare operators
 * (`!`, `'`, `^`, `$`) carry none. A filter treats a query without terms as
 * no filter at all.
 */
export const hasQueryTerms = (query: string): boolean => compileQuery(query).terms.length > 0;

/**
 * Whether the query excludes with `!`. Every other operator only narrows as
 * characters are added, but a negative term widens again as it grows: `!f`
 * excludes more names than `!foo`, so an empty result midway is not a dead
 * end (`menuQueryRefused`).
 */
export const hasNegativeTerms = (query: string): boolean =>
  compileQuery(query).terms.some((term) => term.negative);

/**
 * A typed array's cell at an index the loops below keep in range, which the
 * compiler's indexed-access check cannot see.
 */
const cell = (cells: ArrayLike<number>, index: number): number => cells[index] as number;

let previousRow = new Int32Array(256);
let currentRow = new Int32Array(256);
let parentCells = new Int32Array(1024);

/**
 * Scores a subsequence term, or `NO_MATCH`. The dynamic program retains the
 * highest score for every possible last position; its running gap maximum
 * makes the gap transition linear in candidate length instead of comparing
 * every pair of positions. Rows are reused, so scoring allocates nothing, and
 * the parent links behind the positions are kept only when a caller asks.
 */
const scoreSubsequence = (
  term: CompiledTerm,
  text: Uint16Array,
  length: number,
  positions: number[] | null
): number => {
  const needle = term.needle;
  const needleLength = needle.length;
  if (needleLength > length) return NO_MATCH;

  if (previousRow.length < length) {
    previousRow = new Int32Array(length * 2);
    currentRow = new Int32Array(length * 2);
  }
  if (positions !== null && parentCells.length < needleLength * length) {
    parentCells = new Int32Array(needleLength * length * 2);
  }

  const tables = caseTables();
  const fold = term.fold ? tables.fold : null;
  const upper = tables.upper;
  let previous = previousRow;
  let current = currentRow;

  for (let needleIndex = 0; needleIndex < needleLength; needleIndex += 1) {
    const wanted = cell(needle, needleIndex);
    let bestGapValue = UNREACHED;
    let bestGapIndex = -1;
    let reached = false;

    for (let index = 0; index < length; index += 1) {
      const gapIndex = index - 2;
      if (needleIndex > 0 && gapIndex >= 0 && cell(previous, gapIndex) > UNREACHED) {
        const value = cell(previous, gapIndex) + gapIndex * PENALTY_GAP_EXTENSION;
        if (value > bestGapValue) {
          bestGapValue = value;
          bestGapIndex = gapIndex;
        }
      }

      const unit = cell(text, index);
      if ((fold === null ? unit : cell(fold, unit)) !== wanted) {
        current[index] = UNREACHED;
        continue;
      }

      const before = index === 0 ? 47 : cell(text, index - 1);
      const characterScore = isSeparator(before)
        ? BASE + BONUS_BOUNDARY
        : cell(upper, unit) === 1 && cell(upper, before) === 0
          ? BASE + BONUS_CAMEL
          : BASE;
      let score = UNREACHED;
      let parent = -1;

      if (needleIndex === 0) {
        score = characterScore;
      } else {
        if (bestGapIndex >= 0) {
          score =
            bestGapValue + characterScore - PENALTY_GAP_START - gapIndex * PENALTY_GAP_EXTENSION;
          parent = bestGapIndex;
        }
        if (index > 0 && cell(previous, index - 1) > UNREACHED) {
          const consecutiveScore = cell(previous, index - 1) + characterScore + BONUS_CONSECUTIVE;
          if (consecutiveScore >= score) {
            score = consecutiveScore;
            parent = index - 1;
          }
        }
      }

      current[index] = score;
      if (positions !== null) parentCells[needleIndex * length + index] = parent;
      if (score > UNREACHED) reached = true;
    }

    if (!reached) return NO_MATCH;
    const swap = previous;
    previous = current;
    current = swap;
  }

  let bestIndex = -1;
  let bestScore = UNREACHED;
  for (let index = 0; index < length; index += 1) {
    if (cell(previous, index) > bestScore) {
      bestScore = cell(previous, index);
      bestIndex = index;
    }
  }

  if (positions !== null) {
    const first = positions.length;
    let position = bestIndex;
    for (let needleIndex = needleLength - 1; needleIndex >= 0; needleIndex -= 1) {
      positions[first + needleIndex] = position;
      position = cell(parentCells, needleIndex * length + position);
    }
  }

  return bestScore;
};

/** Where a contiguous term starts in the candidate, or -1. */
const literalStart = (term: CompiledTerm, text: Uint16Array, length: number): number => {
  const needle = term.needle;
  const needleLength = needle.length;
  if (needleLength > length) return -1;

  const fold = term.fold ? caseTables().fold : null;
  const matchesAt = (start: number): boolean => {
    for (let offset = 0; offset < needleLength; offset += 1) {
      const unit = cell(text, start + offset);
      if ((fold === null ? unit : cell(fold, unit)) !== cell(needle, offset)) return false;
    }
    return true;
  };

  switch (term.kind) {
    case 'equals':
      return needleLength === length && matchesAt(0) ? 0 : -1;
    case 'prefix':
      return matchesAt(0) ? 0 : -1;
    case 'suffix':
      return matchesAt(length - needleLength) ? length - needleLength : -1;
    default:
      for (let start = 0; start <= length - needleLength; start += 1) {
        if (matchesAt(start)) return start;
      }
      return -1;
  }
};

/** Scores one term against a candidate, appending its positions when asked. */
const scoreTerm = (
  term: CompiledTerm,
  text: Uint16Array,
  length: number,
  positions: number[] | null
): number => {
  if (term.kind === 'fuzzy') return scoreSubsequence(term, text, length, positions);

  const start = literalStart(term, text, length);
  if (start < 0) return NO_MATCH;
  if (positions !== null) {
    for (let offset = 0; offset < term.needle.length; offset += 1) positions.push(start + offset);
  }
  return literalScore(term.needle.length);
};

let stringUnits = new Uint16Array(256);
let cachedQueryText: string | null = null;
let cachedQuery: CompiledQuery | null = null;

/**
 * Matches one string against a query, or null when it does not match.
 * Whitespace-separated terms are ANDed and their scores summed; `!term`
 * excludes, and `'exact`, `^prefix`, `suffix$`, and `^whole$` switch a term
 * to contiguous matching. A lowercase term ignores case; one with an
 * uppercase character honours it. An empty query (or one that only
 * excludes) matches at zero with no positions, so "no filter" needs no
 * branch. The last query stays compiled, because a list is matched row
 * after row against the same one.
 */
export const matchQuery = (candidate: string, query: string): FuzzyMatch | null => {
  if (cachedQuery === null || cachedQueryText !== query) {
    cachedQuery = compileQuery(query);
    cachedQueryText = query;
  }

  if (stringUnits.length < candidate.length) stringUnits = new Uint16Array(candidate.length * 2);
  for (let index = 0; index < candidate.length; index += 1) {
    stringUnits[index] = candidate.charCodeAt(index);
  }

  const positions: number[] = [];
  let score = 0;

  for (const term of cachedQuery.terms) {
    if (term.negative) {
      if (scoreTerm(term, stringUnits, candidate.length, null) !== NO_MATCH) return null;
      continue;
    }

    const termScore = scoreTerm(term, stringUnits, candidate.length, positions);
    if (termScore === NO_MATCH) return null;
    score += termScore;
  }

  if (cachedQuery.positiveTerms > 1) {
    return { score, positions: [...new Set(positions)].sort((left, right) => left - right) };
  }

  return { score, positions };
};
