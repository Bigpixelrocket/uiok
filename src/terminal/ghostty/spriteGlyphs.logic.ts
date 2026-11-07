/**
 * Block elements and box drawing as shapes computed from the cell box, the way
 * Ghostty's sprite font draws them (`src/font/sprite/draw/block.zig` and
 * `box.zig` upstream). A font's glyphs for these characters rarely fill the
 * cell, so text drawn with `fillText` leaves seams between neighbours; shapes
 * that reach the cell's edges exactly tile into solid art and joined lines.
 *
 * Every size here is in whole device pixels: the renderer rounds each cell's
 * edges to device pixels before asking, so neighbouring cells share an edge.
 */

/** A filled rectangle by its edges, in device pixels from the cell's top-left corner. */
export interface GhosttySpriteRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * A rounded corner stroked with butt caps along one path: a straight line in
 * from a cell edge (`start` to `bendStart`), a cubic Bézier through two
 * control points, and a straight line out to another edge (`bendEnd` to
 * `end`). Points are in device pixels from the cell's top-left corner.
 */
export interface GhosttySpriteArc {
  readonly lineWidth: number;
  readonly startX: number;
  readonly startY: number;
  readonly bendStartX: number;
  readonly bendStartY: number;
  readonly control1X: number;
  readonly control1Y: number;
  readonly control2X: number;
  readonly control2Y: number;
  readonly bendEndX: number;
  readonly bendEndY: number;
  readonly endX: number;
  readonly endY: number;
}

/** One character's shapes, all filled or stroked in the cell's foreground colour. */
export interface GhosttySpriteGlyph {
  /** The opacity the shapes are painted at: 1, or a shade's coverage. */
  readonly alpha: number;
  readonly rects: readonly GhosttySpriteRect[];
  readonly arc: GhosttySpriteArc | null;
}

const BOX_FIRST = 0x2500;
const BLOCK_LAST = 0x259f;
const DIAGONAL_FIRST = 0x2571;
const DIAGONAL_LAST = 0x2573;

/**
 * Underline thickness as a share of the font size, standing in for the face's
 * own figure, which canvas text metrics do not expose. Typical monospace faces
 * (SF Mono, Menlo, JetBrains Mono) sit near 0.05 em.
 */
const UNDERLINE_EM = 0.05;

/**
 * The light line thickness in device pixels for a font size and pixel ratio.
 * Ghostty uses the face's underline thickness rounded up to a whole pixel;
 * heavy lines are twice this.
 */
export function ghosttySpriteThickness(fontSize: number, pixelRatio: number): number {
  // The small slack keeps a product that lands a hair above a whole pixel
  // through floating point from rounding up to the next one.
  return Math.max(1, Math.ceil(fontSize * pixelRatio * UNDERLINE_EM - 1e-6));
}

/**
 * The codepoint a cell's text is drawn procedurally as, or -1 when it stays on
 * the font path: anything but a single character in Box Drawing or Block
 * Elements, and the three diagonals, which need clipping to the cell.
 */
export function ghosttySpriteCodepoint(text: string): number {
  if (text.length !== 1) return -1;
  const codepoint = text.charCodeAt(0);
  if (codepoint < BOX_FIRST || codepoint > BLOCK_LAST) return -1;
  if (codepoint >= DIAGONAL_FIRST && codepoint <= DIAGONAL_LAST) return -1;
  return codepoint;
}

// Shade coverage, as Ghostty's `Shade` enum: 0x40, 0x80, and 0xc0 out of 0xff.
const SHADE_LIGHT = 0x40 / 0xff;
const SHADE_MEDIUM = 0x80 / 0xff;
const SHADE_DARK = 0xc0 / 0xff;

/**
 * Each line-drawing character's four arms, in the order up, right, down,
 * left: `-` none, `l` light, `h` heavy, `d` double. Transcribed from
 * `box.zig`'s `linesChar` calls.
 */
