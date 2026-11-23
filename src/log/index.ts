/**
 * Logs: `LogWell`, a log's lines in a well with each source's prefix in its
 * own colour, and the rules that give a source its colour and its column
 * (`logSourceIndexes`, `logSourceColour`, `logSourceWidth`). Its look is
 * `log.css` in `@bigpixelrocket/uiok/styles.css`.
 */

export { LogWell, type LogLine, type LogWellProps } from './LogWell.js';
export {
  LOG_SOURCE_COLOURS,
  logSourceColour,
  logSourceIndexes,
  logSourceWidth
} from './LogWell.logic.js';
