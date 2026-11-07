/**
 * `Pager`: Begin, Previous, a page menu, Next, and End for a long list;
 * plus the page arithmetic a paged list needs and the page numbers the
 * menu offers.
 */

export { Pager, type PagerProps } from './Pager.js';
export { clampPage, pageCount, pageOf, pageSlice, selectorPages } from './Pager.logic.js';
