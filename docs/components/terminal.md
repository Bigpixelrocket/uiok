# Terminal (`@bigpixelrocket/uiok/terminal`)

A terminal surface: Ghostty's VT engine ([libghostty-vt](https://github.com/ghostty-org/ghostty), compiled to WebAssembly) drawn on a Canvas 2D surface. It parses and paints what a program prints, encodes keys, paste, and mouse reports for it, and keeps selection and scrollback. It is not an xterm.js compatibility layer, and it runs no program: the app connects it to one (a pseudo-terminal on a server, a WebSocket, a log stream) through `onInput` and the handle's `write`.

Import it by its own path. The package root does not export it, so an app that shows no terminal never loads its 2 MB of assets.

## Example

```tsx
import '@bigpixelrocket/uiok/styles.css';
import { Terminal, type TerminalHandle } from '@bigpixelrocket/uiok/terminal';

function Shell({ session }: { session: Session }) {
  const terminal = useRef<TerminalHandle>(null);

  useEffect(() => session.onOutput((data) => terminal.current?.write(data)), [session]);

  return (
    <Terminal
      ariaLabel="Terminal"
      className="shell"
      onConsumed={(units) => session.acknowledge(units)}
      onInput={(data) => session.send(data)}
      onResize={({ cols, rows }) => session.resize(cols, rows)}
      ref={terminal}
    />
  );
}
```

Without `onInput` the terminal is read-only, for a log: `<Terminal ariaLabel="Install log" ref={log} />`.

## Props

| Prop           | Type                                                    | What it does                                                                                                                        |
| -------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `ariaLabel`    | `string`                                                | The terminal's accessible name: on the input element of an interactive terminal, on the focusable group of a read-only one.         |
| `onInput`      | `(data: string) => void`                                | Keystrokes, pastes, mouse reports, and the terminal's own replies to queries, for the program. Absent makes the terminal read-only. |
| `onResize`     | `(size: TerminalSize) => void`                          | The grid in cells, after the first layout and on every later change.                                                                |
| `onConsumed`   | `(units: number) => void`                               | Called once a written chunk is parsed, with its length in UTF-16 code units, so a host can acknowledge output (see Flow control).   |
| `onBell`       | `() => void`                                            | Turns the visual bell on and hears every bell the program rings. Absent, a bell neither flashes nor reports.                        |
| `actionForKey` | `(stroke: TerminalKeyStroke) => TerminalAction \| null` | Binds chords to the terminal's own actions; read on every key. A keystroke it maps runs the action and never reaches the program.   |
| `menuChords`   | `TerminalMenuChords`                                    | The chords the menu shows beside Copy and Paste, the app's own for those verbs. Default `DEFAULT_TERMINAL_MENU_CHORDS`: ⌘C and ⌘V.  |
| `className`    | `string`                                                | A class for the host element, for its size and position only.                                                                       |
| `ref`          | `Ref<TerminalHandle>`                                   | The imperative handle below.                                                                                                        |

`TerminalHandle`:

| Method            | What it does                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `write(data)`     | Feeds output (text with VT escape sequences). Queued, parsed in the next animation frame right before it is painted.         |
| `reset()`         | Clears the screen and scrollback and resets every terminal mode.                                                             |
| `focus()`         | Moves keyboard focus into the terminal; a read-only terminal takes focus for selection only.                                 |
| `perform(action)` | Runs one of the terminal's actions as its chord would (a press on a legend's slot). Nothing happens on a read-only terminal. |

`TerminalAction` is `'clear' | 'line-start' | 'line-end' | 'word-back' | 'word-forward' | 'delete-to-line-start'`, macOS Terminal's: clear to start (the scrollback and the rows above the cursor, the program is not told), and readline's line-editing moves, sent as the bytes readline and zsh's line editor read (`⌃A`, `⌃E`, `⎋b`, `⎋f`, `⌃U`). The app decides which chords run them; UIOK binds none.

