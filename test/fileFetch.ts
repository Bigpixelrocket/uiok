/**
 * Serves the terminal's vendored assets through `fetch` for one suite. The
 * terminal names its WebAssembly with `new URL('./vendor/…',
 * import.meta.url)`, which Vite rewrites under Vitest to a path on the test
 * page's origin (`http://localhost:3000/src/…`) where no server listens, and
 * which native ESM leaves a `file:` URL Node's `fetch` refuses. Either way
 * the suite reads the bytes from disk instead, as a server would send them.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, vi } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The file on disk a request names, or null for one this helper does not serve. */
function localFile(url: URL): string | null {
  if (url.protocol === 'file:') return fileURLToPath(url);
  if (typeof location === 'undefined' || url.origin !== location.origin) return null;
  const path = decodeURIComponent(url.pathname);
  return path.startsWith('/@fs/') ? path.slice('/@fs'.length) : join(ROOT, path);
}

/** Answers local asset requests from disk (`.wasm` as `application/wasm`) in each test of the calling suite. */
export function serveFileUrls(): void {
  beforeEach(() => {
    const network = globalThis.fetch;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const file = localFile(new URL(input instanceof Request ? input.url : input));
      if (file === null) return network(input, init);
      const type = file.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream';
      return new Response(await readFile(file), { headers: { 'content-type': type } });
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
}
