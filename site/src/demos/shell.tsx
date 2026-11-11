/**
 * The shell's shared surfaces: a Settings dialog with its sidebar of pages
 * (Appearance with the theme picker, Updates with the status card and its
 * notes, Files with a file's problems), the theme picker and the update
 * card in each tone on the page itself, the update pill's states, the
 * channel tag, the sign-in prompts (a password asked again after a refusal,
 * a new host key), and the load failure block.
 */

import {
  CircleAlert,
  CircleCheck,
  Download,
  FileText,
  Info,
  KeyRound,
  LoaderCircle,
  Palette as PaletteIcon,
  RefreshCw,
  Settings as SettingsIcon,
  ShieldQuestion,
  TriangleAlert
} from 'lucide-react';
import { useId, useState, type CSSProperties, type ReactElement } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { ModalDialog } from '@bigpixelrocket/uiok/dialog';
import { ICON_MD } from '@bigpixelrocket/uiok/icon';
import { RunHeader } from '@bigpixelrocket/uiok/run';
import { DARK_THEME_IDS, LIGHT_THEME_IDS, type ThemeId } from '@bigpixelrocket/uiok/themes';

import { ThemeChoices } from '../ThemePicker';

/** The lines of a build's What's new, grouped by area. */
const NOTES: readonly { readonly area: string; readonly lines: readonly string[] }[] = [
  {
    area: 'Files',
    lines: [
      'Copying to a server now resumes where it stopped after the connection drops',
      'A folder with thousands of entries opens noticeably faster'
    ]
  },
  {
    area: 'Settings',
    lines: ['Theme names that do not fit take a second line instead of losing their end']
  },
  {
    area: 'App',
    lines: [
      'The update pill no longer moves the title bar when it appears',
      'Dialogs keep clear of the title bar in a short window'
    ]
  }
];

type CardTone = 'idle' | 'busy' | 'ready' | 'ok' | 'warning' | 'error';