The engine loads lazily, once per page, on the first terminal. Writes, resets, and focus requests that arrive before it is ready are held and applied in order once it is. When it cannot start, the terminal shows `labels.terminal.startFailed` in its place as a danger notice (the tone bar and the alert glyph, `role="alert"`) on the terminal's own ground and keeps acknowledging written output, so a host's flow control never stalls on it.

## Scrollback

`TerminalScrollbackContext` sets how many rows of history every terminal under it keeps above its screen (`DEFAULT_TERMINAL_SCROLLBACK_LINES`, 10,000, without a provider). Terminals follow it while they run: a longer length keeps more of what comes next, a shorter one drops the oldest lines at once.

```tsx
<TerminalScrollbackContext.Provider value={preferences.scrollbackLines}>
  <App />
</TerminalScrollbackContext.Provider>
```

The history lives in the engine and ends with the terminal; nothing is written anywhere.

- **Lines, counted by the engine.** The engine's line limit counts physical rows and drops history only in whole pages, oldest first. The adapter (`ghostty/core.ts`) sets the chosen lines plus one page, so a terminal keeps at least the chosen lines and at most a page more. A page holds fewer rows the wider the grid (`ghosttyPageRows`: 673 at 80 columns, 271 at 200, from the page layout of the pinned Ghostty revision, checked against the engine by `runtimeAbi.test.ts`), so the adapter sets the limit again on every resize, first making room for a page at both widths so a reflow never drops a line the chosen length keeps.
- **Shared memory.** Every terminal on a page shares one WebAssembly memory, which wasm32 caps at 4 GiB. Each terminal's history is capped at a seventeenth of 3 GiB (about 180 MiB, `GHOSTTY_BUDGETED_TERMINALS`), so seventeen full histories never exhaust it. A page takes 448 KiB, about 8.5 bytes a cell, so the cap binds only at 50,000 lines on grids wider than about 445 columns. A filled 10,000-line history at 80 columns holds about 7.4 MiB.

## Flow control

`onConsumed` reports parsed output in UTF-16 code units, at the end of the parse that consumed everything written and before that frame draws. A host that stops reading its source while unacknowledged output exceeds a window (256 KiB works well) and resumes below half of it makes a flood (`yes`, `cat` of a large file) run at the terminal's pace instead of filling memory.

## Copy, paste, and the menu

