/**
 * The terminal's consumer smoke test (`pnpm run smoke:terminal`): builds and
 * packs the library, installs the tarball into a throwaway Vite app that
 * imports `@bigpixelrocket/uiok/terminal`, runs `vite build`, and checks that
 * the bundle emitted the engine's WebAssembly and the symbols font as files
 * and that the bundled code names each by its emitted path.
 *
 * It installs React and Vite from the npm registry, so it needs the network
 * and takes a minute; it stays out of `pnpm run check` and CI. The app is
 * a consumer's, so it installs with npm, and the library is packed with npm,
 * as the release publishes it. Run it after
 * changing how the terminal names its assets or how the package ships them.
 * Set `KEEP_SMOKE=1` to keep the temporary app for inspection.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const { name, peerDependencies } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

/** The Vite release the app builds with, pinned so a run is repeatable. */
const VITE_VERSION = '8.3.5';

const work = mkdtempSync(join(tmpdir(), 'uiok-smoke-terminal-'));
const app = join(work, 'app');
const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });

try {
  console.log('Building and packing the library…');
  run(process.execPath, [join(root, 'scripts', 'build.mjs')], root);
  const [pack] = JSON.parse(
    run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', work], root)
  );
  const tarball = join(work, pack.filename);

  execFileSync('mkdir', ['-p', join(app, 'src')]);
  writeFileSync(
    join(app, 'package.json'),
    JSON.stringify(
      {
        name: 'uiok-terminal-smoke',
        private: true,
        type: 'module',
        dependencies: {
          [name]: `file:${tarball}`,
          'lucide-react': peerDependencies['lucide-react'],
          react: peerDependencies.react,
          'react-dom': peerDependencies['react-dom'],
          vite: VITE_VERSION
        }
      },
      null,
      2
    )
  );
  writeFileSync(
    join(app, 'index.html'),
    '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.js"></script></body></html>\n'
  );
  // createElement rather than JSX, so the app needs no React plugin.
  writeFileSync(
    join(app, 'src', 'main.js'),
    [
      `import '${name}/styles.css';`,
      `import { Terminal } from '${name}/terminal';`,
      "import { createElement } from 'react';",
      "import { createRoot } from 'react-dom/client';",
      '',
      "createRoot(document.getElementById('root')).render(",
      "  createElement(Terminal, { ariaLabel: 'Terminal', onInput: () => {} })",
      ');',
      ''
    ].join('\n')
  );

  console.log(`Installing the tarball, React, and Vite ${VITE_VERSION}…`);
  run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], app);
  console.log('Running vite build…');
  run('npx', ['vite', 'build', '--logLevel', 'warn'], app);

  const assets = join(app, 'dist', 'assets');
  const files = readdirSync(assets);
  const code = files
    .filter((file) => file.endsWith('.js'))
    .map((file) => readFileSync(join(assets, file), 'utf8'))
    .join('\n');
  const problems = [];

  /** The emitted file whose name starts with `stem` and ends with `extension`, which the code must name. */
  const emitted = (stem, extension) => {
    const file = files.find((entry) => entry.startsWith(stem) && entry.endsWith(extension));
    if (file === undefined) problems.push(`${stem}*${extension}: not emitted into dist/assets`);
    else if (!code.includes(file)) problems.push(`${file}: emitted, but no bundled code names it`);
    return file;
  };
  const engine = emitted('ghostty-vt', '.wasm');
  const font = emitted('SymbolsNerdFontMono-Regular', '.woff2');

  // Vite inlines an asset under 4 KiB as a data: URL, which the runtime
  // decodes without fetching; either form is a working build.
  const effectsFile = files.find(
    (file) => file.startsWith('ghostty-effects') && file.endsWith('.wasm')
  );
  const effectsInlined = code.includes('data:application/wasm;base64,');
  if (effectsFile === undefined && !effectsInlined) {
    problems.push('ghostty-effects.wasm: neither emitted nor inlined as a data: URL');
  }
  if (problems.length > 0) {
    console.error(`Terminal smoke test failed:\n${problems.map((p) => `  ${p}`).join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Terminal smoke test passed (Vite ${VITE_VERSION}): ${engine}, ${font}, ` +
        `ghostty-effects ${effectsFile ?? 'inlined as a data: URL'}.`
    );
  }
} finally {
  if (process.env.KEEP_SMOKE === '1') console.log(`Kept ${work}`);
  else rmSync(work, { recursive: true, force: true });
}
