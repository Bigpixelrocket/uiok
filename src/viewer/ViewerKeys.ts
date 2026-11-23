/** The parts of a keystroke a viewer's close test reads, as the DOM names them. */
export interface ViewerKeyStroke {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly repeat: boolean;
}

/**
 * Whether a keystroke closes a viewer by default: Escape alone, never a
 * held key's repeats. An app whose own chord opens the viewer adds it, so
 * the keys that bring a viewer up also put it away:
 * `(stroke) => isViewerCloseKey(stroke) || (stroke.metaKey && stroke.key === 'y')`.
 */
export function isViewerCloseKey(stroke: ViewerKeyStroke): boolean {
  return (
    stroke.key === 'Escape' &&
    !stroke.repeat &&
    !stroke.altKey &&
    !stroke.ctrlKey &&
    !stroke.metaKey &&
    !stroke.shiftKey
  );
}
