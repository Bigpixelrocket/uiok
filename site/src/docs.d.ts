/**
 * A `?doc` import of a markdown file under docs/: the doc rendered to HTML
 * at build time by the `renderedDocs` plugin in `render-docs.ts`.
 */
declare module '*.md?doc' {
  const doc: import('../render-docs').RenderedDoc;
  export default doc;
}
