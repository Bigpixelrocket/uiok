import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { wasmDataUrlBytes } from './runtime.js';

const EFFECTS = new Uint8Array(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'vendor', 'ghostty-effects.wasm'))
);

describe('wasmDataUrlBytes', () => {
  it('decodes a module a bundler inlined, so no fetch of data: is needed', () => {
    const url = new URL(`data:application/wasm;base64,${Buffer.from(EFFECTS).toString('base64')}`);
    const bytes = wasmDataUrlBytes(url);
    expect(bytes).toEqual(EFFECTS);
    // The decoded trampolines compile as the fetched file would.
    expect(WebAssembly.validate(bytes!)).toBe(true);
  });

  it('leaves every other URL to fetch and refuses a data: URL it cannot read', () => {
    expect(wasmDataUrlBytes(new URL('https://example.com/ghostty-vt.wasm'))).toBeNull();
    expect(wasmDataUrlBytes(new URL('file:///tmp/ghostty-vt.wasm'))).toBeNull();
    expect(() => wasmDataUrlBytes(new URL('data:application/wasm,abc'))).toThrow(/base64/);
  });
});
