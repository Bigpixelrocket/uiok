/**
 * A command palette: type to filter, ↑ ↓ move, Return runs, Escape clears
 * the query and then closes. The header's Find a page (⌘K) is the same
 * palette over the site's pages.
 */

import {
  Copy,
  FilePlus,
  FolderOpen,
  GitBranch,
  Moon,
  Play,
  RefreshCw,
  Save,
  Search,
  Settings,
  Terminal,
  Trash2
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { ICON_MD } from '@bigpixelrocket/uiok/icon';

import { CommandPalette, type Command } from '../CommandPalette';

/** The palette page's demo. */
export function PaletteDemo() {
  const [open, setOpen] = useState(false);
  const [ran, setRan] = useState<string | null>(null);
  const command = (
    id: string,
    label: string,
    hint: string,
    icon: Command['icon'],
    chord?: Command['chord']
  ): Command => ({
    id,
    label,
    hint,
    icon,
    chord,
    run: () => setRan(label)
  });
  const size = ICON_MD;
  const commands: readonly Command[] = [
    command('new', 'New File', 'Create an empty file here', <FilePlus size={size} />, {
      key: 'n',
      meta: true
    }),
    command('open', 'Open Folder…', 'Pick a folder to browse', <FolderOpen size={size} />, {
      key: 'o',
      meta: true
    }),
    command('save', 'Save', 'Write the file to disk', <Save size={size} />, {
      key: 's',
      meta: true
    }),
    command('copy-path', 'Copy Path', 'The full path of the selected file', <Copy size={size} />, {
      key: 'c',
      meta: true,
      alt: true
    }),
    command('find', 'Find in Files', 'Search every file in the folder', <Search size={size} />, {
      key: 'f',
      meta: true,
      shift: true
    }),
    command('run', 'Run Task…', 'Pick a script from package.json', <Play size={size} />),
    command(
      'restart',
      'Restart Server',
      'Stop and start the dev server',
      <RefreshCw size={size} />
    ),
    command('branch', 'Switch Branch…', 'Check out another branch', <GitBranch size={size} />),
    command('terminal', 'New Terminal', 'Open a shell in this folder', <Terminal size={size} />, {
      key: '`',
      ctrl: true
    }),
    command(
      'dark',
      'Toggle Dark Appearance',
      'Switch between light and dark',
      <Moon size={size} />
    ),
    command('settings', 'Settings', 'Change preferences', <Settings size={size} />, {
      key: ',',
      meta: true
    }),
    command(
      'trash',
      'Move to Trash',
      'Move the selected file to the Trash',
      <Trash2 size={size} />,
      { key: 'Backspace', meta: true }
    )
  ];
  return (
    <div className="demo-stack">
      <div className="demo-row">
        <Button onClick={() => setOpen(true)} variant="primary">
          Open the palette
        </Button>
        <code className="demo-readout">ran: {ran ?? 'nothing yet'}</code>
      </div>
      {open ? (
        <div className="listing-root">
          <CommandPalette
            commands={commands}
            label="Commands"
            onClose={() => setOpen(false)}
            placeholder="Type a command"
          />
        </div>
      ) : null}
    </div>
  );
}