const LINES: Readonly<Record<number, string>> = {
  0x2500: '-l-l', // ─
  0x2501: '-h-h', // ━
  0x2502: 'l-l-', // │
  0x2503: 'h-h-', // ┃
  0x250c: '-ll-', // ┌
  0x250d: '-hl-', // ┍
  0x250e: '-lh-', // ┎
  0x250f: '-hh-', // ┏
  0x2510: '--ll', // ┐
  0x2511: '--lh', // ┑
  0x2512: '--hl', // ┒
  0x2513: '--hh', // ┓
  0x2514: 'll--', // └
  0x2515: 'lh--', // ┕
  0x2516: 'hl--', // ┖
  0x2517: 'hh--', // ┗
  0x2518: 'l--l', // ┘
  0x2519: 'l--h', // ┙
  0x251a: 'h--l', // ┚
  0x251b: 'h--h', // ┛
  0x251c: 'lll-', // ├
  0x251d: 'lhl-', // ┝
  0x251e: 'hll-', // ┞
  0x251f: 'llh-', // ┟
  0x2520: 'hlh-', // ┠
  0x2521: 'hhl-', // ┡
  0x2522: 'lhh-', // ┢
  0x2523: 'hhh-', // ┣
  0x2524: 'l-ll', // ┤
  0x2525: 'l-lh', // ┥
  0x2526: 'h-ll', // ┦
  0x2527: 'l-hl', // ┧
  0x2528: 'h-hl', // ┨
  0x2529: 'h-lh', // ┩
  0x252a: 'l-hh', // ┪
  0x252b: 'h-hh', // ┫
  0x252c: '-lll', // ┬
  0x252d: '-llh', // ┭
  0x252e: '-hll', // ┮
  0x252f: '-hlh', // ┯
  0x2530: '-lhl', // ┰
  0x2531: '-lhh', // ┱
  0x2532: '-hhl', // ┲
  0x2533: '-hhh', // ┳
  0x2534: 'll-l', // ┴
  0x2535: 'll-h', // ┵
  0x2536: 'lh-l', // ┶
  0x2537: 'lh-h', // ┷
  0x2538: 'hl-l', // ┸
  0x2539: 'hl-h', // ┹
  0x253a: 'hh-l', // ┺
  0x253b: 'hh-h', // ┻
  0x253c: 'llll', // ┼
  0x253d: 'lllh', // ┽
  0x253e: 'lhll', // ┾
  0x253f: 'lhlh', // ┿
  0x2540: 'hlll', // ╀
  0x2541: 'llhl', // ╁
  0x2542: 'hlhl', // ╂
  0x2543: 'hllh', // ╃
  0x2544: 'hhll', // ╄
  0x2545: 'llhh', // ╅
  0x2546: 'lhhl', // ╆
  0x2547: 'hhlh', // ╇
  0x2548: 'lhhh', // ╈
  0x2549: 'hlhh', // ╉
  0x254a: 'hhhl', // ╊
  0x254b: 'hhhh', // ╋
  0x2550: '-d-d', // ═
  0x2551: 'd-d-', // ║
  0x2552: '-dl-', // ╒
  0x2553: '-ld-', // ╓
  0x2554: '-dd-', // ╔
  0x2555: '--ld', // ╕
  0x2556: '--dl', // ╖
  0x2557: '--dd', // ╗
  0x2558: 'ld--', // ╘
  0x2559: 'dl--', // ╙
  0x255a: 'dd--', // ╚
  0x255b: 'l--d', // ╛
  0x255c: 'd--l', // ╜
  0x255d: 'd--d', // ╝
  0x255e: 'ldl-', // ╞
  0x255f: 'dld-', // ╟
  0x2560: 'ddd-', // ╠
  0x2561: 'l-ld', // ╡
  0x2562: 'd-dl', // ╢
  0x2563: 'd-dd', // ╣
  0x2564: '-dld', // ╤
  0x2565: '-ldl', // ╥
  0x2566: '-ddd', // ╦
  0x2567: 'ld-d', // ╧
  0x2568: 'dl-l', // ╨
  0x2569: 'dd-d', // ╩
  0x256a: 'ldld', // ╪
  0x256b: 'dldl', // ╫
  0x256c: 'dddd', // ╬
  0x2574: '---l', // ╴
  0x2575: 'l---', // ╵
  0x2576: '-l--', // ╶
  0x2577: '--l-', // ╷
  0x2578: '---h', // ╸
  0x2579: 'h---', // ╹
  0x257a: '-h--', // ╺
  0x257b: '--h-', // ╻
  0x257c: '-h-l', // ╼
  0x257d: 'l-h-', // ╽
  0x257e: '-l-h', // ╾
  0x257f: 'h-l-' // ╿
};

