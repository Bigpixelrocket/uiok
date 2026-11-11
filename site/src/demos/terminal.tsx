/**
 * The terminal in its three uses: a read-only build log with colours (select
 * text, then ⌘C or a secondary click for the menu), a live terminal that
 * echoes what you type (Return starts a line, Ring the bell flashes it), and
 * an idle output well that has printed nothing yet.
 */

import { useEffect, useRef, useState } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { Terminal, type TerminalHandle } from '@bigpixelrocket/uiok/terminal';

const ESC = '\u001b';
const c = (code: string, text: string) => `${ESC}[${code}m${text}${ESC}[0m`;
const PROMPT = `${c('1;32', 'me@studio')} ${c('1;34', '~/projects/site')} ${c('33', '(main)')} $ `;

/** A build's output: a prompt, coloured tool output, a warning, an error, and a listing. */
const TRANSCRIPT = [
  `${PROMPT}npm run build`,
  '',
  '> site@1.4.0 build',
  '> vite build',
  '',
  `${c('36', 'vite v7.1.0')} ${c('32', 'building for production...')}`,
  `${c('32', '✓')} 1284 modules transformed.`,
  `${c('2', 'dist/')}index.html                  ${c('2', '0.46 kB')}`,
  `${c('2', 'dist/')}${c('35', 'assets/index-4f2a9c.css')}    ${c('2', '18.20 kB')}`,
  `${c('2', 'dist/')}${c('36', 'assets/index-8b1d0e.js')}    ${c('2', '214.71 kB')}`,
  `${c('33', '(!)')} Some chunks are larger than 500 kB after minification.`,
  `${c('31', 'error')} src/routes/settings.tsx:42:7 Type 'string' is not assignable to type 'number'.`,
  `${c('32', '✓ built in 2.41s')}`,
  '',
  `${PROMPT}ls`,
  `${c('1;34', 'dist')}  ${c('1;34', 'docs')}  ${c('1;34', 'src')}  package.json  README.md  ${c('1;32', 'deploy.sh')}`,
  PROMPT
].join('\r\n');

/**
 * The live terminal's host height: eight 19px lines, the engine's 4px inset
 * above and below them, and the host's padding and frame.
 */
const EIGHT_ROWS = {
  height: 'calc(8 * 19px + 2 * 4px + 2 * var(--space-4) + 2 * var(--line))'
} as const;

/** A read-only terminal fed the build log once. */
function BuildLog() {
  const ref = useRef<TerminalHandle>(null);

  useEffect(() => ref.current?.write(TRANSCRIPT), []);

  return <Terminal ariaLabel="Build log" ref={ref} />;
}

/** A writable terminal that echoes its keys, as a shell with no program would. */
function EchoTerminal() {
  const ref = useRef<TerminalHandle>(null);
  const [bells, setBells] = useState(0);

  useEffect(() => ref.current?.write(`Type here; this terminal echoes.\r\n${PROMPT}`), []);

  return (
    <div className="demo-stack">
      <div className="demo-terminal" style={EIGHT_ROWS}>
        <Terminal
          ariaLabel="Echo terminal"
          onBell={() => setBells((count) => count + 1)}
          onInput={(data) => {
            const terminal = ref.current;
            if (terminal === null) return;
            if (data === '\r') terminal.write(`\r\n${PROMPT}`);
            else if (data === '\u007f') terminal.write('\b \b');
            else terminal.write(data);
          }}
          ref={ref}
        />
      </div>
      <div className="demo-row">
        <Button onClick={() => ref.current?.write('\u0007')} size="small">
          Ring the bell
        </Button>
        <Button
          onClick={() => {
            ref.current?.reset();
            ref.current?.write(PROMPT);
            ref.current?.focus();
          }}
          size="small"
        >
          Clear
        </Button>
        <code className="demo-readout">bells: {bells}</code>
      </div>
    </div>
  );
}

/** The terminal page's demo. */
export function TerminalDemo() {
  return (
    <div className="demo-stack">
      <span className="demo-label">Read-only log</span>
      <div className="demo-terminal">
        <BuildLog />
      </div>
      <span className="demo-label">Live terminal</span>
      <EchoTerminal />
      <span className="demo-label">Idle output, nothing printed yet</span>
      <div className="demo-terminal short">
        <Terminal ariaLabel="Output" />
      </div>
    </div>
  );
}
