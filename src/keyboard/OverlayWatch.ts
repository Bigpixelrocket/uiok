import { isModalOpen, isOverlayOpen, OVERLAY_SELECTOR } from './Keyboard.logic.js';

/** The document's open overlays, answered without walking the document. */
export interface OverlayWatch {
  /** Whether a modal surface is open anywhere in the document (`isModalOpen`). */
  readonly modalOpen: () => boolean;
  /** Whether an overlay Escape closes is open and in view (`isOverlayOpen`). */
  readonly overlayOpen: () => boolean;
  /**
   * Calls `listener` after each batch of changes that may have changed
   * either answer: an overlay came or went, or a panel holding one was
   * shown or hidden. Returns the unsubscribe.
   */
  readonly subscribe: (listener: () => void) => () => void;
}

const watches = new WeakMap<Document, OverlayWatch>();

/**
 * The overlay watch of `document`, made on first use and kept for the
 * document's life. `isModalOpen` and `isOverlayOpen` over the whole
 * document walk every element (two panes of 10,000 rows are about 240,000),
 * and the window asks on every keystroke and after every DOM change. The
 * watch keeps the few elements that match `OVERLAY_SELECTOR` instead,
 * following them with one mutation observer: an added subtree is searched
 * once as it arrives, an element whose `aria-modal` or `data-overlay`
 * changes is checked again, and one no longer in the document is dropped.
 * Each answer first takes the records the observer has not delivered yet,
 * so it is as current as a query of the document, and is then decided by
 * `isModalOpen` and `isOverlayOpen` over the kept elements, the same rules
 * (a `hidden` ancestor included) on far fewer of them.
 */
export function watchOverlays(document: Document): OverlayWatch {
  const existing = watches.get(document);

  if (existing !== undefined) {
    return existing;
  }

  const kept = new Set<Element>(document.querySelectorAll(OVERLAY_SELECTOR));
  const listeners = new Set<() => void>();
  let notifying = false;

  const keep = (node: Node): void => {
    if (!(node instanceof Element)) {
      return;
    }

    if (node.matches(OVERLAY_SELECTOR)) {
      kept.add(node);
    }

    if (node.firstElementChild !== null) {
      for (const overlay of node.querySelectorAll(OVERLAY_SELECTOR)) {
        kept.add(overlay);
      }
    }
  };

  // Records are read against the document as it is now, so a node added and
  // then changed or removed in the same batch is judged by where it ended.
  const apply = (records: readonly MutationRecord[]): void => {
    for (const record of records) {
      if (record.type === 'childList') {
        record.addedNodes.forEach(keep);
      } else if (record.target instanceof Element && record.attributeName !== 'hidden') {
        if (record.target.matches(OVERLAY_SELECTOR)) {
          kept.add(record.target);
        } else {
          kept.delete(record.target);
        }
      }
    }

    for (const element of kept) {
      if (!element.isConnected) {
        kept.delete(element);
      }
    }
  };

  const notify = (): void => {
    notifying = false;

    for (const listener of [...listeners]) {
      listener();
    }
  };

  const observer = new MutationObserver((records) => {
    apply(records);
    notify();
  });

  observer.observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    // Showing or hiding a panel toggles `hidden`, and the panel may hold an overlay.
    attributeFilter: ['aria-modal', 'data-overlay', 'hidden']
  });

  // Records an answer took never reach the observer's callback, so their
  // listeners hear of them in a microtask of their own.
  const sync = (): void => {
    const records = observer.takeRecords();

    if (records.length === 0) {
      return;
    }

    apply(records);

    if (!notifying) {
      notifying = true;
      queueMicrotask(notify);
    }
  };

  const tracked = {
    querySelector: (selector: string): Element | null => {
      for (const element of kept) {
        if (element.matches(selector)) {
          return element;
        }
      }

      return null;
    },
    querySelectorAll: (selector: string): Element[] =>
      [...kept].filter((element) => element.matches(selector))
  };

  const watch: OverlayWatch = {
    modalOpen: () => {
      sync();
      return isModalOpen(tracked);
    },
    overlayOpen: () => {
      sync();
      return isOverlayOpen(tracked);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };

  watches.set(document, watch);
  return watch;
}
