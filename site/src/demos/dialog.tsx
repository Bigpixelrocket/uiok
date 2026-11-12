/**
 * Every dialog variant: a rename over the frame (Return renames, Escape
 * cancels), the three confirmation tones, one with a choice under its
 * message, deletes that cannot be undone with a one-line name list (one
 * ending in "+N more"), a quit confirmation with a fact list, a long title
 * cut on its one line, and a command editor whose legend holds a destructive
 * secondary verb and wraps to two rows. Then one dialog on each width step:
 * a connection form on the label column (medium), a frosted shortcuts sheet
 * whose body scrolls (large), a wide table (extra large), and a dialog
 * pinned at its top whose body grows downward (`pinTop`).
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
import { ConfirmDialog, ModalDialog, type DialogFact } from '@bigpixelrocket/uiok/dialog';
import { DataGrid, type DataGridColumn } from '@bigpixelrocket/uiok/grid';
import { type Chord } from '@bigpixelrocket/uiok/keyboard';
import { KeyChord } from '@bigpixelrocket/uiok/keychord';

import { orderAt, type Order } from './data';

type Open =
  | 'rename'
  | 'trash'
  | 'delete'
  | 'delete-all'
  | 'sign-out'
  | 'grant'
  | 'quit'
  | 'long-title'
  | 'connect'
  | 'command'
  | 'shortcuts'
  | 'orders'
  | 'hosts'
  | null;

/** Paths long enough to be cut in their middle, and more than the name list shows. */
const LONG_PATHS = [
  '~/projects/infrastructure-and-deployment-scripts/environments/production/terraform/main.tf',
  '~/projects/infrastructure-and-deployment-scripts/environments/production/terraform/variables.tf',
  '~/projects/infrastructure-and-deployment-scripts/environments/production/terraform/outputs.tf',
  '~/projects/site/docs/deploying.md',
  '~/projects/site/public/robots.txt',
  '~/projects/site/tests/App.test.tsx',
  '~/projects/site/tests/fixtures/very-long-fixture-name-for-the-snapshot-suite.json'
];

/**
 * The quit confirmation's facts: a row per kind of thing the quit ends, its
 * count, and the first names, each row one line.
 */
const QUIT_FACTS: readonly DialogFact[] = [
  { label: 'Terminals', count: 6, value: 'zsh, npm run dev, vite, psql, htop, tail -f app.log' },
  {
    label: 'Projects',
    count: 9,
    value: 'shop (web, worker, queue), blog (vite), docs (serve), +2'
  },
  { label: 'Schedules', count: 2, value: 'nightly-backup, sitemap' }
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
    >
      <div className="demo-stack">
        {/* Where the dialog acts is the body's first line, never beside the title. */}
        <p className="dialog-help">
          In <span className="dialog-value">~/projects/site/docs</span>
        </p>
        {/* No width class: the column stretches the field across the body. */}
        <input
          aria-label="Name"
          autoFocus
          className="field"
          onChange={(event) => setValue(event.target.value)}
          spellCheck={false}
          value={value}
        />
      </div>
    </ModalDialog>
  );
}

/**
 * A connection form on the medium step (`.dialog-size-md`): a sentence with
 * the host as a value, then its fields on one label column, help in the
 * interface font, and a secondary slot.
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
  const hostId = useId();
  const portId = useId();
  const userId = useId();
  return (
    <ModalDialog
      className="dialog-size-md"
      icon={Server}
      labelId={labelId}
      legend={{
        leave: { label: 'Cancel' },
        secondary: [{ label: 'Test', chord: { key: 'Enter', alt: true }, onRun: onTest }],
        primary: { label: 'Connect', onRun: onConnect }
      }}
      onCancel={onCancel}
      title="Connect"
    >
      <div className="demo-stack">
        <p>
          Connect to <span className="dialog-value">db.internal.example.com:3306</span> as the user
          below.
        </p>
        <div className="field-grid">
          <label className="field-label" htmlFor={hostId}>
            Host
          </label>
          <input
            className="field"
            defaultValue="db.internal.example.com"
            id={hostId}
            spellCheck={false}
          />
          <label className="field-label" htmlFor={portId}>
            Port
          </label>
          <input className="field" defaultValue="3306" id={portId} inputMode="numeric" />
          <label className="field-label" htmlFor={userId}>
            User
          </label>
          <input autoFocus className="field" defaultValue="deploy" id={userId} spellCheck={false} />
        </div>
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
    >
      <div className="demo-stack">
        <label className="dialog-label" htmlFor={commandId}>
          Command
        </label>
        {/* No width class: the column stretches the field across the body. */}
        <input
          autoFocus
          className="field"
          defaultValue="npm run build"
          id={commandId}
          spellCheck={false}
        />
      </div>
    </ModalDialog>
  );
}

