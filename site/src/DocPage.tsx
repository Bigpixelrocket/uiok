/**
 * A page drawn from one doc: its title and purpose, the area's live demo,
 * then the rest of the doc (props, keyboard, labels).
 */

import type { ComponentType } from 'react';

import type { RenderedDoc } from '../render-docs';
import { Markdown } from './markdown';

/** Props for {@link DocPage}. */
export interface DocPageProps {
  /** The doc, rendered at build time. */
  readonly doc: RenderedDoc;
  /** The live demo, when the area has one. */
  readonly Demo?: ComponentType;
}

/** A doc with its live demo between the purpose and the reference. */
export function DocPage({ doc, Demo }: DocPageProps) {
  return (
    <article className="doc-page">
      <Markdown html={doc.intro} />
      {Demo === undefined ? null : (
        <section aria-label="Live demo" className="demo">
          <header className="demo-head">
            <span className="demo-tag">live</span>
            <span className="demo-source">{doc.from}</span>
          </header>
          <div className="demo-stage">
            <Demo />
          </div>
        </section>
      )}
      <Markdown html={doc.rest} />
    </article>
  );
}
