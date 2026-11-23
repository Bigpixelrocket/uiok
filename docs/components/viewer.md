# File viewer (`@bigpixelrocket/uiok/viewer`)

A read-only viewer for one file: text with syntax highlighting and line numbers, hex, image, audio, video, or PDF, with a mode switch between the ways its kind can be shown. It reads only the bytes on screen, a bounded range at a time, so a 128 GB log opens as fast as a short one. The app supplies the file through a small reader interface; the viewer asks nothing else of it.

Imported on its own, never from the package root, so an app that shows no viewer never bundles its highlighting worker. Its look is in `@bigpixelrocket/uiok/styles.css`.

## Example

```tsx
import { ViewerWindow, isViewerCloseKey } from '@bigpixelrocket/uiok/viewer';

// A separate window per file: the reader is bound to that window's file.
<ViewerWindow
  isCloseKey={(stroke) => isViewerCloseKey(stroke) || (stroke.metaKey && stroke.key === 'y')}
  onClose={() => window.close()}
  reader={window.viewerBridge ?? null}
  trafficLights
/>;
```

`ViewerWindow` fills its container: give the window's root a height. Its keys, Escape to close, and Copy listen on the window and answer when aimed inside the viewer or at nothing (a window that shows only the viewer, with nothing focused); a key or Copy aimed at a control of the page beside it stays the page's. Mount one viewer per window or document: two would both answer a key aimed at nothing. Giving it another `reader` starts it afresh on that file; nothing the old reader answers late reaches it.

## `ViewerWindow` (`ViewerWindowProps`)

| Prop            | Type                                   | Meaning                                                                                                                                                                                     |
| --------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reader`        | `ViewerReader \| null`                 | How it reaches its one file; `null` shows the `unreachable` failure                                                                                                                         |
| `onClose`       | `() => void`                           | Puts the viewer away, on a close key, whatever it shows (a failure included)                                                                                                                |
| `isCloseKey`    | `(stroke: ViewerKeyStroke) => boolean` | Which keystrokes close it; Escape alone by default (`isViewerCloseKey`). A key a view takes first stays the view's (Escape clearing a selection); in full screen, Escape leaves full screen |
| `trafficLights` | `boolean`                              | The window's own buttons sit at the header's leading end (macOS over a hidden title bar): the name starts clear of them (`--traffic-light-inset`)                                           |
| `syntaxWorker`  | `SyntaxWorkerFactory \| null`          | Starts the highlighting worker; the viewer's own by default (`openSyntaxWorker`); `null` shows text plain and starts no worker                                                              |

The file is inspected once as the viewer opens and again each time its window comes to the front (`focus`). When the source no longer matches (`change`), a warning notice says so and offers Reload; a removed file gets a danger notice and no Reload. A native view that cannot show the file (an image that does not decode, a codec the browser does not play) hands over to its kind's fallback, source for an SVG and hex otherwise, with a note saying why. A reload starts every view afresh on the new generation.

## The reader (`ViewerReader`)

Every method acts on the same file and resolves to a `ViewerResult`: `{ ok: true, value }` or `{ ok: false, error: { message } }`, the message shown as it is. A promise that rejects is shown as the `noAnswer` label, so a reader need not catch its own transport failures. The shapes are plain data: an app's own schema-checked types fit as long as they carry these fields (extra fields are ignored).

| Method       | Takes                  | Answers                                                                                                                                                                      |
| ------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inspect`    |                        | `ViewerFileInfo`: `generation` (reloads so far), `name`, `sizeBytes`, `modifiedMs`, `content` (`kind`, `mimeType`), `change` since open, `mediaUrl`, and `origin` for a copy |
| `readRange`  | `{ offset, length }`   | `ViewerByteRange`: the `bytes` at `offset` (fewer past the end), `endOfFile`, and the `generation` they came from, so a read a reload overtook is dropped                    |
| `reload`     |                        | `ViewerFileInfo` of the file as it is now; a failure keeps the file the viewer had                                                                                           |
| `lineNumber` | `{ offset, encoding }` | `ViewerLineNumber`: the 1-based line holding byte `offset`, or `null` when the reader gave up on the ask. Until it answers, the gutter shows byte offsets                    |