type Arm = '-' | 'l' | 'h' | 'd';

/** Saturating subtraction, as Zig's `-|` on the unsigned sizes upstream. */
function minus(left: number, right: number): number {
  return Math.max(0, left - right);
}

/** Collects rectangles clamped to the cell, dropping any left empty. */
class RectList {
  readonly rects: GhosttySpriteRect[] = [];

  constructor(
    private readonly width: number,
    private readonly height: number
  ) {}

  box(left: number, top: number, right: number, bottom: number): void {
    const l = Math.min(this.width, Math.max(0, left));
    const t = Math.min(this.height, Math.max(0, top));
    const r = Math.min(this.width, Math.max(0, right));
    const b = Math.min(this.height, Math.max(0, bottom));
    if (r > l && b > t) this.rects.push({ left: l, top: t, right: r, bottom: b });
  }
}

/** Where a fraction of `size` lands as a block's left or top edge (`Fraction.min` upstream). */
function fractionMin(fraction: number, size: number): number {
  // Rounding from the far end makes `start` to `half` and `half` to `end`
  // meet or overlap by a pixel on odd sizes, never leave one uncovered.
  return size - Math.round((1 - fraction) * size);
}

/** Where a fraction of `size` lands as a block's right or bottom edge (`Fraction.max` upstream). */
function fractionMax(fraction: number, size: number): number {
  return Math.round(fraction * size);
}

type Alignment = 'upper' | 'lower' | 'left' | 'right';

/** A block a fraction of the cell wide and tall, against one side (`blockShade` upstream). */
function block(
  out: RectList,
  width: number,
  height: number,
  alignment: Alignment,
  widthFraction: number,
  heightFraction: number
): void {
  const w = Math.round(width * widthFraction);
  const h = Math.round(height * heightFraction);
  const x =
    alignment === 'right' ? width - w : alignment === 'left' ? 0 : Math.floor(minus(width, w) / 2);
  const y =
    alignment === 'lower'
      ? height - h
      : alignment === 'upper'
        ? 0
        : Math.floor(minus(height, h) / 2);
  out.box(x, y, x + w, y + h);
}

/** The quadrants a quadrant character fills, as `tl`, `tr`, `bl`, `br` flags. */
function quadrants(
  out: RectList,
  width: number,
  height: number,
  tl: boolean,
  tr: boolean,
  bl: boolean,
  br: boolean
): void {
  const leftEnd = fractionMax(0.5, width);
  const rightStart = fractionMin(0.5, width);
  const topEnd = fractionMax(0.5, height);
  const bottomStart = fractionMin(0.5, height);
  if (tl) out.box(0, 0, leftEnd, topEnd);
  if (tr) out.box(rightStart, 0, width, topEnd);
  if (bl) out.box(0, bottomStart, leftEnd, height);
  if (br) out.box(rightStart, bottomStart, width, height);
}

