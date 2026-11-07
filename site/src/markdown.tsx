/**
 * Shows the repository's markdown (docs/**), which `render-docs.ts` renders
 * to HTML at build time with its links already rewritten for the site.
 *
 * The markdown is the repository's own, reviewed with the code, so its HTML
 * is set without sanitising.
 */

/** Props for {@link Markdown}. */
export interface MarkdownProps {
  /** HTML rendered from a doc at build time. */
  readonly html: string;
}

/** A block of rendered markdown in the site's prose style. */
export function Markdown({ html }: MarkdownProps) {
  return <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />;
}
