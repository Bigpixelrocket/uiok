import { createContext, useContext, useMemo, type ReactElement, type ReactNode } from 'react';

import { DEFAULT_LABELS, type UiokLabels } from './UiokLabels.js';

/**
 * A partial copy of a label group, or of `UiokLabels` whole: every record
 * may leave out any field, at any depth, and a function stays a function
 * (it is replaced, never merged).
 */
export type LabelsOverride<T> = {
  readonly [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? LabelsOverride<T[K]>
      : T[K];
};

/** The labels an app passes to `UiokProvider`: any part of `UiokLabels`. */
export type UiokLabelsOverride = LabelsOverride<UiokLabels>;

/** Whether `value` is a record to merge field by field: an object of no class, not an array. */
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

const mergeRecords = (
  base: Readonly<Record<string, unknown>>,
  override: Readonly<Record<string, unknown>>
): Record<string, unknown> => {
  const merged: Record<string, unknown> = { ...base };

  for (const [field, value] of Object.entries(override)) {
    if (value === undefined) {
      continue;
    }

    const earlier = merged[field];
    merged[field] = isRecord(earlier) && isRecord(value) ? mergeRecords(earlier, value) : value;
  }

  return merged;
};

/**
 * `base` with every field `override` gives laid over it, record by record at
 * any depth, so an override of one key name keeps every other. A field the
 * override leaves out or sets to `undefined` keeps the base's value. For
 * code outside React (a keymap printing chords) that needs the same labels
 * `UiokProvider` would give.
 */
export function mergeLabels(
  base: UiokLabels,
  override: UiokLabelsOverride | undefined
): UiokLabels {
  return override === undefined
    ? base
    : (mergeRecords(
        base as unknown as Record<string, unknown>,
        override as Record<string, unknown>
      ) as unknown as UiokLabels);
}

const LabelsContext = createContext<UiokLabels>(DEFAULT_LABELS);

/** Props for {@link UiokProvider}. */
export interface UiokProviderProps {
  /**
   * The labels to use below, in part or whole; what is left out comes from
   * the provider above, or English. Keep the object's identity across
   * renders (build it once per language) so the components below need not
   * render again.
   */
  readonly labels?: UiokLabelsOverride;
  readonly children?: ReactNode;
}

/**
 * Supplies the shared chrome strings (`UiokLabels`) to every UIOK component
 * below it. Mount it once near the app's root with the app's translations;
 * without one, components speak English. A provider inside another merges
 * its labels over the outer one's, so a subtree can change one group alone.
 */
export function UiokProvider({ labels, children }: UiokProviderProps): ReactElement {
  const outer = useContext(LabelsContext);
  const merged = useMemo(() => mergeLabels(outer, labels), [outer, labels]);

  return <LabelsContext value={merged}>{children}</LabelsContext>;
}

/**
 * The labels in effect where a component renders: the nearest
 * `UiokProvider`'s, merged over English defaults. A component that shows
 * shared chrome reads its group from here (`useLabels().keys`).
 */
export function useLabels(): UiokLabels {
  return useContext(LabelsContext);
}
