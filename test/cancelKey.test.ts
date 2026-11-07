// @vitest-environment node

/**
 * The gate on the cancel key: Escape is the one key that cancels or leaves,
 * so no library module binds or draws ⌘. (macOS's old Stop chord) as a chord
 * of its own, in a dialog's legend, a palette, or anywhere else.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../src', import.meta.url));

/** Every library module but the tests, by path under `src/`. */
const MODULES: Readonly<Record<string, string>> = Object.fromEntries(
  readdirSync(SRC, { recursive: true, withFileTypes: true })
    .filter(
      (entry) => entry.isFile() && /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
    )
    .map((entry) => {
      const path = join(entry.parentPath, entry.name);
      return [relative(SRC, path), readFileSync(path, 'utf8')];
    })
);

/** A chord written as an object literal on the period key (`{ key: '.', meta: true }`). */
const PERIOD_CHORD = /\{[^{}]*\bkey:\s*['"]\.['"][^{}]*\}/g;

/** Whether a chord literal is Command and the period with no other modifier: ⌘. */
const isCommandPeriod = (literal: string): boolean =>
  /\bmeta:\s*true\b/.test(literal) && !/\b(shift|alt|ctrl):\s*true\b/.test(literal);

describe('the cancel key', () => {
  it('reads every library module', () => {
    expect(Object.keys(MODULES)).toContain(join('keyboard', 'KeyChord.logic.ts'));
  });

  it('finds the chord where it is written', () => {
    const source = "const stop = { key: '.', meta: true };";

    expect(
      [...source.matchAll(PERIOD_CHORD)].map(([literal]) => literal).filter(isCommandPeriod)
    ).toHaveLength(1);
    expect(isCommandPeriod("{ key: '.', meta: true, shift: true }")).toBe(false);
  });

  it('is never ⌘.: no module writes the chord', () => {
    const found = Object.entries(MODULES).flatMap(([path, source]) =>
      [...source.matchAll(PERIOD_CHORD)]
        .map(([literal]) => literal)
        .filter(isCommandPeriod)
        .map((literal) => `${path}: ${literal}`)
    );

    expect(found).toEqual([]);
  });
});
