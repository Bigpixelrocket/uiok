/**
 * Every dialog variant: a rename over the frame (Return renames, Escape
 * cancels), the three confirmation tones, a delete that cannot be undone
 * with a long path list, a long question that wraps, a form that uses the
 * type hooks and a secondary slot, a command editor whose legend holds a
 * destructive secondary verb and wraps to two rows, and a frosted sheet
 * whose body scrolls.
 */

import {
  FilePen,
  KeyRound,
  Keyboard,
  LogOut,
  Power,
  Server,
  SquareTerminal,
  Trash2
} from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { ConfirmDialog, ModalDialog } from '@bigpixelrocket/uiok/dialog';

type Open =
  | 'rename'
  | 'trash'
  | 'delete'
  | 'delete-all'
  | 'sign-out'
  | 'grant'
  | 'quit'
  | 'connect'
  | 'command'
  | 'shortcuts'
  | null;

/** Paths long enough to wrap, and enough of them to scroll the list. */
const LONG_PATHS = [
  '~/projects/infrastructure-and-deployment-scripts/environments/production/terraform/main.tf',
  '~/projects/infrastructure-and-deployment-scripts/environments/production/terraform/variables.tf',
  '~/projects/infrastructure-and-deployment-scripts/environments/production/terraform/outputs.tf',
  '~/projects/site/docs/deploying.md',
  '~/projects/site/public/robots.txt',
  '~/projects/site/tests/App.test.tsx',
  '~/projects/site/tests/fixtures/very-long-fixture-name-for-the-snapshot-suite.json'
];

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
        className="field demo-input wide"
        onChange={(event) => setValue(event.target.value)}
        spellCheck={false}
        value={value}
      />
    </ModalDialog>
  );
}

/**
 * A form over the frame that uses the type hooks: labels and help in the
 * interface font, the host a value in monospace, and a secondary slot.
 */
function ConnectDialog({
  onConnect,
  onTest,
  onCancel
}: {
  readonly onConnect: () => void;
  readonly onTest: () => void;
  readonly onCancel: () => void;
}) {
  const labelId = useId();
  const userId = useId();
  return (
    <ModalDialog
      className="demo-dialog"
      icon={Server}
      labelId={labelId}
      legend={{
        leave: { label: 'Cancel' },
        secondary: [{ label: 'Test', chord: { key: 'Enter', alt: true }, onRun: onTest }],
        primary: { label: 'Connect', onRun: onConnect }
      }}
      onCancel={onCancel}
      title="Connect"
      titleAside="db.internal.example.com"
    >
      <div className="demo-stack">
        <p>
          Connect to <span className="dialog-value">db.internal.example.com:3306</span> as the user
          below.
        </p>
        <label className="dialog-label" htmlFor={userId}>
          User
        </label>
        <input
          autoFocus
          className="field demo-input wide"
          defaultValue="deploy"
          id={userId}
          spellCheck={false}
        />
        <p className="dialog-help">
          The password comes from the keychain. Test checks the connection without saving it.
        </p>
      </div>
    </ModalDialog>
  );
}

/**
 * A command editor whose legend carries a destructive secondary verb in the
 * danger tone beside the primary, with verbs long enough that the legend
 * wraps to a second row in the default width.
 */
function CommandDialog({
  onSave,
  onDelete,
  onDuplicate,
  onCancel
}: {
  readonly onSave: () => void;
  readonly onDelete: () => void;
  readonly onDuplicate: () => void;
  readonly onCancel: () => void;
}) {
  const labelId = useId();
  const commandId = useId();
  return (
    <ModalDialog
      icon={SquareTerminal}
      labelId={labelId}
      legend={{
        leave: { label: 'Keep Editing' },
        secondary: [
          {
            label: 'Delete Command…',
            chord: { key: 'Backspace', meta: true },
            onRun: onDelete,
            danger: true
          },
          { label: 'Duplicate', chord: { key: 'd', meta: true }, onRun: onDuplicate }
        ],
        primary: { label: 'Save Changes', onRun: onSave }
      }}
      onCancel={onCancel}
      title="Edit Command"
      titleAside="~/projects/site"
    >
      <div className="demo-stack">
        <label className="dialog-label" htmlFor={commandId}>
          Command
        </label>
        <input
          autoFocus
          className="field demo-input wide"
          defaultValue="npm run build"
          id={commandId}
          spellCheck={false}
        />
      </div>
    </ModalDialog>
  );
}

/** A frosted sheet whose long body scrolls between the strip and the legend. */
function ShortcutsDialog({ onDone }: { readonly onDone: () => void }) {
  const labelId = useId();
  const rows = Array.from({ length: 40 }, (_, index) => `Shortcut ${index + 1}`);
  return (
    <ModalDialog
      className="demo-dialog"
      frosted
      icon={Keyboard}
      labelId={labelId}
      legend={{ primary: { label: 'Done', onRun: onDone } }}
      onCancel={onDone}
      title="Keyboard Shortcuts"
    >
      <div className="dialog-body scroll-fade">
        {rows.map((row) => (
          <p key={row}>{row}</p>
        ))}
      </div>
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
        <Button onClick={() => setOpen('delete-all')}>Delete 7 Long Paths…</Button>
        <Button onClick={() => setOpen('grant')}>Grant Access…</Button>
        <Button onClick={() => setOpen('quit')}>Quit…</Button>
        <Button onClick={() => setOpen('connect')}>Connect…</Button>
        <Button onClick={() => setOpen('command')}>Edit Command…</Button>
        <Button onClick={() => setOpen('shortcuts')}>Shortcuts…</Button>
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
      {open === 'delete-all' ? (
        <ConfirmDialog
          confirmLabel="Delete"
          context="~/projects"
          forGood
          icon={Trash2}
          message={`Delete these ${LONG_PATHS.length} items immediately? This cannot be undone.`}
          onCancel={close('cancelled')}
          onConfirm={close('deleted for good')}
          paths={LONG_PATHS}
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
      {open === 'grant' ? (
        <ConfirmDialog
          confirmLabel="Grant"
          context="~/projects/site"
          icon={KeyRound}
          message="Let the build read this folder? It can read files here until you sign out."
          onCancel={close('cancelled')}
          onConfirm={close('granted')}
          title="Grant Access"
          tone="primary"
        />
      ) : null}
      {open === 'quit' ? (
        <ConfirmDialog
          cancelLabel="Keep Running"
          confirmLabel="Quit"
          icon={Power}
          message="Quitting stops every process this window started. Their logs are kept."
          onCancel={close('kept running')}
          onConfirm={close('quit')}
          title="Close the window and stop 5 running processes?"
          tone="warning"
        />
      ) : null}
      {open === 'connect' ? (
        <ConnectDialog
          onCancel={close('cancelled')}
          onConnect={close('connected')}
          onTest={() => setSaid('connection works')}
        />
      ) : null}
      {open === 'command' ? (
        <CommandDialog
          onCancel={close('kept editing')}
          onDelete={close('deleted the command')}
          onDuplicate={() => setSaid('duplicated')}
          onSave={close('saved')}
        />
      ) : null}
      {open === 'shortcuts' ? <ShortcutsDialog onDone={close('closed shortcuts')} /> : null}
    </div>
  );
}