A read never asks for more than `VIEWER_MAX_READ_BYTES` (1 MB). Content kinds: `text`, `binary`, `image`, `svg`, `audio`, `video`, `pdf`; each opens in its own view and can switch to hex (an SVG also to its source). The native views (image, audio, video, PDF) load `mediaUrl`; the text and hex views read through `readRange` alone. The PDF view loads `mediaUrl` with `/<file name>` appended, which the browser's PDF viewer shows as its title, so a PDF's `mediaUrl` must serve the file whatever last segment follows it: a custom scheme or a server route that ignores it, not a `blob:` URL.

The reader owns each `mediaUrl`'s lifetime: it must stay loadable for as long as its generation is open, since a switch to hex and back loads it again, and the reader retires it (revoking a `blob:` URL, say) once a reload opens the next generation or the viewer closes. A page that loads `mediaUrl` from a scheme of its own needs a Content Security Policy that allows it: `img-src` for images, `media-src` for audio and video, `frame-src` for a PDF.

The PDF view frames `mediaUrl` unsandboxed, since the browser's PDF viewer does not run in a sandboxed frame, so whatever that URL answers runs as a page in the viewer's frame. Serve it only from a source the app controls, only as the file's bytes with `Content-Type: application/pdf` and `X-Content-Type-Options: nosniff`, never as HTML (an error page included: answer a failure with a status and no body), and preferably from an origin other than the page's, such as a custom scheme of the host's; narrow the page's `frame-src` to that source.

## Syntax highlighting

The text view highlights 41 languages, found from the file's name, then a `#!` line. It tokenizes only the rows on screen, in a Web Worker running [Shiki](https://shiki.style) on its JavaScript regex engine (no WebAssembly), carrying each line's grammar state from the start of the file. A file over 16 MB, or a line over 4 KB, shows plain, and the status bar says why. Tokens paint through the theme's `--syntax-*` tokens, so a theme switch recolours them without tokenizing again.

Shiki is a dependency of this package, reached only from the worker: `ViewerWindow` starts it with `new Worker(new URL('./SyntaxWorker.js', import.meta.url), { type: 'module' })`, the standard form Vite, webpack 5, and Parcel emit as a chunk of its own, and the worker loads each grammar as a further chunk only when a file in that language opens. An app that imports nothing from `@bigpixelrocket/uiok/viewer` bundles none of it; one that shows only images bundles the worker's entry and no grammar. In Vite, set `worker: { format: 'es' }`: the default `iife` worker format cannot split, so every grammar would land in one worker of about 3 MB, where `es` gives a worker of about 120 KB and one chunk per grammar. In Vite's dev server, add the package to `optimizeDeps.exclude`, as for the terminal: pre-bundling moves the module away from the worker beside it. To keep highlighting off (a page whose policy forbids workers), pass `syntaxWorker={null}`.

## Keyboard

| Keys                               | In           | Does                                                                    |
| ---------------------------------- | ------------ | ----------------------------------------------------------------------- |
| ↑ ↓, Page Up, Page Down, Home, End | text, hex    | Scroll by a row, a screen, or to an end                                 |
| ⌘A, Shift with an arrow            | text, hex    | Select all, or extend the selection                                     |
| ⌘C                                 | text, hex    | Copy the selection (at most 1 MB), as text, or as hex in the hex column |
| ⌘L                                 | hex          | Go to Offset (an offset in hex, `1F40` or `0x1F40`)                     |
| Escape                             | text, hex    | Clear the selection, then close                                         |
| ⌘+, ⌘-, ⌘0, ⌘9, arrows             | image        | Zoom in, out, to actual size, to fit; pan a zoomed image                |
| Space, ← →, Home, End, F           | audio, video | Play or pause, seek 5 seconds, go to an end, full screen (video)        |

## Labels read

The `viewer` group of `UiokLabels` (`ViewerLabels`, `docs/labels.md`): the title and failures, the mode names, the facts line's words, the change notices, each view's status line, buttons, and fallbacks, and the `number`, `size`, and `dateTime` formats it writes them with. The Space key's name in the player's tooltip is `keys.names[' ']`.
