/**
 * Renders the repository's markdown (docs/**), which the site imports as raw
 * text, so docs/ stays the one source of every word the site explains. A
 * link to another doc becomes the site's route for it; a link to any other
 * file in the repository opens it on GitHub.
 *
 * The markdown is the repository's own, reviewed with the code, so its HTML
 * is set without sanitising.
 */

import { Marked, type Tokens } from 'marked';
import { useMemo } from 'react';

const REPOSITORY = 'https://github.com/Bigpixelrocket/uiok/blob/main/';

/** Routes for docs that are pages of their own; component docs route by area. */
const DOC_ROUTES: Readonly<Record<string, string>> = {
  'docs/themes.md': '#/theming',
  'docs/labels.md': '#/labels',
  'docs/components/keyboard.md': '#/keyboard'
};

/** `href` written in the doc at `from` (a repository path), as the site links it. */
function siteHref(href: string, from: string): string {
  if (/^[a-z]+:|^#/i.test(href)) return href;
  const [path = '', anchor] = href.split('#');
  const resolved = new URL(path, `https://repo.invalid/${from}`).pathname.slice(1);
  const route = DOC_ROUTES[resolved];
  if (route !== undefined) return route;
  const area = /^docs\/components\/([a-z]+)\.md$/.exec(resolved)?.[1];
  if (area !== undefined) return `#/components/${area}`;
  return `${REPOSITORY}${resolved}${anchor === undefined ? '' : `#${anchor}`}`;
}

/** Markdown text as HTML, its links rewritten for the doc at `from`. */
export function markdownHtml(text: string, from: string): string {
  const marked = new Marked({
    gfm: true,
    walkTokens: (token) => {
      if (token.type === 'link') {
        const link = token as Tokens.Link;
        link.href = siteHref(link.href, from);
      }
    }
  });
  return marked.parse(text, { async: false });
}

/**
 * A doc split around its first second-level heading: the title and the
 * purpose that open it, then the reference after, so a page can put its live
 * demo between the two.
 */
export function splitDoc(text: string): { readonly intro: string; readonly rest: string } {
  const at = text.search(/^## /m);
  return at === -1 ? { intro: text, rest: '' } : { intro: text.slice(0, at), rest: text.slice(at) };
}

/** The doc's title: its first heading without the package path in parentheses. */
export function docTitle(text: string, fallback: string): string {
  const heading = /^# (.+)$/m.exec(text)?.[1];
  if (heading === undefined) return fallback;
  return heading.replace(/\s*\(`[^`]*`\)\s*$/, '').trim();
}

/** Props for {@link Markdown}. */
export interface MarkdownProps {
  /** The markdown text. */
  readonly text: string;
  /** The repository path of the doc it came from, which its relative links start at. */
  readonly from: string;
}

/** A block of rendered markdown in the site's prose style. */
export function Markdown({ text, from }: MarkdownProps) {
  const html = useMemo(() => markdownHtml(text, from), [text, from]);
  return <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />;
}
