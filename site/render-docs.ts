/**
 * Renders the repository's markdown (docs/**) to HTML at build time, so
 * docs/ stays the one source of every word the site explains and the browser
 * receives finished HTML instead of a markdown parser. A link to another doc
 * becomes the site's route for it; a link to any other file in the
 * repository opens it on GitHub.
 *
 * A module imports a doc with the `?doc` query
 * (`import doc from '../../docs/labels.md?doc'`, or `import.meta.glob` with
 * `query: '?doc'`) and receives a {@link RenderedDoc}; `src/docs.d.ts`
 * declares that import for TypeScript.
 *
 * The markdown is the repository's own, reviewed with the code, so its HTML
 * is set without sanitising.
 */

import { readFile } from 'node:fs/promises';
import { relative, sep } from 'node:path';

import { Marked, type Tokens } from 'marked';
import type { Plugin } from 'vite';

/** A doc as the site shows it, made at build time from its markdown. */
export interface RenderedDoc {
  /** The doc's repository path, such as `docs/components/menu.md`. */
  readonly from: string;
  /** Its first heading without the package path in parentheses, else the file's name. */
  readonly title: string;
  /**
   * HTML of the title and the purpose that open the doc, up to its first
   * second-level heading, so a page can put its live demo after it.
   */
  readonly intro: string;
  /** HTML of the reference from that heading on; empty when the doc has none. */
  readonly rest: string;
}

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
function markdownHtml(text: string, from: string): string {
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

/** The doc's title: its first heading without the package path in parentheses. */
function docTitle(text: string, fallback: string): string {
  const heading = /^# (.+)$/m.exec(text)?.[1];
  if (heading === undefined) return fallback;
  return heading.replace(/\s*\(`[^`]*`\)\s*$/, '').trim();
}

/** The markdown of the doc at `from` (a repository path), rendered for the site. */
export function renderDoc(text: string, from: string): RenderedDoc {
  const at = text.search(/^## /m);
  const intro = at === -1 ? text : text.slice(0, at);
  const rest = at === -1 ? '' : text.slice(at);
  const name = /([^/]+)\.md$/.exec(from)?.[1] ?? from;
  return {
    from,
    title: docTitle(text, name),
    intro: markdownHtml(intro, from),
    rest: markdownHtml(rest, from)
  };
}

/**
 * The Vite plugin behind `?doc` imports: it loads a markdown file under the
 * repository at `repo` (an absolute path) as a module whose default export
 * is its {@link RenderedDoc}. Vite watches the file, so `site:dev` reloads a
 * page when its doc changes.
 */
export function renderedDocs(repo: string): Plugin {
  return {
    name: 'uiok-rendered-docs',
    enforce: 'pre',
    async load(id) {
      const [file = '', query = ''] = id.split('?', 2);
      if (!file.endsWith('.md') || !new URLSearchParams(query).has('doc')) return null;
      const from = relative(repo, file).split(sep).join('/');
      if (from.startsWith('..')) throw new Error(`${file} is outside the repository.`);
      this.addWatchFile(file);
      const doc = renderDoc(await readFile(file, 'utf8'), from);
      return { code: `export default ${JSON.stringify(doc)};`, map: null };
    }
  };
}
