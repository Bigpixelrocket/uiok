import { describe, expect, it } from 'vitest';

import { highlightSegments } from '../text/highlightSegments.js';
import { hasNegativeTerms, hasQueryTerms, matchQuery } from './fuzzyMatch.js';

/** Score a candidate, failing the test rather than returning null. */
const scoreOf = (candidate: string, query: string): number => {
  const match = matchQuery(candidate, query);

  expect(match, `${query} should match ${candidate}`).not.toBeNull();

  return match?.score ?? 0;
};

describe('matchQuery', () => {
  it('treats an empty query as matching everything at zero', () => {
    expect(matchQuery('AppSettings.ts', '')).toEqual({ score: 0, positions: [] });
  });

  it('matches a subsequence and reports where it hit', () => {
    expect(matchQuery('navigable.css', 'nvc')?.positions).toEqual([0, 2, 10]);
  });

  it('rejects a query that is not a subsequence', () => {
    expect(matchQuery('navigable.css', 'xyz')).toBeNull();
    // Order matters: both characters are present, but not in this sequence.
    expect(matchQuery('abc', 'ca')).toBeNull();
  });

  it('ignores case for a lowercase query and honors it once the query has uppercase', () => {
    expect(matchQuery('NavigableSettings.ts', 'navset')).not.toBeNull();
    expect(matchQuery('navigablesettings.ts', 'navSet')).toBeNull();
  });

  it('ranks a consecutive run above the same characters scattered', () => {
    expect(scoreOf('navigable', 'nav')).toBeGreaterThan(scoreOf('nDaDvDaD', 'nav'));
  });

  it('ranks a word start above a match inside a word', () => {
    expect(scoreOf('use-config.ts', 'config')).toBeGreaterThan(
      scoreOf('unconfigured.ts', 'config')
    );
  });

  it('ranks a camelCase start above a match inside a word', () => {
    expect(scoreOf('useNavigableSettings', 'set')).toBeGreaterThan(
      scoreOf('unsettledvalues', 'set')
    );
  });

  it('anchors on the best window, not the first one the query could start at', () => {
    // Anchoring on the leading "c" would scatter the match across
    // "components"; the standalone word must win.
    expect(matchQuery('components/config.ts', 'config')?.positions).toEqual([
      11, 12, 13, 14, 15, 16
    ]);
  });

  it('chooses the highest-scoring complete subsequence after an anchor', () => {
    expect(matchQuery('abXXXXBc', 'abc')?.positions).toEqual([0, 6, 7]);
  });

  it('ANDs whitespace-separated fuzzy terms and merges their positions', () => {
    expect(matchQuery('NavigableSettingsPanel.tsx', 'nav panel')?.positions).toEqual([
      0, 1, 2, 17, 18, 19, 20, 21
    ]);
    expect(matchQuery('NavigableSettingsPanel.tsx', 'nav missing')).toBeNull();
  });

  it('supports exact, prefix, suffix, and whole-candidate terms', () => {
    expect(matchQuery('navigable-find.ts', "'find")?.positions).toEqual([10, 11, 12, 13]);
    expect(matchQuery('navigable-find.ts', '^nav')).not.toBeNull();
    expect(matchQuery('navigable-find.ts', 'find.ts$')).not.toBeNull();
    expect(matchQuery('navigable-find.ts', '^navigable-find.ts$')).not.toBeNull();
    expect(matchQuery('pre-navigable-find.ts', '^nav')).toBeNull();
    expect(matchQuery('navigable-find.ts', '^navigable$')).toBeNull();
  });

  it('rejects candidates matching a negated term and allows negative-only queries', () => {
    expect(matchQuery('navigable.test.ts', 'nav !test')).toBeNull();
    expect(matchQuery('navigable.ts', 'nav !test')).not.toBeNull();
    expect(matchQuery('navigable.ts', '!test')).toEqual({ score: 0, positions: [] });
    // A negated anchored term excludes only where its anchor holds.
    expect(matchQuery('test-nav.ts', '!^nav')).not.toBeNull();
    expect(matchQuery('nav-test.ts', '!^nav')).toBeNull();
    // A negated exact term excludes a contiguous hit only, not a scattered one.
    expect(matchQuery('navigable.ts', "!'vig")).toBeNull();
    expect(matchQuery('navigable.ts', "!'nvg")).not.toBeNull();
    // A negated suffix term excludes only at the end.
    expect(matchQuery('nav-test.ts', '!.ts$')).toBeNull();
    expect(matchQuery('nav.ts-test', '!.ts$')).not.toBeNull();
  });

  it('applies smart case after removing query operators', () => {
    expect(matchQuery('Navigable.ts', '^nav')).not.toBeNull();
    expect(matchQuery('navigable.ts', '^Nav')).toBeNull();
  });

  it('folds case one code unit at a time, so positions index the name as written', () => {
    // A whole-string lowercase would lengthen the first character and shift every later hit.
    expect(matchQuery('İstanbul.txt', 'txt')?.positions).toEqual([9, 10, 11]);
    expect(matchQuery('ÉCOLE', 'école')?.positions).toEqual([0, 1, 2, 3, 4]);
  });

  it('matches a character outside the basic plane by both of its code units', () => {
    // 😀 and 😁 share their first code unit and differ in the second.
    expect(matchQuery('a😀b', '😀')?.positions).toEqual([1, 2]);
    expect(matchQuery('a😁b', '😀')).toBeNull();
    expect(matchQuery('a😀b', "'😀b")?.positions).toEqual([1, 2, 3]);
    expect(matchQuery('😀', '^😀$')?.positions).toEqual([0, 1]);
    expect(matchQuery('😀.txt', '^😀')).not.toBeNull();
    expect(matchQuery('note-😀', '😀$')?.positions).toEqual([5, 6]);
    expect(matchQuery('a😀b', '!😀')).toBeNull();
    expect(matchQuery('a😁b', '!😀')).not.toBeNull();
    expect(highlightSegments('a😀b', matchQuery('a😀b', '😀')?.positions ?? [])).toEqual([
      { text: 'a', hit: false },
      { text: '😀', hit: true },
      { text: 'b', hit: false }
    ]);
  });

  it('matches a candidate longer than its reused buffers', () => {
    const long = `${'x'.repeat(600)}needle`;

    expect(matchQuery(long, 'needle')?.positions).toEqual([600, 601, 602, 603, 604, 605]);
  });
});

describe('query terms', () => {
  it('tells queries with terms and with exclusions apart from empty ones', () => {
    expect(hasQueryTerms('  ')).toBe(false);
    expect(hasQueryTerms("!' ^$")).toBe(false);
    expect(hasQueryTerms('a')).toBe(true);
    expect(hasNegativeTerms('src !test')).toBe(true);
    expect(hasNegativeTerms('src test')).toBe(false);
  });
});
