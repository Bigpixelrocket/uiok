/**
 * The hex view's row layout. Row N holds bytes N×16 to N×16+15, printed as
 *
 *   00000000  4D 5A 50 00 02 00 00 00-04 00 0F 00 FF FF 00 00  MZP.............
 *
 * an offset of at least 8 uppercase hex digits (wider when the file's last
 * offset needs more, the same width on every row), the 16 bytes in two groups
 * of 8 joined by `-`, and the bytes again as text: printable ASCII as itself,
 * every other byte as `.`. A short last row is padded so its text lines up.
 */

/** Bytes per row; row N starts at byte N × 16. */
export const BYTES_PER_ROW = 16;

/** Bytes per group; a `-` joins the two groups of a row. */
const GROUP_BYTES = 8;

/** Characters of the hex column: two digits a byte and one separator between bytes. */
export const HEX_COLUMN_CHARS = BYTES_PER_ROW * 3 - 1;

/** Spaces between the offset and the hex column, and between the hex and text columns. */
export const COLUMN_GAP = '  ';

/** The fewest offset digits, enough for any offset below 4 GB. */
const MIN_OFFSET_DIGITS = 8;

const HEX_DIGITS: readonly string[] = Array.from({ length: 256 }, (_, byte) =>
  byte.toString(16).toUpperCase().padStart(2, '0')
);

/** Printable ASCII, 0x20 to 0x7E, prints as itself; every other byte as `.`. */
const TEXT_CHARS: readonly string[] = Array.from({ length: 256 }, (_, byte) =>
  byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '.'
);

/** The byte as two uppercase hex digits. */
export const hexByte = (byte: number): string => HEX_DIGITS[byte] ?? '??';

/** The byte as the text column prints it. */
export const textChar = (byte: number): string => TEXT_CHARS[byte] ?? '.';

/** Rows a file of `sizeBytes` bytes takes, the last one possibly short. */
export const rowCount = (sizeBytes: number): number => Math.ceil(sizeBytes / BYTES_PER_ROW);

/**
 * The offset column's width for a file: 8 digits, or as many as its last
 * offset needs. A file of exactly 4 GB ends at FFFFFFFF and keeps 8; one byte
 * more needs 9.
 */
export function offsetDigits(sizeBytes: number): number {
  return Math.max(MIN_OFFSET_DIGITS, Math.max(0, sizeBytes - 1).toString(16).length);
}

/** An offset in uppercase hex, zero-padded to `digits`. */
export const formatOffset = (offset: number, digits: number): string =>
  offset.toString(16).toUpperCase().padStart(digits, '0');

/**
 * A row's hex column: up to 16 bytes, a space between bytes and a `-`
 * between the two groups, padded with spaces to the full column so the text
 * column after it lines up on a short last row.
 */
export function hexColumn(bytes: Uint8Array): string {
  let column = '';

  for (let index = 0; index < BYTES_PER_ROW; index += 1) {
    const byte = bytes[index];
    if (index > 0) column += index === GROUP_BYTES && byte !== undefined ? '-' : ' ';
    column += byte === undefined ? '  ' : hexByte(byte);
  }

  return column;
}

/** A row's text column: one character a byte, padded with spaces to a full row. */
export function textColumn(bytes: Uint8Array): string {
  let column = '';

  for (let index = 0; index < BYTES_PER_ROW; index += 1) {
    const byte = bytes[index];
    column += byte === undefined ? ' ' : textChar(byte);
  }

  return column;
}

/** A whole row as one line, the way the view lays it out. */
export function formatRow(offset: number, bytes: Uint8Array, digits: number): string {
  return [formatOffset(offset, digits), hexColumn(bytes), textColumn(bytes)].join(COLUMN_GAP);
}

/** Characters in a row's line: offset, gap, hex column, gap, text column. */
export const lineChars = (digits: number): number =>
  digits + COLUMN_GAP.length * 2 + HEX_COLUMN_CHARS + BYTES_PER_ROW;

/** Which column a byte was picked in, which decides the form copy takes. */
export type HexColumn = 'hex' | 'text';

/**
 * The byte under character `char` of a row's line, counted from the line's
 * start, and the column it is in. The offset and the gap after it point at
 * the first byte; the gap between the columns splits between the hex
 * column's last byte and the text column's first; anything past the text
 * column points at the last byte.
 */
export function cellAt(
  char: number,
  digits: number
): { readonly column: HexColumn; readonly index: number } {
  const hexStart = digits + COLUMN_GAP.length;
  const textStart = hexStart + HEX_COLUMN_CHARS + COLUMN_GAP.length;
  const clampIndex = (index: number): number =>
    Math.min(BYTES_PER_ROW - 1, Math.max(0, Math.floor(index)));

  return char < textStart - 1
    ? { column: 'hex', index: clampIndex((char - hexStart) / 3) }
    : { column: 'text', index: clampIndex(char - textStart) };
}
