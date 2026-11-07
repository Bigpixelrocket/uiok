/**
 * A key catcher that prints any chord as glyphs and words, and the overlay
 * contract's answers while a menu or a dialog opens over the page.
 */

import { Keyboard } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { useLabels } from '@bigpixelrocket/uiok';
import { Button } from '@bigpixelrocket/uiok/button';
import { ConfirmDialog } from '@bigpixelrocket/uiok/dialog';
import { chordGlyphs, chordSpoken, watchOverlays, type Chord } from '@bigpixelrocket/uiok/keyboard';
import { KeyChord } from '@bigpixelrocket/uiok/keychord';

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Fn']);

let watch: ReturnType<typeof watchOverlays> | null = null;
/** The page's one overlay watch, made on first use. */
const overlays = () => (watch ??= watchOverlays(document));

/** The keyboard page's demo. */
export function KeyboardDemo() {
  const keys = useLabels().keys;
  const [chord, setChord] = useState<Chord | null>(null);
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState(false);
  const state = useSyncExternalStore(
    (listener) => overlays().subscribe(listener),
    () => `${overlays().modalOpen()}:${overlays().overlayOpen()}`
  );
  const [modalOpen, overlayOpen] = state.split(':').map((value) => value === 'true');

  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menu]);

  return (
    <div className="keyboard-demo">
      <div
        aria-label="Press a chord"
        className="key-catcher"
        onKeyDown={(event) => {
          if (MODIFIER_KEYS.has(event.key) || event.key === 'Tab') return;
          event.preventDefault();
          setChord({
            key: event.key.length === 1 ? event.key.toLowerCase() : event.key,
            meta: event.metaKey,
            ctrl: event.ctrlKey,
            alt: event.altKey,
            shift: event.shiftKey
          });
        }}
        role="textbox"
        tabIndex={0}
      >
        {chord === null ? (
          <span className="key-catcher-hint">Click here, then press any chord</span>
        ) : (
          <>
            <KeyChord chord={chord} />
            <span className="key-catcher-read">
              <code>chordGlyphs</code> {chordGlyphs(chord, keys)}
            </span>
            <span className="key-catcher-read">
              <code>chordSpoken</code> “{chordSpoken(chord, keys)}”
            </span>
          </>
        )}
      </div>
      <div className="demo-row">
        <Button onClick={() => setMenu((open) => !open)} size="small">
          {menu ? 'Close the popover' : 'Open a popover'}
        </Button>
        <Button onClick={() => setDialog(true)} size="small">
          Open a modal
        </Button>
        <code className="demo-readout">
          overlayOpen() {String(overlayOpen)} · modalOpen() {String(modalOpen)}
        </code>
      </div>
      {menu ? (
        <div className="demo-popover" data-overlay>
          A <code>[data-overlay]</code> popover: Escape closes it, the window&rsquo;s other keys
          still work.
        </div>
      ) : null}
      {dialog ? (
        <ConfirmDialog
          confirmLabel="Close"
          icon={Keyboard}
          message="An aria-modal dialog holds the window's keys until it closes."
          onCancel={() => setDialog(false)}
          onConfirm={() => setDialog(false)}
          title="A modal"
          tone="primary"
        />
      ) : null}
    </div>
  );
}
