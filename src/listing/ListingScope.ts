import { createContext } from 'react';

/**
 * Whether what renders inside stands in the listing scope (`.listing-root`)
 * already: the window frame, a dialog, and a palette provide it, so a
 * `Listing` drawn anywhere else carries the scope itself and keeps its look.
 * Internal; the scope's class is the public contract.
 */
export const ListingScopeContext = createContext(false);
