/**
 * Lines that keep a long name's end in view as their box narrows: a name in
 * a sentence, a name that opens its line, a right-to-left name, cut from its
 * own start's other end, a name in a translated line's quotation marks, and
 * a short name that is never cut in its middle. Then a cut name in a
 * dialog's one-line title.
 */

import { Copy } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { ModalDialog } from '@bigpixelrocket/uiok/dialog';
import { labelParts, NameCut, nameParts } from '@bigpixelrocket/uiok/namecut';

/** A dialog whose title names a file, cut so the name keeps its end. */
function CopyDialog({ onClose }: { readonly onClose: () => void }) {
  const labelId = useId();
  return (
    <ModalDialog
      icon={Copy}
      labelId={labelId}
      legend={{ leave: { label: 'Cancel' }, primary: { label: 'Copy', onRun: onClose } }}
      onCancel={onClose}
      title={
        <NameCut
          parts={nameParts(['Copy ', { name: 'Better.Call.Saul.S01E01.1080p.BluRay.CtrlHD.mkv' }])}
        />
      }
    >
      <p>Copy this file to the Seedbox? The title keeps the name&apos;s end in view.</p>
    </ModalDialog>
  );
}

/** The name cut page's demo. */
export function NameCutDemo() {
  const [width, setWidth] = useState(420);
  const [open, setOpen] = useState(false);
  return (
    <div className="demo-stack">
      <label className="demo-row">
        <span className="demo-label">Width</span>
        <input
          max={720}
          min={80}
          onChange={(event) => setWidth(Number(event.target.value))}
          type="range"
          value={width}
        />
        <code className="demo-readout">{width}px</code>
      </label>
      <div className="namecut-box" style={{ width }}>
        <NameCut
          parts={labelParts(
            'Copying "Better.Call.Saul.S01E01.1080p.BluRay.CtrlHD.mkv" to "Seedbox"'
          )}
        />
      </div>
      <div className="namecut-box" style={{ width }}>
        <NameCut
          parts={nameParts([
            '"',
            { name: 'quarterly-report-final-v3-reviewed.xlsx' },
            '" already exists'
          ])}
        />
      </div>
      <div className="namecut-box" style={{ width }}>
        <NameCut
          parts={labelParts('Copying "סיכום-פגישת-הצוות-השבועית-הסופי.docx" to "Seedbox"')}
        />
      </div>
      <div className="namecut-box" style={{ width }}>
        <NameCut
          parts={labelParts(
            'Kopiere „Jahresabschluss-Entwurf-2026-final-geprueft.pdf“ nach „Archiv“'
          )}
        />
      </div>
      <div className="namecut-box" style={{ width }}>
        <NameCut parts={labelParts('Copying "notes.txt" to "Seedbox"')} />
      </div>
      <div className="demo-row">
        <Button onClick={() => setOpen(true)} size="small">
          Cut in a Title Strip…
        </Button>
      </div>
      {open ? <CopyDialog onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
