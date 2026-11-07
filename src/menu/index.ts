/**
 * Filtered menus: the fuzzy matcher (`matchQuery`), the rules every filtered
 * menu and palette shares (a refused keystroke, the cursor's moves, the trail
 * of levels opened in place), the visual bell's beat, and the menu look in
 * menu.css under `.listing-root`.
 */

export { hasNegativeTerms, hasQueryTerms, matchQuery, type FuzzyMatch } from './fuzzyMatch.js';
export {
  enteredLevel,
  leftLevel,
  menuQueryRefused,
  movedPickableCursor,
  moveMenuCursor,
  pickableCursor,
  returnedCursor,
  trailLevel,
  type LevelReturn,
  type LevelStep,
  type PickableRow
} from './MenuQuery.logic.js';
export { useBellBeat } from './useBellBeat.js';
