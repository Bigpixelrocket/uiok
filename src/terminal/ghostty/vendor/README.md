# Vendored libghostty-vt

WebAssembly built from source by `scripts/build-libghostty-vt.sh` with Zig 0.17.0 from
mise, from Ghostty `fb13fa9602f47590ccfaaea4cd8e178fac2ec8cc`, the revision in `VERSION`. The script
is adapted from T3 Code's `scripts/build-libghostty-wasm.sh` (commit `54084ae`, MIT, see
`../LICENSE`). `LICENSE` here is Ghostty's.

| File                   | Bytes   | SHA-256                                                            |
| ---------------------- | ------- | ------------------------------------------------------------------ |
| `ghostty-vt.wasm`      | 863,269 | `6d088cfe58051441da41c50af2dcb2810ababf0d2a3c6a4a8991b7c2e3e5b691` |
| `ghostty-effects.wasm` | 244     | `04e23a077977f6153702792f06580d0d4415efef5d29d13481bbc0a007af14e9` |

- `ghostty-vt.wasm` is `libghostty-vt` itself. It embeds the Ghostty revision as build metadata;
  `../runtimeAbi.test.ts` fails when that drifts from `VERSION`.
- `ghostty-effects.wasm` holds the callback trampolines, built from
  `scripts/ghostty-effects.zig`, that route a terminal's effects (its replies, its bell,
  and its color scheme queries) back to JavaScript. Its import names are compiled in and must match
  `../runtime.ts`.

Every build starts from an empty local Zig cache, so the same revision and Zig give these exact bytes.

To update: install the Zig that Ghostty's `build.zig.zon` asks for (`mise install zig@<version>`)
and set `ZIG_VERSION` in the script to it, write the new revision to `VERSION`, run
`scripts/build-libghostty-vt.sh`, update the table from its output, adapt `../runtime.ts`
and `../core.ts` to any change in upstream's `include/ghostty/vt/*.h`, and run
`npx vitest run src/terminal`.
