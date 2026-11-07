/**
 * A page drawn from one doc: its title and purpose, the area's live demo,
 * then the rest of the doc (props, keyboard, labels).
 */

import type { ComponentType } from 'react';

import { Markdown, splitDoc } from './markdown';

/** Props for {@link DocPage}. */
export interface DocPageProps {
  /** The doc's markdown. */
  readonly text: string;
  /** Its repository path, which its relative links start at. */
  readonly from: string;
  /** The live demo, when the area has one. */
  readonly Demo?: ComponentType;
}

/** A doc with its live demo between the purpose and the reference. */
export function DocPage({ text, from, Demo }: DocPageProps) {
  const { intro, rest } = splitDoc(text);
  return (
    <article className="doc-page">
      <Markdown from={from} text={intro} />
      {Demo === undefined ? null : (
        <section aria-label="Live demo" className="demo">
          <header className="demo-head">
            <span className="demo-tag">live</span>
            <span className="demo-source">{from}</span>
          </header>
          <div className="demo-stage">
            <Demo />
          </div>
        </section>
      )}
      <Markdown from={from} text={rest} />
    </article>
  );
}