function blockElement(codepoint: number, width: number, height: number): GhosttySpriteGlyph {
  const out = new RectList(width, height);
  let alpha = 1;
  switch (codepoint) {
    case 0x2580: // ▀
      block(out, width, height, 'upper', 1, 1 / 2);
      break;
    case 0x2581: // ▁
    case 0x2582: // ▂
    case 0x2583: // ▃
    case 0x2584: // ▄
    case 0x2585: // ▅
    case 0x2586: // ▆
    case 0x2587: // ▇
      block(out, width, height, 'lower', 1, (codepoint - 0x2580) / 8);
      break;
    case 0x2588: // █
      out.box(0, 0, width, height);
      break;
    case 0x2589: // ▉
    case 0x258a: // ▊
    case 0x258b: // ▋
    case 0x258c: // ▌
    case 0x258d: // ▍
    case 0x258e: // ▎
    case 0x258f: // ▏
      block(out, width, height, 'left', (0x2590 - codepoint) / 8, 1);
      break;
    case 0x2590: // ▐
      block(out, width, height, 'right', 1 / 2, 1);
      break;
    case 0x2591: // ░
    case 0x2592: // ▒
    case 0x2593: // ▓
      // Ghostty fills shades solidly at partial coverage, not with a dot
      // pattern, so shaded art stays smooth at any cell size.
      out.box(0, 0, width, height);
      alpha = codepoint === 0x2591 ? SHADE_LIGHT : codepoint === 0x2592 ? SHADE_MEDIUM : SHADE_DARK;
      break;
    case 0x2594: // ▔
      block(out, width, height, 'upper', 1, 1 / 8);
      break;
    case 0x2595: // ▕
      block(out, width, height, 'right', 1 / 8, 1);
      break;
    case 0x2596: // ▖
      quadrants(out, width, height, false, false, true, false);
      break;
    case 0x2597: // ▗
      quadrants(out, width, height, false, false, false, true);
      break;
    case 0x2598: // ▘
      quadrants(out, width, height, true, false, false, false);
      break;
    case 0x2599: // ▙
      quadrants(out, width, height, true, false, true, true);
      break;
    case 0x259a: // ▚
      quadrants(out, width, height, true, false, false, true);
      break;
    case 0x259b: // ▛
      quadrants(out, width, height, true, true, true, false);
      break;
    case 0x259c: // ▜
      quadrants(out, width, height, true, true, false, true);
      break;
    case 0x259d: // ▝
      quadrants(out, width, height, false, true, false, false);
      break;
    case 0x259e: // ▞
      quadrants(out, width, height, false, true, true, false);
      break;
    default: // ▟
      quadrants(out, width, height, false, true, true, true);
      break;
  }
  return { alpha, rects: out.rects, arc: null };
}

/**
 * A line-drawing character from its four arms (`linesChar` upstream): each arm
 * runs from its cell edge to the centre, and where arms of different weights
 * or doubled arms meet, each stops at the edge of the stroke across it so the
 * joint stays square.
 */
function linesChar(
  arms: string,
  width: number,
  height: number,
  thickness: number
): GhosttySpriteGlyph {
  const up = arms[0] as Arm;
  const right = arms[1] as Arm;
  const down = arms[2] as Arm;
  const left = arms[3] as Arm;
  const light = thickness;
  const heavy = thickness * 2;

  const hLightTop = Math.floor(minus(height, light) / 2);
  const hLightBottom = hLightTop + light;
  const hHeavyTop = Math.floor(minus(height, heavy) / 2);
  const hHeavyBottom = hHeavyTop + heavy;
  const hDoubleTop = minus(hLightTop, light);
  const hDoubleBottom = hLightBottom + light;

  const vLightLeft = Math.floor(minus(width, light) / 2);
  const vLightRight = vLightLeft + light;
  const vHeavyLeft = Math.floor(minus(width, heavy) / 2);
  const vHeavyRight = vHeavyLeft + heavy;
  const vDoubleLeft = minus(vLightLeft, light);
  const vDoubleRight = vLightRight + light;

  const upBottom =
    left === 'h' || right === 'h'
      ? hHeavyBottom
      : left !== right || down === up
        ? left === 'd' || right === 'd'
          ? hDoubleBottom
          : hLightBottom
        : left === '-' && right === '-'
          ? hLightBottom
          : hLightTop;
  const downTop =
    left === 'h' || right === 'h'
      ? hHeavyTop
      : left !== right || up === down
        ? left === 'd' || right === 'd'
          ? hDoubleTop
          : hLightTop
        : left === '-' && right === '-'
          ? hLightTop
          : hLightBottom;
  const leftRight =
    up === 'h' || down === 'h'
      ? vHeavyRight
      : up !== down || left === right
        ? up === 'd' || down === 'd'
          ? vDoubleRight
          : vLightRight
        : up === '-' && down === '-'
          ? vLightRight
          : vLightLeft;
  const rightLeft =
    up === 'h' || down === 'h'
      ? vHeavyLeft
      : up !== down || right === left
        ? up === 'd' || down === 'd'
          ? vDoubleLeft
          : vLightLeft
        : up === '-' && down === '-'
          ? vLightLeft
          : vLightRight;

  const out = new RectList(width, height);
  if (up === 'l') out.box(vLightLeft, 0, vLightRight, upBottom);
  else if (up === 'h') out.box(vHeavyLeft, 0, vHeavyRight, upBottom);
  else if (up === 'd') {
    out.box(vDoubleLeft, 0, vLightLeft, left === 'd' ? hLightTop : upBottom);
    out.box(vLightRight, 0, vDoubleRight, right === 'd' ? hLightTop : upBottom);
  }

  if (right === 'l') out.box(rightLeft, hLightTop, width, hLightBottom);
  else if (right === 'h') out.box(rightLeft, hHeavyTop, width, hHeavyBottom);
  else if (right === 'd') {
    out.box(up === 'd' ? vLightRight : rightLeft, hDoubleTop, width, hLightTop);
    out.box(down === 'd' ? vLightRight : rightLeft, hLightBottom, width, hDoubleBottom);
  }

  if (down === 'l') out.box(vLightLeft, downTop, vLightRight, height);
  else if (down === 'h') out.box(vHeavyLeft, downTop, vHeavyRight, height);
  else if (down === 'd') {
    out.box(vDoubleLeft, left === 'd' ? hLightBottom : downTop, vLightLeft, height);
    out.box(vLightRight, right === 'd' ? hLightBottom : downTop, vDoubleRight, height);
  }

  if (left === 'l') out.box(0, hLightTop, leftRight, hLightBottom);
  else if (left === 'h') out.box(0, hHeavyTop, leftRight, hHeavyBottom);
  else if (left === 'd') {
    out.box(0, hDoubleTop, up === 'd' ? vLightLeft : leftRight, hLightTop);
    out.box(0, hLightBottom, down === 'd' ? vLightLeft : leftRight, hDoubleBottom);
  }

  return { alpha: 1, rects: out.rects, arc: null };
}

