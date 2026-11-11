/**
 * Icon sizes for lucide's `size` prop, mirroring the `--icon-sm`, `--icon-md`,
 * `--icon-lg`, and `--icon-xl` tokens of `tokens.css`, which size icons drawn from CSS. An
 * icon takes its size from the text or control it sits beside, never a number
 * of its own.
 */

/** Beside 11 and 12 px text, and inside 20px inline controls. */
export const ICON_SM = 12;

/** Beside 13px text in rows, tabs, and buttons. */
export const ICON_MD = 14;

/** A dialog's title icon, an empty state's action, and a row's product mark. */
export const ICON_LG = 16;

/**
 * The glyph over an empty state or a failure. Drawn larger than `ICON_LG`, so
 * the icon passes `absoluteStrokeWidth` to keep the 2px stroke.
 */
export const ICON_XL = 28;
