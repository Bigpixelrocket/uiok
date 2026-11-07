/**
 * A rename dialog (Return renames, Escape cancels), a confirmation, and a
 * delete that cannot be undone, which Return never runs.
 */

import { FilePen, LogOut, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { ConfirmDialog, ModalDialog } from '@bigpixelrocket/uiok/dialog';

type Open = 'rename' | 'trash' | 'delete' | 'sign-out' | null;

/** A rename dialog over the frame. */
function RenameDialog({
  name,
  onRename,
  onCancel
}: {
  readonly name: string;
  readonly onRename: (name: string) => void;
  readonly onCancel: () => void;
}) {
  const labelId = useId();
  const [value, setValue] = useState(name);
  return (
    <ModalDialog
      className="demo-dialog"
      icon={FilePen}
      labelId={labelId}
      legend={{
        leave: { label: 'Cancel' },
        primary: {
          label: 'Rename',
          disabled: value.trim() === '',
          onRun: () => onRename(value.trim())
        }
      }}
      onCancel={onCancel}
      title="Rename"
      titleAside="~/projects/site/docs"
    >
      <input
        aria-label="Name"
        autoFocus
        className="demo-input wide"
        onChange={(event) => setValue(event.target.value)}
        spellCheck={false}
        value={value}
      />
    </ModalDialog>
  );
}

/** The dialog page's demo. */
export function DialogDemo() {
  const [open, setOpen] = useState<Open>(null);
  const [name, setName] = useState('getting-started.md');
  const [said, setSaid] = useState('');
  const close = (what: string) => () => {
    setOpen(null);
    setSaid(what);
  };
  return (
    <div className="demo-stack">
      <div className="demo-row">
        <Button onClick={() => setOpen('rename')} variant="primary">
          Rename…
        </Button>
        <Button onClick={() => setOpen('trash')}>Move to Trash…</Button>
        <Button onClick={() => setOpen('delete')}>Delete Immediately…</Button>
        <Button onClick={() => setOpen('sign-out')}>Sign Out…</Button>
      </div>
      <code className="demo-readout">
        file: {name}
        {said === '' ? '' : ` · ${said}`}
      </code>
      {open === 'rename' ? (
        <RenameDialog
          name={name}
          onCancel={close('cancelled')}
          onRename={(next) => {
            setName(next);
            close(`renamed to ${next}`)();
          }}
        />
      ) : null}
      {open === 'trash' ? (
        <ConfirmDialog
          confirmLabel="Move to Trash"
          context="~/projects/site/docs"
          icon={Trash2}
          message={
            <>
              Move <strong>{name}</strong> to the Trash?
            </>
          }
          onCancel={close('cancelled')}
          onConfirm={close('moved to the Trash')}
          title="Move to Trash"
        />
      ) : null}
      {open === 'delete' ? (
        <ConfirmDialog
          confirmLabel="Delete"
          context="~/projects/site"
          forGood
          icon={Trash2}
          message="Delete these 3 items immediately? This cannot be undone."
          onCancel={close('cancelled')}
          onConfirm={close('deleted for good')}
          paths={[
            '~/projects/site/docs/deploying.md',
            '~/projects/site/public/robots.txt',
            '~/projects/site/tests/App.test.tsx'
          ]}
          title="Delete Immediately"
        />
      ) : null}
      {open === 'sign-out' ? (
        <ConfirmDialog
          confirmLabel="Sign Out"
          icon={LogOut}
          message="Sign out now? Two uploads still running will stop."
          onCancel={close('cancelled')}
          onConfirm={close('signed out')}
          title="Sign Out"
          tone="warning"
        />
      ) : null}
    </div>
  );
}
