/**
 * Render economy: an external value store for `useSyncExternalStore`, data
 * equality for `memo`, stable handler identities, and kept list items.
 */

export { keepUnchangedBy, keepUnchangedById } from './KeepUnchanged.logic.js';
export { sameData, sameProps } from './SameProps.js';
export { useStableHandlers } from './useStableHandlers.js';
export { createValueStore, unheard, type ValueStore } from './ValueStore.js';
