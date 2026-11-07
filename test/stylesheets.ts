/**
 * Stylesheets in the test document, for suites that assert on a stylesheet's
 * text or on the cascade. jsdom matches selectors and resolves declared
 * values through `getComputedStyle`, though it lays nothing out, so a suite
 * can check what a rule sets on an element (a placement, an outline) but not
 * where it lands.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { onTestFinished } from 'vitest';

// A path string, not a URL object: under jsdom the global URL is jsdom's own.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const IMPORT = /@import\s+(?:url\()?\s*['"]([^'"]+)['"]\s*\)?\s*;/g;

/**
 * The text of a stylesheet under the repository root (`src/button/button.css`),
 * with each relative `@import` replaced by the imported sheet's text, at any
 * depth, so `readStylesheet('src/styles.css')` is the whole of what
 * `@bigpixelrocket/uiok/styles.css` delivers. jsdom does not follow `@import` in a `<style>`
 * element, so a cascade test reads sheets through here.
 */
export function readStylesheet(path: string): string {
  const file = join(ROOT, path);

  return readFileSync(file, 'utf8').replace(IMPORT, (_, imported: string) =>
    readStylesheet(relative(ROOT, join(dirname(file), imported)))
  );
}

/** The relative `@import` targets a stylesheet names directly, as written, in order. */
export function stylesheetImports(path: string): string[] {
  return [...readFileSync(join(ROOT, path), 'utf8').matchAll(IMPORT)].map(
    ([, imported]) => imported as string
  );
}

/**
 * Adds the given stylesheet texts to the document for the rest of the running
 * test, in order, so later sheets win ties as they do in an app; they are
 * removed when the test finishes.
 */
export function applyStylesheets(...sheets: readonly string[]): void {
  const style = document.createElement('style');

  style.textContent = sheets.join('\n');
  document.head.append(style);
  onTestFinished(() => style.remove());
}

/**
 * Whether `element` matches `selector`, false for a selector jsdom cannot
 * read. `:focus-visible` is read as `:focus`: jsdom has no keyboard modality
 * to tell them apart, and its own answer changes from one call to the next.
 */
const matchesSafely = (element: Element, selector: string): boolean => {
  try {
    return element.matches(selector.replaceAll(':focus-visible', ':focus'));
  } catch {
    return false;
  }
};

/**
 * What the document's top-level style rules that match `element` in its
 * current state (focus included, as from the keyboard) declare for
 * `property`, in source order. For a value `getComputedStyle` cannot resolve
 * in jsdom, such as an `outline` shorthand holding `var()`: a suite asserts
 * that no rule removes it, or that one draws it.
 */
export function declaredValues(element: Element, property: string): string[] {
  return [...document.styleSheets]
    .flatMap((sheet) => [...sheet.cssRules])
    .filter(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule && matchesSafely(element, rule.selectorText)
    )
    .map((rule) => rule.style.getPropertyValue(property))
    .filter((value) => value !== '');
}
