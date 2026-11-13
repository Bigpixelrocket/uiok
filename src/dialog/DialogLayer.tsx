import { createContext, useState, type ReactElement, type ReactNode } from 'react';

/**
 * The element dialogs mount into under a `DialogLayer`: undefined outside
 * any layer (a dialog renders in place), null while the layer's element is
 * not yet in the document, and the element once it is.
 */
export const DialogLayerContext = createContext<HTMLElement | null | undefined>(undefined);

/** Props for {@link DialogLayer}. */
export interface DialogLayerProps {
  /** The content whose dialogs mount into the layer. */
  readonly children: ReactNode;
}

/**
 * Where the dialogs of `children` paint: an element drawn after them, so
 * every `ModalDialog` (and `ConfirmDialog`) rendered anywhere inside mounts
 * there instead of in place, above every pane of the content, even one that
 * isolates its own layers. Put it inside the element that carries the
 * content's scoping classes (a space root), so rules written under that
 * root still reach the dialogs, and outside every pane. The layer draws
 * nothing and takes no room (`display: contents`). A dialog keeps its place
 * in the React tree, so context, focus handling, and event bubbling are
 * unchanged; theme tokens follow it because they live on the document's
 * root. A dialog's own `container` prop overrides the layer.
 */
export function DialogLayer({ children }: DialogLayerProps): ReactElement {
  const [layer, setLayer] = useState<HTMLElement | null>(null);

  return (
    <>
      <DialogLayerContext value={layer}>{children}</DialogLayerContext>
      <div className="dialog-layer" ref={setLayer} />
    </>
  );
}
