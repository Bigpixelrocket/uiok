/**
 * Jump to offset in the hex view. An offset is typed in hex, as the offset
 * column prints it, with or without a `0x` prefix: `1F40` and `0x1F40` are
 * the same byte. Decimal is not read, so a number never means two bytes.
 * An offset past the file's last byte is refused with a message rather than
 * moved, so a typo never lands somewhere that looks right.
 */

import type { ViewerLabels } from '../labels/viewer.js';

import { formatOffset, offsetDigits } from './HexRows.logic.js';

/** A byte to go to, or why the typed offset is not one. */
export type JumpResult = { readonly offset: number } | { readonly error: string };

const HEX_OFFSET = /^(?:0x)?([0-9a-f]+)$/i;

/** The byte `input` names in a file of `sizeBytes` bytes, or why it names none. */
export function parseJumpOffset(
  input: string,
  sizeBytes: number,
  labels: ViewerLabels
): JumpResult {
  const match = HEX_OFFSET.exec(input.trim());
  if (match?.[1] === undefined) return { error: labels.hex.jumpInvalid };
  if (sizeBytes <= 0) return { error: labels.hex.jumpEmpty };

  // Read as a bigint, so an offset too long for a number is still past the end.
  const offset = BigInt(`0x${match[1]}`);
  const last = sizeBytes - 1;

  if (offset > BigInt(last)) {
    const digits = offsetDigits(sizeBytes);
    return {
      error: labels.hex.jumpPastEnd(match[1].toUpperCase(), formatOffset(last, digits))
    };
  }

  return { offset: Number(offset) };
}