/**
 * A horizontal dashed line (`dashHorizontal` upstream): `count` dashes with
 * half a gap at either end, so the line tiles evenly across cells; spare
 * pixels widen dashes, which shows less than uneven gaps.
 */
function dashHorizontal(
  width: number,
  height: number,
  light: number,
  count: number,
  thick: number,
  desiredGap: number
): GhosttySpriteGlyph {
  const out = new RectList(width, height);
  if (width < count * 2) {
    const top = Math.floor(minus(height, light) / 2);
    out.box(0, top, width, top + light);
    return { alpha: 1, rects: out.rects, arc: null };
  }
  const gap = Math.min(desiredGap, Math.floor(width / (2 * count)));
  const totalDash = width - count * gap;
  const dash = Math.floor(totalDash / count);
  let extra = totalDash % count;
  const top = Math.floor(minus(height, thick) / 2);
  let x = Math.floor(gap / 2);
  for (let index = 0; index < count; index += 1) {
    let x1 = x + dash;
    if (extra > 0) {
      extra -= 1;
      x1 += 1;
    }
    out.box(x, top, x1, top + thick);
    x = x1 + gap;
  }
  return { alpha: 1, rects: out.rects, arc: null };
}

/**
 * A vertical dashed line (`dashVertical` upstream): `count` dashes from the
 * top with one whole gap at the bottom, which joins solid lines above without
 * a half-gap seam.
 */
function dashVertical(
  width: number,
  height: number,
  light: number,
  count: number,
  thick: number,
  desiredGap: number
): GhosttySpriteGlyph {
  const out = new RectList(width, height);
  if (height < count * 2) {
    const left = Math.floor(minus(width, light) / 2);
    out.box(left, 0, left + light, height);
    return { alpha: 1, rects: out.rects, arc: null };
  }
  const gap = Math.min(desiredGap, Math.floor(height / (2 * count)));
  const totalDash = height - count * gap;
  const dash = Math.floor(totalDash / count);
  let extra = totalDash % count;
  const left = Math.floor(minus(width, thick) / 2);
  let y = 0;
  for (let index = 0; index < count; index += 1) {
    let y1 = y + dash;
    if (extra > 0) {
      extra -= 1;
      y1 += 1;
    }
    out.box(left, y, left + thick, y1);
    y = y1 + gap;
  }
  return { alpha: 1, rects: out.rects, arc: null };
}