/** Shortcuts for the large sheet, each a chord and what it does. */
const SHORTCUTS: readonly { readonly chord: Chord; readonly does: string }[] = [
  { chord: { key: 'n', meta: true }, does: 'New window' },
  { chord: { key: 'n', meta: true, shift: true }, does: 'New folder in the current pane' },
  { chord: { key: 'o', meta: true }, does: 'Open the item under the cursor' },
  { chord: { key: 'k', meta: true }, does: 'Command palette' },
  { chord: { key: 'f', meta: true }, does: 'Filter the current pane' },
  { chord: { key: 'Backspace', meta: true }, does: 'Move to Trash' },
  { chord: { key: 'Backspace', meta: true, alt: true }, does: 'Delete now' },
  { chord: { key: 'ArrowUp', meta: true }, does: 'Go to the first row' },
  { chord: { key: 'ArrowDown', meta: true }, does: 'Go to the last row' },
  { chord: { key: 'PageUp' }, does: 'Up a screen of rows' },
  { chord: { key: 'PageDown' }, does: 'Down a screen of rows' },
  { chord: { key: 'Tab' }, does: 'Switch between the sidebar and the page' },
  { chord: { key: 'Enter' }, does: "Open, or run the row's first action" },
  { chord: { key: 'Enter', meta: true }, does: 'Start or stop the selected service' },
  { chord: { key: 'Enter', meta: true, alt: true }, does: 'Restart the selected service' },
  { chord: { key: '.' }, does: 'Reveal in Finder' },
  { chord: { key: ',', meta: true }, does: 'Settings' },
  { chord: { key: 'w', meta: true }, does: 'Close the window' },
  { chord: { key: 'q', meta: true }, does: 'Quit' },
  { chord: { key: '/', meta: true }, does: 'Show these shortcuts' }
];

/**
 * A frosted sheet on the large step (`.dialog-size-lg`): a list of chords
 * and what each does in two columns, whose body scrolls between the strip
 * and the legend.
 */
function ShortcutsDialog({ onDone }: { readonly onDone: () => void }) {
  const labelId = useId();
  return (
    <ModalDialog
      className="dialog-size-lg"
      frosted
      icon={Keyboard}
      labelId={labelId}
      legend={{ primary: { label: 'Done', onRun: onDone } }}
      onCancel={onDone}
      title="Keyboard Shortcuts"
    >
      <div className="dialog-body scroll-fade">
        <ul className="chord-list keycap">
          {SHORTCUTS.map(({ chord, does }) => (
            <li key={does}>
              <KeyChord chord={chord} />
              <span>{does}</span>
            </li>
          ))}
        </ul>
      </div>
    </ModalDialog>
  );
}

const ORDER_FIELDS: readonly { readonly key: keyof Order; readonly column: DataGridColumn }[] = [
  { key: 'id', column: { id: 'id', label: 'order', align: 'right' } },
  { key: 'customer', column: { id: 'customer', label: 'customer' } },
  { key: 'city', column: { id: 'city', label: 'city' } },
  { key: 'product', column: { id: 'product', label: 'product' } },
  { key: 'id', column: { id: 'ship', label: 'ship to' } },
  { key: 'quantity', column: { id: 'quantity', label: 'qty', align: 'right' } },
  { key: 'total', column: { id: 'total', label: 'total', align: 'right' } },
  { key: 'placed', column: { id: 'placed', label: 'placed' } },
  { key: 'status', column: { id: 'status', label: 'status' } }
];
const RECENT_ORDERS: readonly Order[] = Array.from({ length: 40 }, (_, index) => orderAt(index));

/** A cell of the wide table: the ship-to column writes an address from the order. */
const orderText = (order: Order, column: number): string => {
  const field = ORDER_FIELDS[column];
  if (field === undefined) return '';
  if (field.column.id === 'ship') {
    return `${(order.id % 90) + 10} Harbour Road, dock ${(order.id % 7) + 1}, ${order.city}`;
  }
  return String(order[field.key]);
};

/** A wide table on the extra large step (`.dialog-size-xl`). */
function OrdersDialog({ onDone }: { readonly onDone: () => void }) {
  const labelId = useId();
  return (
    <ModalDialog
      className="dialog-size-xl"
      icon={Server}
      labelId={labelId}
      legend={{ primary: { label: 'Done', onRun: onDone } }}
      onCancel={onDone}
      title="Recent Orders"
    >
      <p className="dialog-help">
        From <span className="dialog-value">db.internal.example.com / shop</span>
      </p>
      <DataGrid
        cell={(row, column) => {
          const order = RECENT_ORDERS[row];
          return order === undefined ? null : { text: orderText(order, column) };
        }}
        columns={ORDER_FIELDS.map((field) => field.column)}
        copyText={(row, column) => {
          const order = RECENT_ORDERS[row];
          return order === undefined ? null : orderText(order, column);
        }}
        label="Recent orders"
        maxHeight={300}
        rowCount={RECENT_ORDERS.length}
      />
    </ModalDialog>
  );
}

/**
 * A dialog that keeps its top edge where it opened (`pinTop`): each host
 * added grows the body downward instead of moving the strip.
 */