- **Copy.** ⌘C, or an Edit menu's Copy, copies the selection as plain text through the document's `copy` event. The settled selection is always parked in a real DOM selection (the hidden input of an interactive terminal, a hidden copy buffer in a read-only one) so a menu-driven copy finds it.
- **Paste.** ⌘V pastes the clipboard's plain text through the `paste` event, bracketed (`ESC [200~` … `ESC [201~`) once the program asked for bracketed paste, so a shell never runs a pasted line on its own. Pasting brings a reader in scrollback back to the live screen. A read-only terminal pastes nothing.
- **No Cut.** A terminal's text cannot be cut: its `cut` event is cancelled, so ⌘X changes neither the clipboard nor the selection.
- **The menu.** A secondary click (the right button, or a Control-click) opens the terminal's menu at the point clicked: Copy, dimmed without a selection, and Paste, dimmed in a read-only terminal, each with its chord from `menuChords`. Its Copy and Paste use the web Clipboard API (`navigator.clipboard`), which needs a secure context and, for Paste, the page's clipboard-read permission; a refusal is logged and pastes nothing.
- **Mouse-tracking programs.** While a program tracks the mouse (vim, htop, tmux with the mouse on), the secondary click still opens the menu, and the program never hears the right button. The left and middle buttons and the wheel still reach it. A secondary press starts and ends no selection, so select, right-click, Copy works.
- **Links.** ⌘-click on a web link in the output calls `window.open(url, '_blank', 'noopener,noreferrer')`. An app that opens links elsewhere (a desktop shell's default browser) handles that call.

## The bell

The engine decides what is a bell: a BEL its parser executes in ground state or inside a control sequence. A BEL that ends an OSC string (`ESC ] 0 ; title BEL`) only ends it, and one inside a DCS, APC, PM, or SOS payload is data, so neither rings; scanning output for `0x07` cannot tell these apart. The engine reports a bell through an effect callback, routed to JavaScript by the trampoline module (`ghostty-effects.wasm`), and the terminal reports it once the parse returns, once per write however many rang.

A terminal given `onBell` flashes a veil of its text colour that fades over 280 ms (`BELL_FLASH_MS`, the same as `--duration-slow`), or under reduced motion a still tint at its edges for the same time. Bells less than 500 ms after a flash began fold into it, so a program ringing without pause flashes at most twice a second. Only the flash is limited: `onBell` hears every bell. A read-only terminal never rings.

## Keyboard

An interactive terminal takes every key into a hidden input element and encodes it for the program with Ghostty's key encoder, IME composition included, except the chords `actionForKey` claims. Its menu, while open, holds ↑ and ↓ (move), Return and Space (run the item), and Escape (close and give the terminal its keys back); they travel no further. The menu is an overlay (`data-overlay`, see [keyboard](keyboard.md)) and carries `data-native-keyboard`, so page-wide key handlers leave it alone. A press elsewhere closes it.

## Look

Colours come from the `--terminal-*` tokens every theme sets (`--terminal-bg`, `--terminal-fg`, `--terminal-cursor`, `--terminal-selection`, `--terminal-selection-text`, `--terminal-ansi-0` to `-15`), from which the terminal derives xterm's 256-colour palette. It reads them again on every appearance or theme change (`subscribeThemeChange`). On a page without UIOK's stylesheet it falls back to Catppuccin Mocha.

A cell's text keeps a minimum contrast of 4.5:1 against that cell's own background, as terminals with a "minimum contrast" setting do: a foreground under it (a truecolour or 256-colour shade near the ground, ANSI black on a dark ground) is drawn mixed toward white or black, whichever stands further from the cell's background, only as far as the floor needs, so its hue survives (a red error stays red, only lighter). Backgrounds, and block and box-drawing shapes, keep the colour the program asked for. Selected text is drawn in one ink, `--terminal-selection-text`, as a terminal's selection foreground is, held at the same floor against what is behind it: the selection laid over the cell's own background.

Text is `--font-mono` at 13px on 19px lines, 4px in from the mount's edges; a host padding the other 8px puts the text 12px from its edge, where a listing's path bar starts its own. A proportional face is refused for the engine's default monospace stack. The rules live in `terminal.css`, which `styles.css` imports: `.terminal` (the host, sized by `className`), `.terminal-mount`, `.terminal-canvas`, `.terminal-scrollbar`, `.terminal-failure`, and `.terminal-menu`.

- The scrollback thumb reads `--scrollbar-thumb`, and `--scrollbar-thumb-hover` while the pointer or the keyboard is on the rail.
- An unfocused terminal draws its cursor as a quiet 1px outline in the text colour at half strength, and none at all while nothing is on its screen, so an idle output well shows no stray box.
- The menu a secondary click opens is the menu look (`.folder-menu` and `.folder-menu-option`, with `.terminal-menu` and `.terminal-menu-item`), drawn through a portal on the document's body at `--z-dialog-popover`, so neither a scrolling pane nor a dialog clips it.
- A terminal that could not start says so in the interface face on the terminal's own ground.

## Assets

The terminal loads three files that ship beside its modules in `dist/terminal/ghostty/`:

| File                                      | Size   | What it is                                                                                                                              |
| ----------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `vendor/ghostty-vt.wasm`                  | 863 KB | libghostty-vt, built from the Ghostty revision in `vendor/VERSION`                                                                      |
| `vendor/ghostty-effects.wasm`             | 244 B  | The callback trampolines that carry a terminal's replies, bell, and colour scheme queries to JavaScript                                 |
| `fonts/SymbolsNerdFontMono-Regular.woff2` | 1.2 MB | The symbols-only Nerd Font, registered lazily as "Symbols Nerd Font Mono" so prompt glyphs render without a locally installed Nerd Font |

Each is named with `new URL('./…', import.meta.url)`:

- **Vite** emits them as files and rewrites the URLs; `npm run smoke:terminal` builds a Vite app from the packed tarball and checks it. **webpack 5** and **Parcel** document the same standard form but are untested. Vite inlines a file under 4 KiB as a `data:` URL, as it does the trampoline module; the terminal decodes that itself, so no `fetch` of `data:` is needed. In Vite's dev server, add the package to `optimizeDeps.exclude` (`optimizeDeps: { exclude: ['@bigpixelrocket/uiok'] }`): pre-bundling moves the modules away from their assets.
- **Native ESM** (an import map, or serving `node_modules`) resolves the URLs beside each module.
- **esbuild** leaves the expression as it is, so copy `node_modules/@bigpixelrocket/uiok/dist/terminal/ghostty/vendor` and `fonts` to the same paths beside the bundled module, or serve the package's `dist/` as is.

The page must allow WebAssembly compilation (`script-src 'wasm-unsafe-eval'` under a Content Security Policy) and fetching the asset URLs (`connect-src` for the wasm, `font-src` for the font). Serve `.wasm` as `application/wasm` for streaming compilation; any other type falls back to buffering.

## Labels read

The `terminal` group ([labels](../labels.md)): `menu` (the menu's accessible name), `copy` and `paste` (its items), `startFailed` (shown in place of a terminal that could not start), `input` (the input element's name when the engine is started without one), and `scrollback` (the scrollbar's accessible name). A terminal's own name is its `ariaLabel`, and its chords are `menuChords`, both per instance.

## Updating the engine

`scripts/build-libghostty-vt.sh` builds both WebAssembly files from source with Zig from mise; the trampolines come from `scripts/ghostty-effects.zig`. Every build starts from an empty Zig cache, so the same revision and Zig give the same bytes. To update: pin the Zig that Ghostty's `build.zig.zon` asks for in `mise.toml` (`mise use zig@<version>` at the repository root, which also updates `mise.lock`), write the new revision to `src/terminal/ghostty/vendor/VERSION`, run the script, update the table in `vendor/README.md` from its output, adapt `runtime.ts` and `core.ts` to any change in upstream's `include/ghostty/vt/*.h`, and run `npx vitest run src/terminal`. `runtimeAbi.test.ts` fails when the engine's embedded revision drifts from `VERSION` or its layouts from what the adapter reads. CI does not run the build.

## Licences

The engine is Ghostty's (MIT). The adapter, the build script, and the trampolines are adapted from [T3 Code](https://github.com/pingdotgg/t3code) (MIT). The font is Nerd Fonts' (MIT) and holds glyph sets under MIT, The Unlicense, CC BY 4.0, Apache 2.0, and SIL OFL 1.1; it is not covered by UIOK's own licence. The package's `NOTICE` names every one with its copyright and terms, and each vendored folder carries its upstream `LICENSE`.

## Files

```text
src/terminal/index.ts               # the public surface
src/terminal/Terminal.tsx           # the React shell: handle, held writes, theme follow, bell flash, menu
src/terminal/Terminal.logic.ts      # theme from tokens, font stack, action bytes, bell interval
src/terminal/TerminalMenu.tsx       # Copy and Paste menu, over TerminalMenu.logic.ts (items, keys, placement)
src/terminal/TerminalScrollback.ts  # TerminalScrollbackContext
src/terminal/terminal.css           # the look
src/terminal/ghostty/runtime.ts     # the page's one WebAssembly instance, struct layouts from its type manifest, effect trampolines
src/terminal/ghostty/core.ts        # one terminal's Ghostty handles as render snapshots; scrollback limits
src/terminal/ghostty/renderer.ts    # paints a snapshot; box drawing and blocks from spriteGlyphs.logic.ts
src/terminal/ghostty/surface.ts     # the DOM side: sizing, frames, keyboard and IME, clipboard, selection, mouse, links, cursor blink
src/terminal/ghostty/fallbackColors.ts # the only colour literals: the fallback theme and the engine's defaults
src/terminal/ghostty/vendor/        # the WebAssembly, VERSION, LICENSE, README
src/terminal/ghostty/fonts/         # the symbols font and its LICENSE
```