function dash(codepoint: number, width: number, height: number, light: number): GhosttySpriteGlyph {
  const heavy = light * 2;
  const shortGap = Math.max(4, light);
  switch (codepoint) {
    case 0x2504: // ┄
      return dashHorizontal(width, height, light, 3, light, shortGap);
    case 0x2505: // ┅
      return dashHorizontal(width, height, light, 3, heavy, shortGap);
    case 0x2506: // ┆
      return dashVertical(width, height, light, 3, light, shortGap);
    case 0x2507: // ┇
      return dashVertical(width, height, light, 3, heavy, shortGap);
    case 0x2508: // ┈
      return dashHorizontal(width, height, light, 4, light, shortGap);
    case 0x2509: // ┉
      return dashHorizontal(width, height, light, 4, heavy, shortGap);
    case 0x250a: // ┊
      return dashVertical(width, height, light, 4, light, shortGap);
    case 0x250b: // ┋
      return dashVertical(width, height, light, 4, heavy, shortGap);
    case 0x254c: // ╌
      return dashHorizontal(width, height, light, 2, light, light);
    case 0x254d: // ╍
      return dashHorizontal(width, height, light, 2, heavy, heavy);
    case 0x254e: // ╎
      return dashVertical(width, height, light, 2, light, heavy);
    default: // ╏
      return dashVertical(width, height, light, 2, heavy, heavy);
  }
}

/**
 * A light rounded corner (`arc` upstream): straight from the edge to a radius
 * of half the cell's shorter side from the centre, then a curve to the other
 * arm. The stroke is centred on the light line's pixels, so it meets `│` and
 * `─` in the neighbouring cells exactly.
 */
function roundedCorner(
  codepoint: number,
  width: number,
  height: number,
  thickness: number
): GhosttySpriteGlyph {
  const centerX = Math.floor(minus(width, thickness) / 2) + thickness / 2;
  const centerY = Math.floor(minus(height, thickness) / 2) + thickness / 2;
  const radius = Math.min(width, height) / 2;
  // How far from the centre the curve's control points sit, as a share of the radius.
  const pull = 0.25;
  // ╭ opens to the bottom right, ╮ bottom left, ╯ top left, ╰ top right.
  const down = codepoint === 0x256d || codepoint === 0x256e;
  const toRight = codepoint === 0x256d || codepoint === 0x2570;
  const vertical = down ? 1 : -1;
  const horizontal = toRight ? 1 : -1;
  return {
    alpha: 1,
    rects: [],
    arc: {
      lineWidth: thickness,
      startX: centerX,
      startY: down ? height : 0,
      bendStartX: centerX,
      bendStartY: centerY + vertical * radius,
      control1X: centerX,
      control1Y: centerY + vertical * pull * radius,
      control2X: centerX + horizontal * pull * radius,
      control2Y: centerY,
      bendEndX: centerX + horizontal * radius,
      bendEndY: centerY,
      endX: toRight ? width : 0,
      endY: centerY
    }
  };
}

/**
 * The shapes for a Box Drawing or Block Elements codepoint in a cell `width`
 * by `height` device pixels, with light lines `thickness` pixels thick; null
 * for a codepoint left to the font (see `ghosttySpriteCodepoint`). All three
 * sizes must be whole pixels.
 */
export function ghosttySpriteGlyph(
  codepoint: number,
  width: number,
  height: number,
  thickness: number
): GhosttySpriteGlyph | null {
  if (codepoint < BOX_FIRST || codepoint > BLOCK_LAST) return null;
  if (codepoint >= 0x2580) return blockElement(codepoint, width, height);
  const arms = LINES[codepoint];
  if (arms !== undefined) return linesChar(arms, width, height, thickness);
  if (codepoint >= 0x256d && codepoint <= 0x2570) {
    return roundedCorner(codepoint, width, height, thickness);
  }
  if (
    (codepoint >= 0x2504 && codepoint <= 0x250b) ||
    (codepoint >= 0x254c && codepoint <= 0x254f)
  ) {
    return dash(codepoint, width, height, thickness);
  }
  return null;
}