/** The status card for one state of the updater. */
function UpdateCard({
  tone,
  title,
  sub,
  verb,
  notes = false,
  run = false
}: {
  readonly tone: CardTone;
  readonly title: string;
  readonly sub: string;
  readonly verb?: string;
  readonly notes?: boolean;
  readonly run?: boolean;
}): ReactElement {
  const Glyph =
    tone === 'busy'
      ? LoaderCircle
      : tone === 'ok'
        ? CircleCheck
        : tone === 'warning'
          ? TriangleAlert
          : tone === 'error'
            ? CircleAlert
            : tone === 'ready'
              ? RefreshCw
              : Download;
  const headingId = useId();
  const classes = ['update-card', 'card', notes ? 'with-notes' : '', run ? 'with-run' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <section className={classes} data-tone={tone}>
      <div className="update-card-head">
        <Glyph
          aria-hidden
          className={tone === 'busy' ? 'update-card-glyph spinner' : 'update-card-glyph'}
        />
        <div className="update-card-said">
          <span className="update-card-title">{title}</span>
          <span className="update-card-sub">{sub}</span>
        </div>
        {verb ? (
          <Button size="small" variant={tone === 'ready' ? 'primary' : 'tonal'}>
            {verb}
          </Button>
        ) : null}
      </div>
      {run ? (
        <RunHeader
          bar={{ fraction: 0.42, label: 'Download' }}
          facts={['38.2 MB of 91.0 MB', '4.1 MB/s']}
          figure="0:09"
          headline="Downloading 2.5.0"
          state="running"
        />
      ) : null}
      {notes ? (
        <section aria-labelledby={headingId} className="update-notes">
          <h4 className="overline" id={headingId}>
            What&apos;s new
          </h4>
          <div className="update-notes-frame">
            <div
              aria-label="What's new"
              className="update-notes-list update-notes-groups scroll-fade"
              role="group"
              style={{ '--update-note-rows': 3 } as CSSProperties}
              tabIndex={0}
            >
              {NOTES.map((group) => (
                <div className="update-notes-group" key={group.area}>
                  <h5 className="update-notes-area">{group.area}</h5>
                  <ul>
                    {group.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
}

/** The check cadence above the status card. */
function UpdateChecks(): ReactElement {
  const id = useId();
  return (
    <div className="update-checks card">
      <label className="update-checks-label" htmlFor={id}>
        Check for updates automatically
      </label>
      <select className="field field-sm" defaultValue="hour" id={id}>
        <option value="hour">Every hour</option>
        <option value="day">Every day</option>
        <option value="never">Never</option>
      </select>
      <p className="field-note">The next check is at 14:00.</p>
    </div>
  );
}

type PageId = 'appearance' | 'updates' | 'files';

const PAGES: readonly {
  readonly id: PageId;
  readonly title: string;
  readonly icon: typeof PaletteIcon;
  readonly subsections: readonly string[];
}[] = [
  {
    id: 'appearance',
    title: 'Appearance',
    icon: PaletteIcon,
    subsections: ['Appearance', 'Light theme', 'Dark theme']
  },
  { id: 'updates', title: 'Updates', icon: Download, subsections: [] },
  { id: 'files', title: 'Files', icon: FileText, subsections: ['Folder', 'settings.toml'] }
];

/** The Appearance page: the appearance, then each appearance's themes. */
function AppearancePage(): ReactElement {
  const [light, setLight] = useState<ThemeId>('catppuccin-latte');
  const [dark, setDark] = useState<ThemeId>('catppuccin-mocha');
  const appearanceId = useId();
  return (
    <>
      <section className="settings-subsection">
        <h4 className="overline">Appearance</h4>
        <div className="field-grid">
          <label className="field-label" htmlFor={appearanceId}>
            Appearance
          </label>
          <div className="field-value">
            <select className="field field-sm" defaultValue="system" id={appearanceId}>
              <option value="system">Follow the system</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </section>
      <section className="settings-subsection">
        <h4 className="overline">Light theme</h4>
        <div className="field-grid">
          <span className="field-label">
            Light theme
            <span className="settings-label-detail">In use now</span>
          </span>
          <div className="field-value">
            <ThemeChoices
              chosen={light}
              ids={LIGHT_THEME_IDS}
              label="Light theme"
              onChoose={setLight}
            />
            <p className="field-note">Worn while the system is light.</p>
          </div>
        </div>
      </section>
      <section className="settings-subsection">
        <h4 className="overline">Dark theme</h4>
        <div className="field-grid">
          <span className="field-label">Dark theme</span>
          <div className="field-value">
            <ThemeChoices
              chosen={dark}
              ids={DARK_THEME_IDS}
              label="Dark theme"
              onChoose={setDark}
            />
          </div>
        </div>
      </section>
    </>
  );
}

/** The Files page: the folder, then a file with its problems. */
function FilesPage(): ReactElement {
  return (
    <>
      <section className="settings-subsection">
        <h4 className="overline">Folder</h4>
        <div className="field-grid">
          <span className="field-label">Folder</span>
          <div className="field-option">
            <span className="settings-file-path">~/.config/example-app</span>
            <Button className="settings-file-action" size="small">
              Show in Finder
            </Button>
          </div>
        </div>
      </section>
      <section className="settings-subsection">
        <h4 className="overline">settings.toml</h4>
        <div className="field-grid">
          <span className="field-label settings-file-name">settings.toml</span>
          <div className="field-value">
            <div className="field-option">
              <span>2 problems</span>
              <Button className="settings-file-action" size="small">
                Open
              </Button>
            </div>
            <ul className="settings-file-problems">
              <li className="settings-file-problem notice notice-danger">
                <CircleAlert aria-hidden size={ICON_MD} />
                <span className="notice-text settings-file-problem-text">
                  <span className="settings-file-problem-place">
                    Line 12, <code>appearance.theme</code>
                  </span>
                  <span>Expected one of system, light, or dark.</span>
                </span>
              </li>
              <li className="settings-file-problem notice">
                <Info aria-hidden size={ICON_MD} />
                <span className="notice-text settings-file-problem-text">
                  <span className="settings-file-problem-place">
                    Line 30, <code>window.zoom</code>
                  </span>
                  <span>This version does not know this key; it is kept as it is.</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

/** The Settings dialog: the sidebar of pages beside the chosen page. */
function SettingsDialog({ onClose }: { readonly onClose: () => void }): ReactElement {
  const labelId = useId();
  const [page, setPage] = useState<PageId>('appearance');
  const [subsection, setSubsection] = useState('Appearance');
  const shown = PAGES.find((entry) => entry.id === page) ?? PAGES[0]!;
  return (
    <ModalDialog
      className="settings-dialog"
      frosted
      icon={SettingsIcon}
      labelId={labelId}
      legend={{ primary: { label: 'Done', onRun: onClose } }}
      onCancel={onClose}
      title="Settings"
    >
      <div className="settings-dialog-body">
        <nav aria-label="Settings pages" className="settings-sidebar scroll-fade">
          <div className="settings-sidebar-group">
            <span className="settings-sidebar-header overline">App</span>
            {PAGES.map(({ id, title, icon: Icon, subsections }) => (
              <div key={id}>
                <button
                  aria-current={id === page ? 'page' : undefined}
                  className="settings-sidebar-page"
                  onClick={() => {
                    setPage(id);
                    setSubsection(subsections[0] ?? '');
                  }}
                  type="button"
                >
                  <Icon size={ICON_MD} />
                  <span>{title}</span>
                  {id === 'updates' ? <span className="settings-sidebar-chip">2.5.0</span> : null}
                </button>
                {id === page && subsections.length > 1 ? (
                  <div className="settings-sidebar-subsections">
                    {subsections.map((name) => (
                      <button
                        aria-current={name === subsection ? 'location' : undefined}
                        className="settings-sidebar-subsection"
                        key={name}
                        onClick={() => setSubsection(name)}
                        type="button"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="settings-sidebar-group">
            <span className="settings-sidebar-header overline">Workspace</span>
            <button className="settings-sidebar-page" type="button">
              <KeyRound size={ICON_MD} />
              <span>Keyboard shortcuts and the keys they are bound to</span>
            </button>
          </div>
        </nav>
        <div className="settings-column">
          <div
            className={
              page === 'updates' ? 'settings-page fills scroll-fade' : 'settings-page scroll-fade'
            }
          >
            <h3 className="settings-page-title">{shown.title}</h3>
            {page === 'appearance' ? <AppearancePage /> : null}
            {page === 'updates' ? (
              <div className="updates-page">
                <UpdateChecks />
                <UpdateCard
                  notes
                  sub="Version 2.5.0 is available. You have 2.4.1."
                  title="An update is available"
                  tone="idle"
                  verb="Download"
                />
              </div>
            ) : null}
            {page === 'files' ? <FilesPage /> : null}
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}

/** A password asked again after the server refused the last one. */
function PasswordPrompt({ onClose }: { readonly onClose: () => void }): ReactElement {
  const labelId = useId();
  const fieldId = useId();
  const problemId = useId();
  return (
    <ModalDialog
      className="sign-in-dialog"
      icon={KeyRound}
      labelId={labelId}
      legend={{ leave: { label: 'Cancel' }, primary: { label: 'Sign In', onRun: onClose } }}
      onCancel={onClose}
      title="Sign in to build.example.com"
    >
      <div className="field-group">
        <label className="field-label" htmlFor={fieldId}>
          Password for deploy
        </label>
        <input
          aria-describedby={problemId}
          aria-invalid
          autoFocus
          className="field sign-in-field"
          id={fieldId}
          type="password"
        />
        <p className="field-problem" id={problemId}>
          The server did not accept that password. Try again.
        </p>
      </div>
    </ModalDialog>
  );
}

/** A host key the computer has not seen before. */
function HostKeyPrompt({ onClose }: { readonly onClose: () => void }): ReactElement {
  const labelId = useId();
  return (
    <ModalDialog
      className="sign-in-host-key"
      icon={ShieldQuestion}
      labelId={labelId}
      legend={{
        leave: { label: 'Cancel' },
        primary: { label: 'Trust and Connect', onRun: onClose }
      }}
      onCancel={onClose}
      title="Trust build.example.com?"
    >
      <p>
        This computer has not connected to build.example.com before. Check the key with its owner.
      </p>
      <dl className="sign-in-fingerprint">
        <dt>ED25519</dt>
        <dd>
          <code>SHA256:8b2fQx0Zr1m4V3kKpN7uYc9hT6wLsE5aJdG2oRiB4Hc</code>
        </dd>
      </dl>
    </ModalDialog>
  );
}

type Open = 'settings' | 'password' | 'host-key' | null;

/** The shell surfaces page's demo. */
export function ShellDemo(): ReactElement {
  const [open, setOpen] = useState<Open>(null);
  const [light, setLight] = useState<ThemeId>('catppuccin-latte');
  const close = () => setOpen(null);
  return (
    <div className="demo-stack">
      <h3 className="demo-subhead">Dialogs</h3>
      <div className="demo-row">
        <Button onClick={() => setOpen('settings')}>Open Settings</Button>
        <Button onClick={() => setOpen('password')}>Sign In Again</Button>
        <Button onClick={() => setOpen('host-key')}>New Host Key</Button>
      </div>
      {open === 'settings' ? <SettingsDialog onClose={close} /> : null}
      {open === 'password' ? <PasswordPrompt onClose={close} /> : null}
      {open === 'host-key' ? <HostKeyPrompt onClose={close} /> : null}

      <h3 className="demo-subhead">Theme picker</h3>
      <ThemeChoices chosen={light} ids={LIGHT_THEME_IDS} label="Light theme" onChoose={setLight} />

      <h3 className="demo-subhead">Update card</h3>
      <div className="updates-page">
        <UpdateChecks />
        <UpdateCard sub="Last checked at 13:02." title="This is the latest version" tone="ok" />
        <UpdateCard sub="Looking for a newer build." title="Checking for updates" tone="busy" />
        <UpdateCard
          notes
          sub="Version 2.5.0 is available. You have 2.4.1."
          title="An update is available"
          tone="idle"
          verb="Download"
        />
        <UpdateCard
          run
          sub="Version 2.5.0, 91.0 MB."
          title="Downloading the update"
          tone="busy"
          verb="Stop"
        />
        <UpdateCard
          sub="Restart to finish installing 2.5.0; it also installs at the next launch."
          title="Ready to install"
          tone="ready"
          verb="Restart and Update"
        />
        <UpdateCard
          sub="The update server did not answer. Checks will try again within the hour."
          title="Could not check for updates"
          tone="warning"
          verb="Try Again"
        />
        <UpdateCard
          sub="The download was not signed by the expected developer."
          title="The update could not be installed"
          tone="error"
          verb="Try Again"
        />
      </div>

      <h3 className="demo-subhead">Update pill</h3>
      <div className="demo-row">
        <Button className="shell-update-pill" data-state="available" size="small" variant="tonal">
          Update
        </Button>
        <Button className="shell-update-pill" data-state="ready" size="small" variant="primary">
          Restart
        </Button>
        <Button className="shell-update-pill" data-state="download-failed" size="small">
          <TriangleAlert size={ICON_MD} />
          Update
        </Button>
      </div>

      <h3 className="demo-subhead">Channel tag</h3>
      <div className="demo-row">
        <span className="channel-tag">Nightly 412</span>
        <span className="channel-tag">Local</span>
      </div>

      <h3 className="demo-subhead">Load failure</h3>
      <div className="card">
        <div className="space-load-failure" role="alert">
          <strong>The list could not be loaded</strong>
          <p>The settings folder could not be read: permission denied. Check its permissions.</p>
          <Button size="small">Try Again</Button>
        </div>
      </div>
    </div>
  );
}
