/** Work in progress: the `RunHeader` a progress view opens with, and the run state helpers it reads. */

export { RunHeader, type RunHeaderBar, type RunHeaderProps } from './RunHeader.js';
export {
  isSettledRun,
  runClock,
  runElapsedMs,
  type RunState,
  type RunTimes
} from './RunProgress.logic.js';
