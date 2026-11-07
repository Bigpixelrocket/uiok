/** Sample data the demos share, generated so every visit draws the same. */

/** A small deterministic random source (mulberry32), so sample data is stable. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A file in the sample project. */
export interface SampleFile {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly size: number;
  readonly kind: string;
  readonly modified: number;
}

const NAMES = [
  'README.md',
  'package.json',
  'vite.config.ts',
  'src/main.tsx',
  'src/App.tsx',
  'src/routes/index.tsx',
  'src/routes/settings.tsx',
  'src/components/Header.tsx',
  'src/components/Sidebar.tsx',
  'src/lib/format.ts',
  'src/lib/fetchJson.ts',
  'public/favicon.svg',
  'public/robots.txt',
  'docs/getting-started.md',
  'docs/deploying.md',
  'tests/format.test.ts',
  'tests/App.test.tsx',
  '.github/workflows/ci.yml',
  'Better.Call.Saul.S01E01.1080p.BluRay.CtrlHD.mkv',
  'tsconfig.json'
];

const kindOf = (name: string): string => {
  const extension = /\.([a-z0-9]+)$/i.exec(name)?.[1] ?? '';
  return (
    {
      md: 'markdown',
      json: 'json',
      ts: 'typescript',
      tsx: 'tsx',
      svg: 'image',
      txt: 'text',
      yml: 'yaml',
      mkv: 'video'
    }[extension] ?? 'file'
  );
};

/** Twenty files of a small web project. */
export const FILES: readonly SampleFile[] = (() => {
  const random = seeded(7);
  return NAMES.map((path, index) => ({
    id: `f${index}`,
    name: path.split('/').at(-1) ?? path,
    path: `~/projects/site/${path}`,
    size: path.endsWith('.mkv') ? 1_874_219_008 : Math.round(200 + random() * 48_000),
    kind: kindOf(path),
    modified: Date.UTC(2026, 9, 1) + Math.round(random() * 30 * 86_400_000)
  }));
})();

/** Bytes as a short size: 12.4 KB. */
export function bytes(size: number): string {
  if (size < 1024) return `${size} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = size / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

/** A row of the sample orders table the grid draws. */
export interface Order {
  readonly id: number;
  readonly customer: string;
  readonly city: string;
  readonly product: string;
  readonly quantity: number;
  readonly total: number;
  readonly placed: string;
  readonly status: string;
}

const CUSTOMERS = [
  'Ada',
  'Grace',
  'Linus',
  'Margaret',
  'Dennis',
  'Barbara',
  'Ken',
  'Radia',
  'Edsger',
  'Frances'
];
const SURNAMES = [
  'Lovelace',
  'Hopper',
  'Torvalds',
  'Hamilton',
  'Ritchie',
  'Liskov',
  'Thompson',
  'Perlman',
  'Dijkstra',
  'Allen'
];
const CITIES = [
  'Lisbon',
  'Oslo',
  'Kyoto',
  'Austin',
  'Nairobi',
  'Lyon',
  'Tallinn',
  'Montréal',
  'Perth',
  'Bogotá'
];
const PRODUCTS = [
  'Keycap set',
  'CRT monitor',
  'Floppy drive',
  'Modem 56k',
  'Joystick',
  'Mechanical keyboard',
  'Trackball',
  'Dot-matrix printer'
];
const STATUSES = ['paid', 'shipped', 'pending', 'refunded'];

/** Ten thousand orders, made on demand by index. */
export const ORDER_COUNT = 10_000;

/** The order at `index`. */
export function orderAt(index: number): Order {
  const random = seeded(index + 1);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)] as T;
  const quantity = 1 + Math.floor(random() * 9);
  const unit = 9 + Math.round(random() * 400);
  const placed = new Date(Date.UTC(2026, 0, 1) + Math.floor(random() * 300) * 86_400_000);
  return {
    id: 10_000 + index,
    customer: `${pick(CUSTOMERS)} ${pick(SURNAMES)}`,
    city: pick(CITIES),
    product: pick(PRODUCTS),
    quantity,
    total: quantity * unit,
    placed: placed.toISOString().slice(0, 10),
    status: pick(STATUSES)
  };
}
