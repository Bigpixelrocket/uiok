/**
 * The page's single libghostty-vt WebAssembly instance and its C ABI helpers:
 * export calls, allocation, struct layouts read from the module's own type
 * manifest, and the callback trampolines for a terminal's effects (its
 * replies, its bell, and its color scheme). Every terminal shares this
 * instance and owns (and frees) its own handles inside it.
 */

// Each asset is a URL built from a relative string literal and the module's
// own URL (import.meta.url): the standard form Vite emits as files (tested by
// npm run smoke:terminal; webpack 5 and Parcel document it too, untested) and
// native ESM resolves beside this module, so the path must stay a literal
// (docs/components/terminal.md, Assets).
const GHOSTTY_WASM_URL = new URL('./vendor/ghostty-vt.wasm', import.meta.url);
const GHOSTTY_EFFECTS_WASM_URL = new URL('./vendor/ghostty-effects.wasm', import.meta.url);

type WasmFunction = (...args: Array<number | bigint>) => number;

interface TypeField {
  readonly offset: number;
  readonly size: number;
  /** A scalar (`u8`, `i32`, ...), `pointer`, or the name of another manifest type. */
  readonly type: string;
}

/** A C struct's size, alignment, and field offsets as libghostty-vt reports them. */
export interface TypeLayout {
  readonly size: number;
  readonly align: number;
  readonly fields: Readonly<Record<string, TypeField>>;
}

/**
 * One entry of the type manifest: a struct, union, enum (backed by
 * `underlying`), alias (of `type`), or opaque handle.
 */
interface ManifestType extends Partial<TypeLayout> {
  readonly kind: string;
  readonly underlying?: string;
  readonly type?: string;
}

/** `ghostty_type_json`'s manifest, the schema version this adapter reads. */
interface TypeManifest {
  readonly schema: number;
  readonly abi: { readonly pointer_size: number; readonly usize_size: number };
  readonly types: Readonly<Record<string, ManifestType>>;
}

const TYPE_MANIFEST_SCHEMA = 1;

const textDecoder = new TextDecoder();

/** `GHOSTTY_TERMINAL_OPT_USERDATA`: the value every effect callback receives. */
const OPTION_USERDATA = 0;
/** `GHOSTTY_TERMINAL_OPT_WRITE_PTY`: the callback for the terminal's replies. */
const OPTION_WRITE_PTY = 1;
/** `GHOSTTY_TERMINAL_OPT_BELL`: the callback for a BEL the parser executes. */
const OPTION_BELL = 2;
/** `GHOSTTY_TERMINAL_OPT_COLOR_SCHEME`: the callback that answers `CSI ? 996 n`. */
const OPTION_COLOR_SCHEME = 7;

/** `GhosttyColorScheme`, which the color scheme callback writes as an `i32`. */
const COLOR_SCHEME_VALUE = { light: 0, dark: 1 } as const;

/** Whether a terminal's colors read as light or dark, as `CSI ? 996 n` reports it. */
export type GhosttyColorScheme = keyof typeof COLOR_SCHEME_VALUE;

/**
 * What one terminal does with the effects it reports while it parses. Each
 * runs synchronously inside `ghostty_terminal_vt_write` and must not write to
 * the terminal again.
 */
export interface GhosttyTerminalEffects {
  /** The terminal's own replies (device status, queries), for the program. */
  readonly writePty: (data: string) => void;
  /**
   * A BEL the parser executed: in ground state or inside a control
   * sequence, never one that ends an OSC string or sits in a DCS, APC, PM,
   * or SOS payload.
   */
  readonly bell: () => void;
  /** The scheme `CSI ? 996 n` reports. */
  readonly colorScheme: () => GhosttyColorScheme;
}

/**
 * A wasm32 address as JavaScript must index memory with it. The module's
 * pointer results and callback arguments are `i32`, which JavaScript reads as
 * signed, so an address past 2 GiB (several full histories) would come back
 * negative; addresses passed into the module wrap back to the same bits.
 */
function wasmPointer(value: number): number {
  return value >>> 0;
}

/**
 * The bytes of a base64 `data:` URL, or null for any other URL. A bundler
 * may inline a small asset (the 244-byte trampoline module) as one, and a
 * page's Content Security Policy rarely lets `fetch` read `data:`, so the
 * bytes are decoded here instead of fetched.
 */
