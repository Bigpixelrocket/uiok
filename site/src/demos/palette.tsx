/**
 * A command palette: type to filter, ↑ ↓ move, Return runs, Escape clears
 * the query and then closes. Switch Branch… opens a second level, with a
 * note and a failure under its list; the chip, ←, or Backspace in an empty
 * field steps back. Run Task… lists command lines (`.palette-command`) and
 * Open Recent… paths that give way at their start. A tag at the field's end
 * says what the commands act on, and a key legend closes the box. The
 * header's Find a page (⌘K) is the same palette over the site's pages, with
 * each page's route in the meta tone.
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
    {
      id: 'run',
      label: 'Run Task…',
      hint: 'Pick a script from package.json',
      icon: <Play size={size} />,
      level: [
        ['build', 'vite build && node scripts/verify-dist.mjs'],
        ['test', 'vitest run --coverage --reporter=dot'],
        ['lint', 'eslint . --max-warnings 0'],
        ['format', 'prettier --write .']
      ].map(([name, line]) => ({
        ...command(`task-${name}`, name ?? '', '', <Play size={size} />),
        hint: undefined,
        line
      }))
    },
    {
      id: 'recent',
      label: 'Open Recent…',
      hint: 'A folder opened before',
      icon: <FolderOpen size={size} />,
      level: [
        '~/projects/site',
        '~/projects/infrastructure-and-deployment-scripts/environments/production',
        '~/Documents/notes'
      ].map((path) => ({
        ...command(`recent-${path}`, path.split('/').pop() ?? path, '', <FolderOpen size={size} />),
        hint: undefined,
        path
      }))
    },
    command(
      'restart',
      'Restart Server',
      'Stop and start the dev server',
      <RefreshCw size={size} />
    ),
    {
      id: 'branch',
      label: 'Switch Branch…',
      hint: 'Check out another branch',
      icon: <GitBranch size={size} />,
      level: ['main', 'release/1.4', 'fix/settings-type', 'feat/dark-charts'].map((name) =>
        command(`branch-${name}`, name, `Check out ${name}`, <GitBranch size={size} />)
      ),
      notes: [
        { text: 'Branches as of 2 minutes ago.' },
        { text: 'Could not reach origin: offline.', failure: true }
      ]
    },
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
            aside={<span className="palette-meta demo-palette-aside">site</span>}
            label="Commands"
            legend={{ leave: 'Cancel', primary: 'Run' }}
            onClose={() => setOpen(false)}
            placeholder="Type a command"
          />
        </div>
      ) : null}
    </div>
  );
}