function AddHostsDialog({
  onAdd,
  onCancel
}: {
  readonly onAdd: (count: number) => void;
  readonly onCancel: () => void;
}) {
  const labelId = useId();
  const [hosts, setHosts] = useState<readonly string[]>(['build-1.example.com']);
  return (
    <ModalDialog
      icon={Server}
      labelId={labelId}
      legend={{
        leave: { label: 'Cancel' },
        primary: { label: 'Add Hosts', onRun: () => onAdd(hosts.length) }
      }}
      onCancel={onCancel}
      pinTop
      title="Add Hosts"
    >
      <div className="demo-stack">
        <p className="dialog-help">
          The box stays where it opened while hosts are added; a window resize centres it again.
        </p>
        {hosts.map((host, index) => (
          <input
            aria-label={`Host ${index + 1}`}
            autoFocus={index === hosts.length - 1}
            className="field"
            key={index}
            onChange={(event) =>
              setHosts((current) =>
                current.map((value, at) => (at === index ? event.target.value : value))
              )
            }
            spellCheck={false}
            value={host}
          />
        ))}
        <div className="demo-row">
          <Button
            onClick={() =>
              setHosts((current) => [...current, `build-${current.length + 1}.example.com`])
            }
            size="small"
          >
            Add Another Host
          </Button>
        </div>
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
        <Button onClick={() => setOpen('delete')}>Delete Now…</Button>
        <Button onClick={() => setOpen('sign-out')}>Sign Out…</Button>
        <Button onClick={() => setOpen('delete-all')}>Delete 7 Long Paths…</Button>
        <Button onClick={() => setOpen('grant')}>Grant Access…</Button>
        <Button onClick={() => setOpen('quit')}>Quit…</Button>
        <Button onClick={() => setOpen('long-title')}>Long Title…</Button>
        <Button onClick={() => setOpen('command')}>Edit Command…</Button>
      </div>
      <h3 className="demo-subhead">Size steps</h3>
      <div className="demo-row">
        <span className="demo-label">Small, 360px</span>
        <span className="demo-readout">Rename, the confirmations, Edit Command (above)</span>
      </div>
      <div className="demo-row">
        <span className="demo-label">Medium, 480px</span>
        <Button onClick={() => setOpen('connect')}>Connect…</Button>
      </div>
      <div className="demo-row">
        <span className="demo-label">Large, 640px</span>
        <Button onClick={() => setOpen('shortcuts')}>Shortcuts…</Button>
      </div>
      <div className="demo-row">
        <span className="demo-label">Extra large, 880px</span>
        <Button onClick={() => setOpen('orders')}>Recent Orders…</Button>
      </div>
      <div className="demo-row">
        <span className="demo-label">Pinned top</span>
        <Button onClick={() => setOpen('hosts')}>Add Hosts…</Button>
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
          forGood
          icon={Trash2}
          message="These 3 items are deleted for good. This cannot be undone."
          onCancel={close('cancelled')}
          onConfirm={close('deleted for good')}
          paths={[
            '~/projects/site/docs/deploying.md',
            '~/projects/site/public/robots.txt',
            '~/projects/site/tests/App.test.tsx'
          ]}
          title="Delete 3 Items Now?"
        />
      ) : null}
      {open === 'delete-all' ? (
        <ConfirmDialog
          confirmLabel="Delete"
          forGood
          icon={Trash2}
          message={`These ${LONG_PATHS.length} items are deleted for good. This cannot be undone.`}
          onCancel={close('cancelled')}
          onConfirm={close('deleted for good')}
          paths={LONG_PATHS}
          title={`Delete ${LONG_PATHS.length} Items Now?`}
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
        >
          {/* A choice under the message; the caller holds its state. */}
          <label className="field-choice">
            <input className="check" type="checkbox" />
            Also sign out on this computer&apos;s other windows
          </label>
        </ConfirmDialog>
      ) : null}
      {open === 'grant' ? (
        <ConfirmDialog
          confirmLabel="Grant"
          icon={KeyRound}
          message={
            <>
              The build can read files in <strong>~/projects/site</strong> until you sign out.
            </>
          }
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
          className="dialog-size-md"
          facts={QUIT_FACTS}
          message="Every process below stops and every schedule ends. Their logs are kept."
          onCancel={close('kept running')}
          onConfirm={close('quit')}
          title="Quit and Stop 15 Processes?"
          tone="warning"
        />
      ) : null}
      {open === 'long-title' ? (
        <ConfirmDialog
          confirmLabel="Delete"
          forGood
          icon={Trash2}
          message="A title this long is cut on its one line; its whole text is a tooltip."
          onCancel={close('cancelled')}
          onConfirm={close('deleted for good')}
          title="Delete Now from the Production Environment Folder"
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
      {open === 'orders' ? <OrdersDialog onDone={close('closed the orders')} /> : null}
      {open === 'hosts' ? (
        <AddHostsDialog
          onAdd={(count) => close(`added ${count} hosts`)()}
          onCancel={close('cancelled')}
        />
      ) : null}
    </div>
  );
}