export function wasmDataUrlBytes(url: URL): Uint8Array<ArrayBuffer> | null {
  if (url.protocol !== 'data:') return null;
  const comma = url.href.indexOf(',');
  if (comma < 0 || !url.href.slice(0, comma).endsWith(';base64')) {
    throw new Error('A WebAssembly data: URL must be base64');
  }
  return Uint8Array.from(atob(url.href.slice(comma + 1)), (character) => character.charCodeAt(0));
}

/**
 * Compiles a module from its URL, streaming when the response allows it.
 * Streaming compilation requires the server to send `.wasm` as
 * `application/wasm`; any other response falls back to buffering.
 */
async function instantiateWasm(
  url: URL,
  imports: WebAssembly.Imports,
  failure: string
): Promise<WebAssembly.Instance> {
  const inline = wasmDataUrlBytes(url);
  if (inline !== null) return (await WebAssembly.instantiate(inline, imports)).instance;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${failure} (${response.status})`);
  if (
    typeof WebAssembly.instantiateStreaming === 'function' &&
    response.headers.get('content-type')?.startsWith('application/wasm') === true
  ) {
    return (await WebAssembly.instantiateStreaming(response, imports)).instance;
  }
  return (await WebAssembly.instantiate(await response.arrayBuffer(), imports)).instance;
}

/** The loaded libghostty-vt module; obtain it through `loadGhosttyRuntime`. */
export class GhosttyRuntime {
  readonly memory: WebAssembly.Memory;
  private readonly types: TypeManifest['types'];
  private readonly exports: WebAssembly.Exports;
  private memoryView: DataView;
  private heap: Uint8Array;
  private readonly effects = new Map<number, GhosttyTerminalEffects>();
  private nextEffectsId = 1;
  private writePtyFunctionIndex = 0;
  private bellFunctionIndex = 0;
  private colorSchemeFunctionIndex = 0;

  private constructor(instance: WebAssembly.Instance) {
    this.exports = instance.exports;
    const memory = instance.exports['memory'];
    if (!(memory instanceof WebAssembly.Memory)) {
      throw new Error('libghostty-vt did not export WebAssembly memory');
    }
    // Growing an unshared memory detaches its old buffer, which is how `heapBytes`
    // notices a grow without reading `memory.buffer` on every call.
    if (Object.prototype.toString.call(memory.buffer) === '[object SharedArrayBuffer]') {
      throw new Error('libghostty-vt memory must not be shared');
    }
    this.memory = memory;
    this.memoryView = new DataView(memory.buffer);
    this.heap = new Uint8Array(memory.buffer);
    const jsonPointer = this.callPointer('ghostty_type_json');
    const bytes = new Uint8Array(memory.buffer);
    let end = jsonPointer;
    while (end < bytes.length && bytes[end] !== 0) end += 1;
    const manifest = JSON.parse(
      textDecoder.decode(bytes.subarray(jsonPointer, end))
    ) as TypeManifest;
    // Every offset, size, and pointer read below assumes this manifest
    // version on wasm32; another build fails here, not with corrupt memory.
    if (
      manifest.schema !== TYPE_MANIFEST_SCHEMA ||
      manifest.abi.pointer_size !== 4 ||
      manifest.abi.usize_size !== 4
    ) {
      throw new Error(`Unsupported libghostty-vt type manifest (schema ${manifest.schema})`);
    }
    this.types = manifest.types;
  }

  /** Fetches and instantiates both modules; prefer the memoized `loadGhosttyRuntime`. */
  static async load(): Promise<GhosttyRuntime> {
    const instance = await instantiateWasm(GHOSTTY_WASM_URL, {}, 'Unable to load libghostty-vt');
    const runtime = new GhosttyRuntime(instance);
    await runtime.installEffectTrampolines();
    return runtime;
  }

  /** Calls a libghostty-vt export by name. */
  call(name: string, ...args: Array<number | bigint>): number {
    const fn = this.exports[name];
    if (typeof fn !== 'function') {
      throw new Error(`libghostty-vt export is unavailable: ${name}`);
    }
    return (fn as WasmFunction)(...args);
  }

  /**
   * A libghostty-vt export by name, for a loop that calls it per cell without
   * `call`'s lookup and argument array.
   */
  exportedFunction(name: string): (...args: number[]) => number {
    const fn = this.exports[name];
    if (typeof fn !== 'function') {
      throw new Error(`libghostty-vt export is unavailable: ${name}`);
    }
    return fn as (...args: number[]) => number;
  }

  /** Calls a libghostty-vt export that returns a pointer, as an unsigned address. */
  callPointer(name: string, ...args: Array<number | bigint>): number {
    return wasmPointer(this.call(name, ...args));
  }

  /** The layout of a named C struct. */
  layout(name: string): TypeLayout {
    const type = this.types[name];
    if (type?.kind !== 'struct' || type.size === undefined || type.fields === undefined) {
      throw new Error(`libghostty-vt type layout is unavailable: ${name}`);
    }
    return type as TypeLayout;
  }

  /** Allocates `size` zeroed bytes inside the module's memory; `size` must be positive. */
  alloc(size: number): number {
    const pointer = this.callPointer('ghostty_wasm_alloc', size);
    if (pointer === 0) throw new Error(`libghostty-vt failed to allocate ${size} bytes`);
    new Uint8Array(this.memory.buffer, pointer, size).fill(0);
    return pointer;
  }

  /** Frees an `alloc` allocation; a null pointer is ignored. */
  free(pointer: number, size: number): void {
    if (pointer !== 0) this.call('ghostty_wasm_free', pointer, size);
  }

  /**
   * Allocates a pointer slot for a `*_new` call to fill. The engine starts it
   * null, so dispose paths that run after a partial initialization never free
   * a garbage pointer.
   */
  allocOpaque(): number {
    const pointer = this.callPointer('ghostty_wasm_alloc_opaque');
    if (pointer === 0) throw new Error('libghostty-vt failed to allocate an opaque pointer');
    return pointer;
  }

  /** Frees an `allocOpaque` slot; a null pointer is ignored. */
  freeOpaque(pointer: number): void {
    if (pointer !== 0) this.call('ghostty_wasm_free_opaque', pointer);
  }

  /** Reads the pointer stored in a slot. */
  readPointer(slot: number): number {
    return this.currentMemoryView().getUint32(slot, true);
  }

  /**
   * Routes a terminal's replies, its bell, and its color scheme queries to
   * `effects`; returns the id that detaches them. The engine passes every
   * callback the same userdata, so one id carries them all.
   */
  attachEffects(terminal: number, effects: GhosttyTerminalEffects): number {
    if (
      this.writePtyFunctionIndex === 0 ||
      this.bellFunctionIndex === 0 ||
      this.colorSchemeFunctionIndex === 0
    ) {
      throw new Error('libghostty-vt callback trampolines are unavailable');
    }
    const id = this.nextEffectsId++;
    this.effects.set(id, effects);
    this.call('ghostty_terminal_set', terminal, OPTION_USERDATA, id);
    this.call('ghostty_terminal_set', terminal, OPTION_WRITE_PTY, this.writePtyFunctionIndex);
    this.call('ghostty_terminal_set', terminal, OPTION_BELL, this.bellFunctionIndex);
    this.call('ghostty_terminal_set', terminal, OPTION_COLOR_SCHEME, this.colorSchemeFunctionIndex);
    return id;
  }

  /** Stops routing a terminal's effects. */
  detachEffects(terminal: number, id: number): void {
    this.call('ghostty_terminal_set', terminal, OPTION_COLOR_SCHEME, 0);
    this.call('ghostty_terminal_set', terminal, OPTION_BELL, 0);
    this.call('ghostty_terminal_set', terminal, OPTION_WRITE_PTY, 0);
    this.call('ghostty_terminal_set', terminal, OPTION_USERDATA, 0);
    this.effects.delete(id);
  }

  /** A DataView over module memory; recreate it after any call that can grow memory. */
  view(pointer: number, size?: number): DataView {
    return new DataView(this.memory.buffer, pointer, size);
  }

  /** A byte view over module memory; recreate it after any call that can grow memory. */
  bytes(pointer: number, size: number): Uint8Array {
    return new Uint8Array(this.memory.buffer, pointer, size);
  }

  /**
   * Every byte of module memory as one view, kept until a grow detaches it,
   * for loops that read many small values. Fetch it again after any call that
   * can grow memory.
   */
  heapBytes(): Uint8Array {
    if (this.heap.length === 0) this.heap = new Uint8Array(this.memory.buffer);
    return this.heap;
  }

  /** Reuse scalar reads across cells, refreshing after any terminal grows shared WASM memory. */
  private currentMemoryView(): DataView {
    if (this.memoryView.buffer !== this.memory.buffer) {
      this.memoryView = new DataView(this.memory.buffer);
    }
    return this.memoryView;
  }

  /** Writes a scalar struct field by name. */
  setField(pointer: number, structName: string, fieldName: string, value: number): void {
    const field = this.layout(structName).fields[fieldName];
    if (!field) throw new Error(`libghostty-vt field is unavailable: ${structName}.${fieldName}`);
    const view = this.currentMemoryView();
    const offset = pointer + field.offset;
    switch (this.scalarType(field)) {
      case 'bool':
      case 'u8':
        view.setUint8(offset, value);
        return;
      case 'u16':
        view.setUint16(offset, value, true);
        return;
      case 'i32':
        view.setInt32(offset, value, true);
        return;
      case 'u32':
        view.setUint32(offset, value, true);
        return;
      case 'u64':
        view.setBigUint64(offset, BigInt(value), true);
        return;
      default:
        throw new Error(`Unsupported libghostty-vt field type: ${field.type}`);
    }
  }

  /** Reads a scalar struct field by name. */
  readField(pointer: number, structName: string, fieldName: string): number {
    const field = this.layout(structName).fields[fieldName];
    if (!field) throw new Error(`libghostty-vt field is unavailable: ${structName}.${fieldName}`);
    const view = this.currentMemoryView();
    const offset = pointer + field.offset;
    switch (this.scalarType(field)) {
      case 'bool':
      case 'u8':
        return view.getUint8(offset);
      case 'u16':
        return view.getUint16(offset, true);
      case 'i32':
        return view.getInt32(offset, true);
      case 'u32':
        return view.getUint32(offset, true);
      case 'u64':
        return Number(view.getBigUint64(offset, true));
      default:
        throw new Error(`Unsupported libghostty-vt field type: ${field.type}`);
    }
  }

  /**
   * A field's scalar type: an enum reads as its backing integer, an alias as
   * the type it names, and a pointer as `u32`.
   */
  private scalarType(field: TypeField): string {
    if (field.type === 'pointer') return 'u32';
    const named = this.types[field.type];
    if (named?.kind === 'enum' && named.underlying !== undefined) return named.underlying;
    if (named?.kind === 'alias' && named.type !== undefined) return named.type;
    return field.type;
  }

  private async installEffectTrampolines(): Promise<void> {
    // The import names are compiled into the trampoline module from
    // `scripts/ghostty-effects.zig`; change both together.
    const trampolines = await instantiateWasm(
      GHOSTTY_EFFECTS_WASM_URL,
      {
        env: {
          write_pty: (_terminal: number, userdata: number, pointer: number, length: number) => {
            const effects = this.effects.get(userdata);
            if (!effects || length === 0) return;
            effects.writePty(
              textDecoder.decode(new Uint8Array(this.memory.buffer, wasmPointer(pointer), length))
            );
          },
          bell: (_terminal: number, userdata: number) => this.effects.get(userdata)?.bell(),
          color_scheme: (_terminal: number, userdata: number, out: number): boolean => {
            const effects = this.effects.get(userdata);
            if (!effects) return false;
            this.currentMemoryView().setInt32(
              wasmPointer(out),
              COLOR_SCHEME_VALUE[effects.colorScheme()],
              true
            );
            return true;
          }
        }
      },
      'Unable to load the libghostty-vt callback trampolines'
    );
    this.writePtyFunctionIndex = this.addCallback(trampolines.exports['ghostty_write_pty']);
    this.bellFunctionIndex = this.addCallback(trampolines.exports['ghostty_bell']);
    this.colorSchemeFunctionIndex = this.addCallback(trampolines.exports['ghostty_color_scheme']);
  }

  /** Adds a trampoline to the module's callback table; returns its index for `ghostty_terminal_set`. */
  private addCallback(trampoline: unknown): number {
    const table = this.exports['__indirect_function_table'];
    if (typeof trampoline !== 'function' || !(table instanceof WebAssembly.Table)) {
      throw new Error('libghostty-vt did not expose its callback table');
    }
    const index = table.length;
    // grow-then-set instead of grow(1, fn): WebKit stores a grow init value
    // with broken type information and every later call_indirect through the
    // entry traps with a signature mismatch. table.set canonicalizes correctly.
    table.grow(1);
    table.set(index, trampoline);
    return index;
  }
}

let runtimePromise: Promise<GhosttyRuntime> | null = null;

/** The page's shared runtime, loaded on first use; a failed load is retried by the next call. */
export function loadGhosttyRuntime(): Promise<GhosttyRuntime> {
  runtimePromise ??= GhosttyRuntime.load().catch((error: unknown) => {
    runtimePromise = null;
    throw error;
  });
  return runtimePromise;
}
