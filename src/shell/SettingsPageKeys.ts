import { createContext, useContext, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

import {
  legendSignature,
  type DialogLegendModel,
  type LegendSecondary
} from '../dialog/DialogLegend.logic.js';

/**
 * The keys a Settings page takes over while it shows: the legend it draws
 * in place of the dialog's Done, and what Escape does instead of closing
 * the dialog.
 */
export interface SettingsPageKeys {
  readonly legend: DialogLegendModel;
  /**
   * True while the page has nothing of its own for Return (a cursor on a
   * locked row, a find that shows no row): the dialog's Done stands as the
   * legend's primary, and Return runs it from anywhere, a find field
   * included. The legend then names no primary of its own.
   */
  readonly done?: boolean;
  /**
   * What Escape, the leave slot, and a press outside the dialog run (Clear a
   * find, Cancel a recording); null leaves them closing the dialog.
   */
  readonly onLeave: (() => void) | null;
}

/**
 * Where a page hands its keys to `SettingsDialog`, which provides it around
 * the page it shows; null gives the dialog's own keys back. The default
 * drops them, so a page rendered on its own still works.
 */
export const SettingsPageKeysContext = createContext<(keys: SettingsPageKeys | null) => void>(
  () => {}
);

/**
 * The keys with every verb running the latest model's: the dialog holds one
 * model per legend drawn, while the page's handlers change on each render.
 */
function relayed(latest: RefObject<SettingsPageKeys>): SettingsPageKeys {
  const { legend, onLeave } = latest.current;
  const slot = (chosen: LegendSecondary, index: number): LegendSecondary => ({
    ...chosen,
    onRun: () => latest.current.legend.secondary?.[index]?.onRun()
  });
  const primary = legend.primary
    ? { primary: { ...legend.primary, onRun: () => latest.current.legend.primary?.onRun() } }
    : {};
  const [first, second] = legend.secondary ?? [];
  const relayedLegend: DialogLegendModel = {
    ...(legend.leave === undefined ? {} : { leave: legend.leave }),
    secondary:
      first === undefined
        ? []
        : second === undefined
          ? [slot(first, 0)]
          : [slot(first, 0), slot(second, 1)],
    ...primary
  };

  return {
    legend: relayedLegend,
    ...(latest.current.done === true ? { done: true } : {}),
    onLeave: onLeave === null ? null : () => latest.current.onLeave?.()
  };
}

/**
 * The Settings dialog's legend while `keys` show, or its own with none:
 * `done` (the dialog's Done) on Return, which a focused field, pop-up menu,
 * or button keeps, since every control applies at once; the page's legend
 * while it shows one, with Done as its primary when the page says Return
 * is Done.
 */
export function settingsLegend(
  keys: SettingsPageKeys | null,
  onDone: () => void,
  done: string
): DialogLegendModel {
  if (keys === null) {
    return { primary: { label: done, onRun: onDone, yieldsReturn: true } };
  }

  return keys.done === true
    ? { ...keys.legend, primary: { label: done, onRun: onDone } }
    : keys.legend;
}

/**
 * Hands a page's keys to `SettingsDialog` while the page is mounted, and
 * gives the dialog its own back when it unmounts. The page may build
 * `keys` afresh on every render: the dialog redraws only when the legend's
 * slots or the leave choice change, and every verb runs the latest handler.
 */
export function useSettingsPageKeys(keys: SettingsPageKeys): void {
  const publish = useContext(SettingsPageKeysContext);
  const latest = useRef(keys);
  const signature = `${legendSignature(keys.legend)}|${keys.onLeave === null ? 'close' : 'page'}|${keys.done === true ? 'done' : ''}`;

  useLayoutEffect(() => {
    latest.current = keys;
  });

  useLayoutEffect(() => {
    publish(relayed(latest));
  }, [publish, signature]);

  useLayoutEffect(() => () => publish(null), [publish]);
}
