/**
 * The home page: what UIOK is, how it looks, how to install it, and the
 * smallest working app.
 */

import { Copy, Download, Play, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button, IconButton } from '@bigpixelrocket/uiok/button';
import { ICON_MD, ICON_SM } from '@bigpixelrocket/uiok/icon';
import { KeyChord } from '@bigpixelrocket/uiok/keychord';
import {
  Cell,
  column,
  Listing,
  Row,
  StateMark,
  type StateTone
} from '@bigpixelrocket/uiok/listing';
import { RunHeader } from '@bigpixelrocket/uiok/run';
import { tooltip } from '@bigpixelrocket/uiok/tooltip';

const INSTALL = 'npm install @bigpixelrocket/uiok react react-dom lucide-react';

const QUICK_START = `import '@bigpixelrocket/uiok/styles.css';
import { TooltipLayer, UiokProvider, wearThemes } from '@bigpixelrocket/uiok';
import { Button } from '@bigpixelrocket/uiok/button';
import { KeyChord } from '@bigpixelrocket/uiok/keychord';
import { tooltip } from '@bigpixelrocket/uiok/tooltip';

// Optional: any of the 18 themes, one per appearance.
wearThemes(document.documentElement, { light: 'solarized-light', dark: 'nord' });

export function App() {
  return (
    <UiokProvider>
      <Button variant="primary" {...tooltip('Save', '⌘S')}>
        Save
      </Button>
      <KeyChord chord={{ key: 's', meta: true }} />
      <TooltipLayer />
    </UiokProvider>
  );
}`;

const SERVICES: readonly {
  id: string;
  name: string;
  tone: StateTone;
  word: string;
  port: string;
}[] = [
  { id: 'web', name: 'web', tone: 'ready', word: 'running', port: '5173' },
  { id: 'db', name: 'postgres', tone: 'ready', word: 'running', port: '5432' },
  { id: 'queue', name: 'redis', tone: 'warning', word: 'degraded', port: '6379' },
  { id: 'mail', name: 'mailpit', tone: 'muted', word: 'stopped', port: '8025' }
];

/** Copies `text` and says so on the button for a moment. */
function CopyButton({ text }: { readonly text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <IconButton
      aria-label={copied ? 'Copied' : 'Copy'}
      className="copy-button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      size="small"
      {...tooltip(copied ? 'Copied' : 'Copy')}
    >
      <Copy size={ICON_SM} />
    </IconButton>
  );
}

/** The home page. */
export function Home() {
  return (
    <article className="home">
      <section className="hero">
        <p className="hero-prompt" aria-hidden="true">
          <span className="prompt-sigil">$</span> uiok --look retro
        </p>
        <h1 className="hero-title">UIOK</h1>
        <p className="hero-lede">
          A React 19 UI library with a retro look: compact controls set in system and monospace
          type, key caps and key legends that say what the keyboard does, and every colour drawn
          from one of 18 swappable themes. It comes out of the desktop apps Bigpixelrocket builds
          and works in any React app.
        </p>
        <div className="hero-actions">
          <Button onClick={() => (window.location.hash = '/components/listing')} variant="primary">
            Browse components
          </Button>
          <Button onClick={() => (window.location.hash = '/theming')} variant="tonal">
            Try the themes
          </Button>
          {/* The two links wrap as one, so neither is left alone on a row. */}
          <span className="hero-links">
            <a className="hero-link" href="https://github.com/Bigpixelrocket/uiok">
              GitHub
            </a>
            <a className="hero-link" href="https://www.npmjs.com/package/@bigpixelrocket/uiok">
              npm
            </a>
          </span>
        </div>
      </section>

      <section aria-label="A sample view" className="showcase listing-root">
        <div className="showcase-run">
          <RunHeader
            bar={{ fraction: 0.62, label: 'Whole transfer' }}
            facts={['108 MB of 175 MB', '256 of 412 files']}
            figure="0:42"
            headline="Copying 412 files to backup"
            state="running"
          />
        </div>
        <div className="pane showcase-pane">
          <div className="pane-list">
            <Listing
              columns={[
                { label: 'State' },
                { label: 'Port', align: 'right' },
                { label: 'Actions', hidden: true }
              ]}
              grid={`20px minmax(0, 1fr) ${column(10)} ${column(6)} 64px`}
              title="Services"
            >
              {SERVICES.map((service) => (
                <Row key={service.id} name={service.name} rowKey={service.id}>
                  <Cell>
                    <StateMark tone={service.tone} word={service.word} />
                  </Cell>
                  <Cell align="right">{service.port}</Cell>
                  <Cell className="pane-action-cell">
                    <span className="showcase-actions">
                      <IconButton
                        aria-label={`Restart ${service.name}`}
                        size="small"
                        {...tooltip('Restart')}
                      >
                        <RefreshCw size={ICON_SM} />
                      </IconButton>
                      <IconButton
                        aria-label={`Remove ${service.name}`}
                        size="small"
                        {...tooltip('Remove')}
                      >
                        <Trash2 size={ICON_SM} />
                      </IconButton>
                    </span>
                  </Cell>
                </Row>
              ))}
            </Listing>
          </div>
        </div>
        <p className="showcase-keys keycap">
          <KeyChord chord={{ key: 'ArrowUp' }} />
          <KeyChord chord={{ key: 'ArrowDown' }} /> move
          <KeyChord chord={{ key: 'Enter', meta: true }} /> start
          <KeyChord chord={{ key: 'Backspace', meta: true }} /> remove
          <KeyChord chord={{ key: 'Escape' }} /> leave
        </p>
      </section>

      <section className="home-section">
        <h2>Install</h2>
        <div className="code-block">
          <pre className="scroll-fade-x">
            <code>{INSTALL}</code>
          </pre>
          <CopyButton text={INSTALL} />
        </div>
        <p>
          <code>react</code>, <code>react-dom</code> 19, and <code>lucide-react</code> 1.31 or later
          within 1.x are peer dependencies. The package is ESM only and ships one module per
          component, so a bundler keeps only what you import; each area also has its own entry, such
          as <code>@bigpixelrocket/uiok/grid</code>.
        </p>
      </section>

      <section className="home-section">
        <h2>Quick start</h2>
        <p>
          Import the stylesheet once at your app&rsquo;s entry, mount <code>UiokProvider</code> and{' '}
          <code>TooltipLayer</code> near the root, then use the components:
        </p>
        <div className="code-block">
          <pre className="scroll-fade-x">
            <code>{QUICK_START}</code>
          </pre>
          <CopyButton text={QUICK_START} />
        </div>
      </section>

      <section className="home-section">
        <h2>What you get</h2>
        <ul className="feature-list">
          <li>
            <Play aria-hidden="true" size={ICON_MD} /> <a href="#/theming">Themes</a>: 18 light and
            dark palettes turned into one token set, worn through two attributes on the root.
          </li>
          <li>
            <Play aria-hidden="true" size={ICON_MD} /> <a href="#/keyboard">Keyboard</a>: an overlay
            contract, a browser-key guard, chords printed as glyphs and spoken as words.
          </li>
          <li>
            <Play aria-hidden="true" size={ICON_MD} /> <a href="#/labels">Labels</a>: shared chrome
            strings, English by default, replaced through one provider.
          </li>
          <li>
            <Download aria-hidden="true" size={ICON_MD} /> Components: listings and panes, a
            virtualised data grid, dialogs with key legends, a command palette, charts, a date
            picker, and more.
          </li>
        </ul>
      </section>
    </article>
  );
}
