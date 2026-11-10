/**
 * The colour tokens, derived from a theme of the catalog, and the stylesheet
 * that delivers them (`themes.generated.css`, written by `themes.test.ts`).
 *
 * A token follows a rule wherever one gives the value: a palette role, a mix,
 * a choice by the theme's appearance, or the quietest tone that keeps its
 * contrast on what it sits on. A theme overrides a token only where it was
 * hand-tuned past what a rule gives (`Theme.overrides`), and a token derived
 * from an overridden one (`--on-primary` from `--primary`) is derived from
 * the override. A token other tokens read straight from the palette (the
 * panel, the text, the primary hue, the group hues) takes no override; a
 * theme sets it through its palette, or a group hue through `Theme.groups`.
 * Tokens that read the same in every theme (aliases, washes, the disabled
 * opacity) are fixed.
 *
 * Every colour has one job. A fill the text sits on (`--accent`, `--danger`)
 * is not the colour of a word: each coloured word has a text role
 * (`--accent-text`, `--danger-text`) floored at 4.5:1 on every ground the
 * word is drawn on, and each mark read by shape (a dot, an icon, a chart
 * line, a control's outline) has a role floored at 3:1 on its grounds.
 *
 * An app that needs tokens of its own derives them from the same theme and
 * emits them through `themeStylesheet`'s options, so one stylesheet holds
 * both sets under the same selectors.
 */

import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  THEMES,
  type GroupHue,
  type TerminalPalette,
  type Theme,
  type ThemePalette
} from './catalog.js';
import {
  contrast,
  firstLegible,
  legibleOn,
  luminance,
  mix,
  rgbOf,
  translucent,
  type Hex
} from './color.js';
import { THEME_ATTRIBUTES, THEME_PREVIEW_ATTRIBUTE, type ThemeAppearance } from './ids.js';

const WHITE: Hex = '#ffffff';
const BLACK: Hex = '#000000';

/** Body text and anything read as words. */
const TEXT_CONTRAST = 4.5;
/** Marks read by shape alone: a dot, a glyph, a control's outline, a chart line. */
const MARK_CONTRAST = 3;
/**
 * The least a hairline stands apart from the grounds it divides: `--border`
 * at the divider's floor, `--border-strong` at the frame's. Lines are not
 * read alone, so they sit under the 3:1 a control's outline needs.
 */
const BORDER_CONTRAST = 1.15;
const BORDER_STRONG_CONTRAST = 1.3;
/**
 * The least a marked row's tint stands apart from the ground under it, so a
 * marked row reads apart from its neighbours (zebra rows included) before
 * its leading bar is noticed.
 */
const MARKED_CONTRAST = 1.25;

/**
 * The washes and lines of a hue, in percent of the hue over whatever is
 * under them (`FIXED_TOKENS` writes them as `color-mix` with transparent;
 * the rules below lay them over each ground to floor what is drawn on them).
 * A wash tints a band or a row; the strong wash tints what must stand out
 * from a wash; a line draws a hue's rule or ring.
 */
const WASH = {
  accent: 12,
  accentStrong: 20,
  status: 8,
  statusStrong: 16,
  line: 45
} as const;

/**
 * The tint of the current item (the open page, the chosen tab) at most, and
 * the ring around it; the tint steps down where the text on it would fall
 * under 4.5:1.
 */
const CURRENT_TINT = 18;
const CURRENT_RING = 55;

/** The least share of the accent in a marked row's tint, and how much more a cursor on it adds. */
const MARKED_TINT = 16;
const MARKED_CURSOR_STEP = 10;

/** How far a state laid over a fill moves the fill away from the text on it, in percent of the fill kept. */
const PRIMARY_HOVER_KEEP = 88;
const SELECTION_CURSOR_KEEP = 80;
const SELECTION_HIT_KEEP = 70;

/**
 * How far apart two chart series must be, as the distance between their
 * sRGB channels (0 to 441), so no two series of one chart look alike.
 */
const SERIES_DISTANCE = 48;
/** How many series colours a theme defines (`--chart-1` to `--chart-8`). */
const SERIES_COUNT = 8;

/**
 * How opaque a control that cannot act right now is drawn (`--disabled-opacity`,
 * which the base stylesheet applies to every disabled control): its words,
 * icons, and fill fade together, far enough from enabled text to read as
 * unavailable at a glance in every theme, and near enough to stay legible.
 */
const DISABLED_OPACITY = 0.5;

/** How opaque an item being dragged is drawn (`--dragging-opacity`), the same in every theme. */
const DRAGGING_OPACITY = 0.5;

/**
 * What a theme's appearance decides on its own, the same for every theme of
 * that appearance: how much each wash and lift shows over the grounds.
 */
const BY_APPEARANCE: Readonly<
  Record<
    ThemeAppearance,
    {
      /** The accent's share of the keyboard cursor row over `base`. */
      readonly cursorRow: number;
      /** A listing's lift off the ground: white over a light surface, the base tone over a dark one. */
      readonly rowLift: (palette: ThemePalette) => string;
      readonly glassEdge: string;
      /** White's share in the frosted wash an outlined control takes on hover. */
      readonly hoverWhite: number;
      readonly tonalHoverBrightness: `${number}`;
      /** White's share over the panel under a listing; none in a dark theme. */
      readonly fileListLift: number;
      /** The accent's opacity under the terminal's selection. */
      readonly terminalSelection: number;
      /** A pressed outlined control's darkening, black's share over its ground. */
      readonly pressedBlack: number;
      /**
       * Shadow strength, black's share, by layer. A dark ground swallows a
       * light shadow, so dark themes cast about twice the alpha and ring the
       * modal layer, where light themes let a soft shadow do the lifting.
       */
      readonly shadow: {
        readonly raised: number;
        readonly popover: number;
        readonly modal: number;
        readonly modalContact: number;
        readonly modalRing: number;
      };
    }
  >
> = {
  light: {
    cursorRow: 10,
    rowLift: () => translucent(WHITE, 35),
    glassEdge: translucent(WHITE, 60),
    hoverWhite: 50,
    // A pale fill barely brightens, so its hover deepens a touch instead.
    tonalHoverBrightness: '0.97',
    fileListLift: 30,
    terminalSelection: 22,
    pressedBlack: 7,
    shadow: { raised: 12, popover: 18, modal: 28, modalContact: 12, modalRing: 0 }
  },
  dark: {
    cursorRow: 14,
    rowLift: (palette) => translucent(palette.base, 50),
    glassEdge: translucent(WHITE, 10),
    hoverWhite: 6,
    tonalHoverBrightness: '1.12',
    fileListLift: 0,
    terminalSelection: 28,
    pressedBlack: 24,
    shadow: { raised: 30, popover: 45, modal: 55, modalContact: 35, modalRing: 35 }
  }
};

/**
 * The text colour for a fill: white or the palette's darkest neutral,
 * whichever stands out more on it.
 */
function onFill(fill: Hex, palette: ThemePalette): Hex {
  const ink = luminance(palette.text) < luminance(palette.crust) ? palette.text : palette.crust;
  return contrast(WHITE, fill) >= contrast(ink, fill) ? WHITE : ink;
}

/**
 * The text colour for a status fill, which may be a mid tone: `onFill`'s
 * pick where it keeps 4.5:1, else white or black, whichever does.
 */
function textOnFill(fill: Hex, palette: ThemePalette): Hex {
  const picks = [onFill(fill, palette), WHITE, BLACK];
  return (
    picks.find((ink) => contrast(ink, fill) >= TEXT_CONTRAST) ??
    (contrast(WHITE, fill) >= contrast(BLACK, fill) ? WHITE : BLACK)
  );
}

/**
 * `fill` moved away from the text on it (`on`), keeping `keep` percent:
 * toward black under white text, toward white under dark text, so a state
 * laid over a fill (a hover, a cursor on a selection) never brings the fill
 * nearer its text.
 */
function awayFrom(fill: Hex, on: Hex, keep: number): Hex {
  return mix(fill, luminance(on) > 0.5 ? BLACK : WHITE, keep);
}

/** The distance between two colours' sRGB channels, 0 to 441. */
function channelDistance(a: Hex, b: Hex): number {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b);
}

/**
 * The chart series: the palette's hues in the order a chart has always
 * assigned them (blue, peach, green, mauve, teal, red, yellow, pink), then
 * the rest, each moved until it keeps 3:1 on every ground a chart is drawn
 * on, taking the first eight that stand `SERIES_DISTANCE` apart from every
 * series taken before. Where a palette runs out (several roles share one
 * colour), the remainder are shades of the taken series toward the text
 * and then deeper and paler (each moved back to 3:1), then midpoints between neighbouring series, so the
 * eight stay distinct.
 */
function chartSeries(palette: ThemePalette, grounds: readonly Hex[]): readonly Hex[] {
  const hues = [
    palette.blue,
    palette.peach,
    palette.green,
    palette.mauve,
    palette.teal,
    palette.red,
    palette.yellow,
    palette.pink,
    palette.sky,
    palette.sapphire,
    palette.lavender,
    palette.maroon,
    palette.flamingo,
    palette.rosewater
  ];
  const taken: Hex[] = [];
  const take = (hue: Hex) => {
    if (taken.length >= SERIES_COUNT) return;
    const series = legibleOn(hue, grounds, MARK_CONTRAST);
    if (taken.every((other) => channelDistance(series, other) >= SERIES_DISTANCE)) {
      taken.push(series);
    }
  };
  hues.forEach(take);
  // Shades of the series taken, a third and then half of the way to the
  // text, then deeper ones (toward black on a light ground, white on a dark
  // one), then the midpoints of neighbouring series.
  const hueSeries = [...taken];
  const far = luminance(grounds[0] ?? WHITE) > 0.18 ? BLACK : WHITE;
  [35, 55].forEach((share) =>
    hueSeries.forEach((series) => take(mix(palette.text, series, share)))
  );
  [35, 50].forEach((share) => hueSeries.forEach((series) => take(mix(far, series, share))));
  const near = far === BLACK ? WHITE : BLACK;
  [35, 50].forEach((share) => hueSeries.forEach((series) => take(mix(near, series, share))));
  hueSeries.forEach((series, index) => {
    const next = hueSeries[(index + 1) % hueSeries.length];
    if (next !== undefined) take(mix(series, next, 50));
  });
  // A palette too narrow for even that repeats its last series rather than
  // leave a series unset; no theme in the catalog reaches this.
  while (taken.length < SERIES_COUNT) taken.push(taken.at(-1) ?? palette.blue);
  return taken;
}

/**
 * The value a theme may override a token with, by what the token holds: a
 * hex colour for a colour, a number or a percentage for a factor. A token
 * written as a compound value (a translucent colour, a mix, a `var()`, a
 * shadow) follows its rule in every theme and takes no override.
 */
type OverrideValue<Value> = Value extends Hex
  ? Hex
  : Value extends `${number}%`
    ? `${number}%`
    : Value extends `${number}`
      ? `${number}`
      : never;

/**
 * Every token a theme sets, as `themeTokens` gives it, before it is written
 * into the stylesheet. `overrides` replaces a token where the theme was
 * hand-tuned, and each token the rules derive from it is derived from the
 * replacement.
 */
function derivedTokens(
  palette: ThemePalette,
  terminal: TerminalPalette,
  appearance: ThemeAppearance,
  overrides: Readonly<Record<string, string | undefined>>,
  hues: Readonly<Partial<Record<GroupHue, Hex>>>
) {
  const look = BY_APPEARANCE[appearance];
  /**
   * `name`'s override where the theme has one, else what its rule gives.
   * `ThemeOverrides` holds an override to the kind of value its rule gives.
   */
  const tuned = <Value extends string>(name: string, rule: Value): Value =>
    (overrides[name] as Value | undefined) ?? rule;

  // The grounds: the window (mantle), panels (base), and the header bar (crust).
  const ground = tuned('--bg', palette.mantle);
  const panel = palette.base;
  const header = tuned('--bg-header', palette.crust);
  const bare: readonly Hex[] = [ground, panel, header];
  const surfaceFill = tuned('--cursor-bg', palette.surface0);
  // The accent: the blue, moved until the text on it keeps 4.5:1, as a
  // selected row's name sits on it.
  const accent = tuned(
    '--accent',
    legibleOn(palette.blue, [onFill(palette.blue, palette)], TEXT_CONTRAST)
  );
  const onAccent = tuned('--on-accent', onFill(accent, palette));
  // The neutral ramp from the quietest tone a word may wear to the text itself.
  const quiet: readonly Hex[] = [palette.subtext0, palette.subtext1, palette.text];
  // The neutral ramp a mark or a control's outline steps up, quietest first.
  const marks: readonly Hex[] = [
    palette.surface2,
    palette.overlay0,
    palette.overlay1,
    palette.overlay2,
    palette.subtext0,
    palette.subtext1
  ];
  // A recessed surface, such as a tab behind the selected one: the panel at
  // 45% over the ground. The group marks keep their ring rule against it.
  const recessed = mix(panel, ground, 45);
  // A listing's lift over the panel surface.
  const fileList = mix(WHITE, panel, look.fileListLift);
  // A listing's column strip: the header bar at 40% over the panel.
  const strip = mix(header, panel, 40);
  // The frosted wash an outlined control takes on hover, over a ground.
  const hovered = (on: Hex) => mix(WHITE, on, look.hoverWhite);
  const cursorRow = tuned('--cursor-row-bg', mix(accent, panel, look.cursorRow));

  // A marked row (a row ticked in a list with a checkbox column): the
  // accent's least tint from MARKED_TINT up that stands MARKED_CONTRAST
  // apart from the panel and the ground and keeps the text at 4.5:1; a
  // cursor on a marked row adds a step.
  // Where no tint does both (Solarized Light), the text wins: the strongest
  // tint that keeps it, and the row's bar carries the mark.
  const textHolds = (share: number, on: readonly Hex[]) =>
    on.every((under) => contrast(palette.text, mix(accent, under, share)) >= TEXT_CONTRAST);
  const shares = (from: number, to: number) =>
    from <= to
      ? [...Array(to - from + 1).keys()].map((step) => from + step)
      : [...Array(from - to + 1).keys()].map((step) => from - step);
  const markedShare =
    shares(MARKED_TINT, MARKED_TINT + 20).find(
      (share) =>
        textHolds(share, [panel, ground]) &&
        [panel, ground].every((on) => contrast(mix(accent, on, share), on) >= MARKED_CONTRAST)
    ) ??
    shares(MARKED_TINT + 20, 8).find((share) => textHolds(share, [panel, ground])) ??
    8;
  const markedCursorShare =
    shares(markedShare + MARKED_CURSOR_STEP, markedShare).find((share) =>
      textHolds(share, [panel, ground])
    ) ?? markedShare;
  const marked = (on: Hex) => mix(accent, on, markedShare);
  // The current item: the accent's tint at most CURRENT_TINT, stepped down
  // until the text keeps 4.5:1 on it over every bare ground.
  const currentShare = shares(CURRENT_TINT, 4).find((share) => textHolds(share, bare)) ?? 4;
  const current = (on: Hex) => mix(accent, on, currentShare);

  // Every ground a coloured word or a quiet word is drawn on in a pane: the
  // bare grounds, a listing, its column strip, the cursor row, a hovered
  // panel, a marked row, and the current item.
  const wordGrounds: readonly Hex[] = [
    panel,
    ground,
    header,
    fileList,
    strip,
    cursorRow,
    hovered(panel),
    marked(panel),
    marked(ground),
    ...bare.map(current)
  ];

  // --text-dim sits on the ground, a panel, and the header bar, hovered or not.
  const textDim = tuned(
    '--text-dim',
    firstLegible(quiet, [...bare, ...bare.map(hovered)], TEXT_CONTRAST)
  );
  // A row's meta on a listing, and a dialog's context on the title strip.
  const rowMeta = tuned(
    '--row-meta-text',
    firstLegible([palette.overlay2, ...quiet], [fileList, panel, header], TEXT_CONTRAST)
  );
  const primary = tuned(
    '--primary',
    legibleOn(palette.lavender, [onFill(palette.lavender, palette)], TEXT_CONTRAST)
  );
  const onPrimary = tuned('--on-primary', onFill(primary, palette));

  // The trough of a segmented choice and a progress bar: the text's tint,
  // the strongest from 8% down that keeps the accent fill at 3:1 on it over
  // a panel and the ground, and the text at 4.5:1 over every bare ground; a
  // --control-border ring draws its edge.
  const trackShare =
    shares(8, 3).find(
      (share) =>
        [panel, ground].every(
          (on) => contrast(accent, mix(palette.text, on, share)) >= MARK_CONTRAST
        ) &&
        bare.every((on) => contrast(palette.text, mix(palette.text, on, share)) >= TEXT_CONTRAST)
    ) ?? 3;
  const tracks = bare.map((on) => mix(palette.text, on, trackShare));
  const textOnSurface = tuned(
    '--text-on-surface',
    firstLegible(quiet, [surfaceFill, cursorRow, ...tracks], TEXT_CONTRAST)
  );

  // Status marks: the palette hue, moved until it keeps 3:1 as a dot or an
  // icon on every ground a mark sits on.
  const markGrounds: readonly Hex[] = [panel, ground, header, fileList, cursorRow];
  const warning = tuned('--warning', legibleOn(palette.yellow, markGrounds, MARK_CONTRAST));
  // The success green is also a finished run's bar on the control trough.
  const success = tuned(
    '--success',
    legibleOn(palette.green, [...markGrounds, ...tracks], MARK_CONTRAST)
  );
  // Errors and destructive marks: the red, moved until it keeps 4.5:1 on a
  // panel, where error text sat before it had a text role.
  const danger = tuned('--danger', legibleOn(palette.red, [panel], TEXT_CONTRAST));
  // A status word: its mark moved until it keeps 4.5:1 on every word ground
  // and on its own washes over the panel and the ground.
  const statusText = (mark: Hex) =>
    legibleOn(
      mark,
      [
        ...wordGrounds,
        ...[panel, ground].flatMap((on) => [
          mix(mark, on, WASH.status),
          mix(mark, on, WASH.statusStrong)
        ])
      ],
      TEXT_CONTRAST
    );

  const selectionCursor = awayFrom(accent, onAccent, SELECTION_CURSOR_KEEP);
  const selectionHit = awayFrom(accent, onAccent, SELECTION_HIT_KEEP);
  // Quiet words on a selected row: the on-accent text mixed toward the
  // accent, the quietest step that keeps 4.5:1 on the selection and the
  // cursor on it.
  const onSelectedDim = firstLegible(
    [70, 80, 90].map((share) => mix(onAccent, accent, share)).concat(onAccent),
    [accent, selectionCursor],
    TEXT_CONTRAST
  );
  const controlBorder = firstLegible(marks, [...bare, fileList], MARK_CONTRAST);
  const onTonal = tuned('--on-tonal', legibleOn(palette.lavender, [cursorRow], TEXT_CONTRAST));
  // The tonal fill on hover: the accent's strongest step from 14% over the
  // tonal fill that keeps its text at 4.5:1.
  const tonalHover = mix(
    accent,
    cursorRow,
    shares(14, 0).find(
      (share) => contrast(onTonal, mix(accent, cursorRow, share)) >= TEXT_CONTRAST
    ) ?? 0
  );
  // A tint the text keeps 4.5:1 on, from `most` percent of the accent down,
  // over every ground in `under`; transparent where none does.
  const accentTint = (most: number, under: readonly Hex[]) => {
    const share = shares(most, 1).find((step) => textHolds(step, under));
    return share === undefined ? 'transparent' : translucent(accent, share);
  };
  const series = chartSeries(palette, [panel, ground]);

  // Each group hue's palette role, unless the theme draws it apart
  // (`Theme.groups`).
  const groups: Readonly<Record<GroupHue, Hex>> = {
    blue: hues.blue ?? palette.blue,
    green: hues.green ?? palette.green,
    purple: hues.purple ?? palette.mauve,
    orange: hues.orange ?? palette.peach,
    teal: hues.teal ?? palette.teal,
    pink: hues.pink ?? palette.pink,
    yellow: hues.yellow ?? palette.yellow,
    red: hues.red ?? palette.red
  };
  const shadow = look.shadow;

  return {
    '--bg': ground,
    '--bg-panel': panel,
    '--bg-header': header,
    // Dividers: the quietest of surface0 up that stands 1.15:1 apart from
    // every bare ground (a light theme's header is as dark as surface0).
    '--border': tuned(
      '--border',
      firstLegible(
        [palette.surface0, palette.surface1, palette.surface2, palette.overlay0],
        bare,
        BORDER_CONTRAST
      )
    ),
    // Frames and outlines on surface0 fills, where --border vanishes: the
    // quietest of surface1 up that stands 1.3:1 apart from every bare ground.
    '--border-strong': tuned(
      '--border-strong',
      firstLegible(
        [palette.surface1, palette.surface2, palette.overlay0, palette.overlay1],
        bare,
        BORDER_STRONG_CONTRAST
      )
    ),
    // The outline of what a user types in or toggles (a field, a select, a
    // checkbox, a radio, a switch at rest) and of the neutral Button and
    // IconButton: the quietest neutral from surface2 up that keeps 3:1 on
    // every bare ground and a listing. Also a scrollbar's thumb and an idle
    // status ring.
    '--control-border': tuned('--control-border', controlBorder),
    // The trough of a segmented choice and a progress bar: the text's tint
    // over whatever is under it; text on it is --text-on-surface.
    '--control-track': translucent(palette.text, trackShare),
    // A stopped or paused progress bar on the trough: the quietest neutral
    // from surface2 up that keeps 3:1 on the trough.
    '--progress-idle': firstLegible(marks, tracks, MARK_CONTRAST),
    // An idle status mark (a hollow ring: stopped, not started): the
    // quietest neutral from surface2 up that keeps 3:1 on a listing, the
    // cursor row, a panel, and the ground.
    '--idle-mark': firstLegible(marks, [fileList, cursorRow, panel, ground], MARK_CONTRAST),
    '--text': palette.text,
    // The quietest subtext that keeps 4.5:1 on the ground, a panel, and the header bar
    // (Latte's subtext0 misses it on mantle).
    '--text-dim': textDim,
    // The quietest subtext that keeps 4.5:1 on surface0 fills, the cursor
    // row, and the control trough (Latte needs the text itself).
    '--text-on-surface': textOnSurface,
    // Separators and decorative glyphs that are never words (a crumb's
    // slash, a group heading's rule): the quietest neutral from overlay2 up
    // that keeps 3:1 on every bare ground.
    '--text-faint': tuned(
      '--text-faint',
      firstLegible([palette.overlay2, ...quiet], bare, MARK_CONTRAST)
    ),
    // Selection, focus, and links.
    '--accent': accent,
    '--on-accent': onAccent,
    // The accent as words (a link, a lit row action, a key cap's letter):
    // moved until it keeps 4.5:1 on every word ground and on the accent's
    // washes over the bare grounds.
    '--accent-text': tuned(
      '--accent-text',
      legibleOn(
        accent,
        [
          ...wordGrounds,
          ...bare.flatMap((on) => [
            mix(accent, on, WASH.accent),
            mix(accent, on, WASH.accentStrong)
          ])
        ],
        TEXT_CONTRAST
      )
    ),
    // Quiet words on a selected row (its meta, a hidden entry's name).
    '--on-selected-dim': onSelectedDim,
    // A fill a step away from the text on it for a state laid over it: the
    // cursor on a selection, a fuzzy match's characters over a selection,
    // and a primary fill on hover.
    '--selection-cursor': selectionCursor,
    '--selection-hit': selectionHit,
    // A marked row's tint (an accent wash floored apart from the ground),
    // and the same row under the cursor.
    '--marked-bg': translucent(accent, markedShare),
    '--marked-cursor-bg': translucent(accent, markedCursorShare),
    // The current item (the open page, the chosen tab): its own tint, never
    // the cursor's, with the text at 4.5:1 on it, and a ring.
    '--current-bg': translucent(accent, currentShare),
    '--current-ring': translucent(accent, CURRENT_RING),
    // A fuzzy match's characters: the accent's wash (at most WASH.accent)
    // that keeps the text at 4.5:1 on a listing, a panel, and the cursor row;
    // its underline (--match-mark) carries the mark where the wash cannot.
    '--match-bg': accentTint(WASH.accent, [fileList, panel, cursorRow]),
    // Selected text (::selection): the accent's strong wash at most, as far
    // as the text keeps 4.5:1 on every bare ground.
    '--text-selection-bg': accentTint(WASH.accentStrong, bare),
    // The palette's lavender as is, for icons and marks drawn in the primary
    // hue; the primary fill and the tonal text derive from the same role.
    '--primary-hue': palette.lavender,
    // The primary hue as a mark (a folder icon): moved until it keeps 3:1 on
    // a listing, the cursor row, a panel, and the ground.
    '--primary-mark': legibleOn(
      palette.lavender,
      [fileList, cursorRow, panel, ground],
      MARK_CONTRAST
    ),
    // Primary actions wear the primary hue, moved until its text keeps
    // 4.5:1, so they stand apart from the accent that marks selection,
    // focus, and links.
    '--primary': primary,
    '--on-primary': onPrimary,
    '--primary-hover': awayFrom(primary, onPrimary, PRIMARY_HOVER_KEEP),
    // The middle button tier (.button-tonal) for a row's routine positive
    // action such as Install: the cursor row's tint (--tonal) with text in
    // the primary hue and a hairline, a quiet step below the solid primary and
    // above the neutral outline; the hairline keeps it reading as a button,
    // not as a highlighted row, inside tables. On hover the fill deepens a
    // step toward the accent.
    '--on-tonal': onTonal,
    '--tonal-border': tuned('--tonal-border', mix(accent, cursorRow, 25)),
    '--tonal-hover': tonalHover,
    '--tonal-hover-brightness': tuned('--tonal-hover-brightness', look.tonalHoverBrightness),
    // Listings lift themselves off the ground, so rows read as a pane rather
    // than as the ground.
    '--row-lift': look.rowLift(palette),
    '--cursor-bg': surfaceFill,
    // The keyboard cursor row in listings: a whisper of the accent over the
    // panel, so the cursor reads apart from the surface0 hover fills.
    '--cursor-row-bg': cursorRow,
    // A listing row's attributes one tone under its name, as Finder's are, so
    // the names lead; a dialog's title strip names where it acts in the same
    // tone. The quietest tone from overlay2 up that keeps 4.5:1 on the
    // listing, a panel, and the header bar.
    '--row-meta-text': rowMeta,
    // Glass: the specular hairline along a raised surface's top edge, and the
    // frosted wash every outlined control takes on hover; a pressed outlined
    // control darkens instead.
    '--glass-edge': look.glassEdge,
    '--hover-wash': translucent(WHITE, look.hoverWhite),
    '--pressed-wash': translucent(BLACK, look.pressedBlack),
    // Status marks (dots, icons, bars), each floored at 3:1 on the grounds
    // a mark sits on; the danger red at 4.5:1 on a panel.
    '--warning': warning,
    '--success': success,
    '--danger': danger,
    // Status words, each floored at 4.5:1 on every word ground and on its
    // own washes.
    '--danger-text': tuned('--danger-text', statusText(danger)),
    '--warning-text': tuned('--warning-text', statusText(warning)),
    '--success-text': tuned('--success-text', statusText(success)),
    // Text on a solid status fill (a destructive key cap, a status badge).
    '--on-danger': tuned('--on-danger', textOnFill(danger, palette)),
    '--on-warning': tuned('--on-warning', textOnFill(warning, palette)),
    '--on-success': tuned('--on-success', textOnFill(success, palette)),

    // Elevation by layer, strength by appearance: a raised part (a segment's
    // thumb, a knob, a lens), a popover (menus, tooltips, notices, the date
    // panel, anything being dragged), and the modal layer (dialogs,
    // palettes). Depth follows the stacking order.
    '--shadow-raised': `0 1px 2px ${translucent(BLACK, shadow.raised)}`,
    '--shadow-popover': `0 8px 24px ${translucent(BLACK, shadow.popover)}`,
    '--shadow-modal': [
      `0 24px 60px ${translucent(BLACK, shadow.modal)}`,
      `0 2px 8px ${translucent(BLACK, shadow.modalContact)}`,
      ...(shadow.modalRing > 0 ? [`0 0 0 1px ${translucent(BLACK, shadow.modalRing)}`] : [])
    ].join(', '),

    // Eight categorical hues by plain name, for marks that tell the items of
    // a set apart (a group, a tag, a label). A group mark is never a status.
    // Where any hue falls under 3:1 on a recessed surface (Latte's yellow,
    // pink, orange, and green sit near 2:1), every mark wears a hairline of
    // the text colour, --group-dot-ring.
    '--group-blue': groups.blue,
    '--group-green': groups.green,
    '--group-purple': groups.purple,
    '--group-orange': groups.orange,
    '--group-teal': groups.teal,
    '--group-pink': groups.pink,
    '--group-yellow': groups.yellow,
    '--group-red': groups.red,
    '--group-dot-ring': Object.values(groups).some((hue) => contrast(hue, recessed) < MARK_CONTRAST)
      ? `inset 0 0 0 1px ${translucent(palette.text, 28)}`
      : 'none',

    // The chart series colours, in the order a chart assigns them
    // (chartSeries): eight hues of the palette, pairwise distinct, each at
    // 3:1 on a panel and the ground.
    '--chart-1': series[0] ?? palette.blue,
    '--chart-2': series[1] ?? palette.peach,
    '--chart-3': series[2] ?? palette.green,
    '--chart-4': series[3] ?? palette.mauve,
    '--chart-5': series[4] ?? palette.teal,
    '--chart-6': series[5] ?? palette.red,
    '--chart-7': series[6] ?? palette.yellow,
    '--chart-8': series[7] ?? palette.pink,

    // A terminal, which a terminal engine reads as literal colours, so each
    // is hex or rgb(): the theme's own terminal palette over its base, and
    // the accent under the selection, which is drawn over the cell colours.
    // Each of the 16 is moved only as far as it needs to keep 3:1 on the
    // terminal's ground, the minimum contrast terminals offer, so ANSI black
    // on a dark ground and ANSI white on a light one still read. The
    // 256-colour cube and grey ramp derive from the 16.
    '--terminal-bg': palette.base,
    '--terminal-fg': palette.text,
    '--terminal-cursor': terminal.cursor,
    '--terminal-selection': translucent(accent, look.terminalSelection),
    ...(Object.fromEntries(
      terminal.ansi.map((color, index) => [
        `--terminal-ansi-${index}`,
        legibleOn(color, [palette.base], MARK_CONTRAST)
      ])
    ) as Record<`--terminal-ansi-${number}`, Hex>),

    // Syntax highlighting: Shiki's Catppuccin theme maps each token colour to
    // its palette role, so a highlighter can follow these by the same names.
    '--syntax-rosewater': palette.rosewater,
    '--syntax-flamingo': palette.flamingo,
    '--syntax-pink': palette.pink,
    '--syntax-mauve': palette.mauve,
    '--syntax-red': palette.red,
    '--syntax-maroon': palette.maroon,
    '--syntax-peach': palette.peach,
    '--syntax-yellow': palette.yellow,
    '--syntax-green': palette.green,
    '--syntax-teal': palette.teal,
    '--syntax-sky': palette.sky,
    '--syntax-sapphire': palette.sapphire,
    '--syntax-blue': palette.blue,
    '--syntax-lavender': palette.lavender,
    '--syntax-subtext0': palette.subtext0,
    '--syntax-overlay2': palette.overlay2,

    // A listing's ground (.listing-root): a white lift over a light panel
    // with no second tint over the ground; nothing in a dark theme.
    '--file-list-bg': look.fileListLift > 0 ? translucent(WHITE, look.fileListLift) : 'transparent'
  };
}

/** A colour token a theme sets. */
export type ThemeTokenName = keyof ReturnType<typeof derivedTokens>;

/** Every colour token a theme sets, by name, as `themeTokens` gives them. */
export type ThemeTokens = Readonly<Record<ThemeTokenName, string>>;

/**
 * Tokens that take no override: each is a palette role other tokens are
 * derived from straight from the palette (the panel's colour under the
 * terminal and the listings' lift, the text in the quieter-text ramp and the
 * terminal, the primary hue in the primary and tonal text, the group hues in
 * their marks' ring), so an override would leave those behind. A theme
 * changes them through its palette, and a group hue through `Theme.groups`.
 */
type PaletteDrawnToken = '--bg-panel' | '--text' | '--primary-hue' | `--group-${GroupHue}`;

/**
 * The tokens a theme may override, each with the kind of value it holds: a
 * colour token takes a six-digit hex colour, a factor its number or
 * percentage. A token drawn straight from the palette (the panel, the text,
 * the primary hue, the group hues) and a compound token (a shadow, a
 * translucent colour) take none.
 */
export type ThemeOverrides = {
  readonly [
    Name in Exclude<ThemeTokenName, PaletteDrawnToken> as [
      OverrideValue<ReturnType<typeof derivedTokens>[Name]>
    ] extends [never]
      ? never
      : Name
  ]?: OverrideValue<ReturnType<typeof derivedTokens>[Name]>;
};

/** Every colour token `theme` sets, in the stylesheet's order, its overrides applied. */
export function themeTokens(theme: Theme): ThemeTokens {
  const tokens: ThemeTokens = derivedTokens(
    theme.palette,
    theme.terminal,
    theme.appearance,
    theme.overrides ?? {},
    theme.groups ?? {}
  );
  return { ...tokens, ...theme.overrides };
}

/**
 * The colour tokens every theme shares: names for the grounds by role, the
 * washes and lines of each hue, aliases of a theme's tokens by the role
 * they play, and the names an older stylesheet reads, kept as aliases.
 */
export const FIXED_TOKENS: Readonly<Record<string, string>> = {
  // Surfaces: the three grounds by role. The body paints the ground once, a
  // panel paints --surface, and what sits inside a panel paints no ground of
  // its own. Surfaces that float over other content add --frost (the base
  // stylesheet) so what scrolls under them blurs.
  '--ground': 'var(--bg)',
  '--surface': 'var(--bg-panel)',
  '--surface-header': 'var(--bg-header)',
  '--tonal': 'var(--cursor-row-bg)',
  // A surface0 fill: a well, a hover fill, a tab's lens. Text on it is
  // --text-on-surface.
  '--fill': 'var(--cursor-bg)',
  // The keyboard cursor row's fill, and the bar on its leading edge that
  // marks it apart from any fill.
  '--cursor-row': 'var(--cursor-row-bg)',
  '--cursor-bar': 'var(--accent)',
  // A selected row in a listing: the solid accent with on-accent text, and
  // the cursor on it a step away from that text (--selection-cursor).
  '--selected-bg': 'var(--accent)',
  '--on-selected': 'var(--on-accent)',
  '--selected-cursor-bg': 'var(--selection-cursor)',
  // A marked row's 2 px bar on its leading edge, beside --marked-bg: the
  // accent as text, which keeps 3:1 on the marked tint where the fill accent
  // would not (Tokyo Night Day).
  '--marked-bar': 'var(--accent-text)',
  // The current item's text and its underline (a strip tab).
  '--current-text': 'var(--text)',
  '--current-mark': 'var(--accent)',
  // A card's fill: the listing's lift over the panel.
  '--card-bg': 'linear-gradient(var(--row-lift), var(--row-lift)) var(--surface)',
  // A text field's placeholder, and a drawn scrollbar's thumb.
  '--text-placeholder': 'var(--text-dim)',
  '--scrollbar-thumb': 'var(--control-border)',
  '--scrollbar-thumb-hover': 'var(--text-dim)',
  // A fuzzy match's underline, which survives any row colour.
  '--match-mark': 'var(--accent)',

  // Washes and lines of each hue (WASH), over whatever is under them. A wash
  // tints a band or a row; the strong wash marks what stands out from a
  // wash; a line draws a hue's rule or ring. The token rules floor the text
  // drawn on each.
  '--accent-wash': `color-mix(in srgb, var(--accent) ${WASH.accent}%, transparent)`,
  '--accent-wash-strong': `color-mix(in srgb, var(--accent) ${WASH.accentStrong}%, transparent)`,
  '--danger-wash': `color-mix(in srgb, var(--danger) ${WASH.status}%, transparent)`,
  '--warning-wash': `color-mix(in srgb, var(--warning) ${WASH.status}%, transparent)`,
  '--success-wash': `color-mix(in srgb, var(--success) ${WASH.status}%, transparent)`,
  '--danger-wash-strong': `color-mix(in srgb, var(--danger) ${WASH.statusStrong}%, transparent)`,
  '--warning-wash-strong': `color-mix(in srgb, var(--warning) ${WASH.statusStrong}%, transparent)`,
  '--success-wash-strong': `color-mix(in srgb, var(--success) ${WASH.statusStrong}%, transparent)`,
  '--accent-line': `color-mix(in srgb, var(--accent) ${WASH.line}%, transparent)`,
  '--danger-line': `color-mix(in srgb, var(--danger) ${WASH.line}%, transparent)`,
  '--warning-line': `color-mix(in srgb, var(--warning) ${WASH.line}%, transparent)`,
  '--success-line': `color-mix(in srgb, var(--success) ${WASH.line}%, transparent)`,
  '--border-faint': 'color-mix(in srgb, var(--border) 60%, transparent)',
  // The wash under a modal overlay, and the stronger one under an overlay
  // that must hide what is under it (a drop target).
  '--scrim': 'color-mix(in srgb, var(--ground) 50%, transparent)',
  '--scrim-strong': 'color-mix(in srgb, var(--ground) 80%, transparent)',

  // The glass-edge hover every button shares: a frosted ring for outlined
  // controls and a lit top edge for filled ones.
  '--hover-frost': 'inset 0 1px 0 var(--glass-edge), inset 0 0 0 1px var(--border-strong)',
  '--hover-lit': `inset 0 1px 0 ${translucent(WHITE, 40)}, inset 0 -1px 0 ${translucent(BLACK, 12)}`,
  // A disabled control's opacity (DISABLED_OPACITY), and a dragged item's
  // (DRAGGING_OPACITY), the same in every theme.
  '--disabled-opacity': `${DISABLED_OPACITY}`,
  '--dragging-opacity': `${DRAGGING_OPACITY}`,

  // A pressed control's inset shadow; every other shadow is a layer's
  // (--shadow-raised, --shadow-popover, --shadow-modal), set per theme.
  '--shadow-pressed': `inset 0 1px 2px ${translucent(BLACK, 18)}`,
  // The shadows by what cast them before they were named by layer, kept as
  // aliases of their layer for stylesheets that still read them. A card
  // that sits in the page should take no shadow at rest.
  '--shadow-menu': 'var(--shadow-popover)',
  '--shadow-notice': 'var(--shadow-popover)',
  '--shadow-tooltip': 'var(--shadow-popover)',
  '--shadow-card': 'var(--shadow-popover)',
  '--shadow-card-hover': 'var(--shadow-popover)',
  '--shadow-dialog': 'var(--shadow-modal)',
  '--shadow-segment': 'var(--shadow-raised)',
  '--shadow-knob': 'var(--shadow-raised)',

  // A switch's knob, white on its track. Retired: a switch's knob is
  // --surface while off and --on-primary while on; kept for the
  // stylesheets that still read it.
  '--switch-knob': WHITE
};

/**
 * The tokens a theme's preview paints with (a theme picker's miniature
 * window per theme): its grounds, hairline, text and quieter text, accent,
 * primary, and six of its terminal colours. Each holds a literal colour in
 * every theme, so a preview scope that sets them shows that theme whatever
 * the page wears. A token that names another (`--surface` is
 * `var(--bg-panel)`) is resolved where it is declared, on the root, so a
 * preview paints with these names alone.
 */
export const PREVIEW_TOKENS = [
  '--bg',
  '--bg-panel',
  '--bg-header',
  '--border',
  '--text',
  '--text-dim',
  '--accent',
  '--primary',
  '--terminal-ansi-1',
  '--terminal-ansi-2',
  '--terminal-ansi-3',
  '--terminal-ansi-4',
  '--terminal-ansi-5',
  '--terminal-ansi-6'
] as const satisfies readonly (ThemeTokenName | `--terminal-ansi-${number}`)[];

/** The tokens `theme`'s preview scope sets: `PREVIEW_TOKENS`, as the theme sets them. */
export function previewTokens(theme: Theme): Readonly<Record<string, string>> {
  const tokens: Readonly<Record<string, string>> = themeTokens(theme);
  return Object.fromEntries(PREVIEW_TOKENS.map((name) => [name, tokens[name] ?? '']));
}

/**
 * What an app adds to the theme stylesheet: tokens of its own, derived from
 * the same themes and written under the same selectors, so it ships one
 * stylesheet rather than a second copy of every theme block. Each extra
 * token must be a custom property (`--name`) that uiok does not define. No
 * value or selector may hold a semicolon, a brace, or a comment delimiter
 * outside a string or url(), nor the banner a comment's end, since each would
 * end its declaration, rule, or comment early.
 */
export interface ThemeStylesheetOptions {
  /**
   * The comment the stylesheet opens with, without its delimiters: what
   * generated the file and how to regenerate it. Defaults to uiok's own.
   */
  readonly banner?: string;
  /**
   * Whether the stylesheet holds uiok's own tokens as well as the app's (the
   * default). An app that imports `@bigpixelrocket/uiok/styles.css`, which already carries
   * them, sets `false` to write its own tokens alone under the same
   * selectors, so no token is declared twice; a block left with nothing to
   * declare is dropped.
   */
  readonly includeUiokTokens?: boolean;
  /** Tokens that read the same in every theme, added to `:root` after `FIXED_TOKENS`. */
  readonly extraFixed?: Readonly<Record<string, string>>;
  /**
   * Tokens derived from each theme, added after uiok's own wherever a theme's
   * tokens are written: the defaults on `:root` and each theme's block.
   * `tokens` are the theme's uiok tokens with its overrides applied; the
   * theme's palette, appearance, and id are on `theme`, so an app can tune a
   * token for one theme by its id.
   */
  readonly extraTokens?: (theme: Theme, tokens: ThemeTokens) => Readonly<Record<string, string>>;
  /**
   * Rules of tokens by selector, written after the default `:root` block and
   * outside any query, such as tokens an attribute switches on the element
   * that carries it (`[data-variant='compact']`).
   */
  readonly extraBlocks?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

/** uiok's own banner: what writes `themes.generated.css` and how the attributes select a theme. */
const BANNER = [
  'Generated from the theme catalog (src/themes/) by src/themes/themes.test.ts;',
  'do not edit. Regenerate with',
  'UPDATE_THEMES=1 npx vitest run src/themes/themes.test.ts',
  '',
  ':root wears the default themes, Catppuccin Latte while light and',
  'Catppuccin Mocha while dark. A page wears other themes through the',
  'data-light-theme and data-dark-theme attributes on its root element,',
  "each selecting its theme's block below under its own appearance. An",
  "element with data-theme-preview set to a theme's id paints that theme's",
  'preview tokens whatever the page wears.'
].join('\n');

/** `tokens` as declarations, one a line at `indent`. */
function declarations(tokens: Readonly<Record<string, string>>, indent: string): string {
  return Object.entries(tokens)
    .map(([name, value]) => `${indent}${name}: ${value};`)
    .join('\n');
}

/** A rule of `tokens` under `selector`, nested `depth` levels deep. */
function rule(selector: string, tokens: Readonly<Record<string, string>>, depth = 0): string {
  const indent = '  '.repeat(depth);
  return `${indent}${selector} {\n${declarations(tokens, `${indent}  `)}\n${indent}}`;
}

/**
 * The custom properties `@bigpixelrocket/uiok/styles.css` declares or reads beside the theme
 * tokens: the scales of `src/tokens.css` on `:root`, and the hooks a component stylesheet
 * declares or reads (the activity stripes' colour, a dialog's tone and
 * pinned top, a date picker fraction field's digit count, a tab strip's
 * edge fades), which an app
 * token on `:root` would otherwise reach.
 */
const BASE_TOKEN_NAMES = [
  // The scales of src/tokens.css: size, space, corner, line, timing,
  // height, layer, focus geometry, and the faces and frost.
  '--font-mono',
  '--font-ui',
  '--font-size-key-word',
  '--font-size-key',
  '--font-size-caption',
  '--font-size-small',
  '--font-size-body',
  '--font-size-heading',
  '--font-size-figure',
  '--font-size-display',
  '--line-height-compact',
  '--line-height-body',
  '--line-height-prose',
  '--line-height-heading',
  '--font-weight-regular',
  '--font-weight-medium',
  '--font-weight-strong',
  '--tracking-caps',
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-5',
  '--space-6',
  '--space-8',
  '--space-10',
  '--space-12',
  '--space-16',
  '--radius-xs',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-pill',
  '--line',
  '--line-strong',
  '--duration-fast',
  '--duration-base',
  '--duration-slow',
  '--duration-spin',
  '--ease-out',
  '--ease-in-out',
  '--control-height',
  '--control-height-sm',
  '--control-height-xs',
  '--row-height',
  '--row-height-dense',
  '--bar-height',
  '--bar-height-lg',
  '--hit-target',
  '--focus-ring-width',
  '--focus-offset',
  '--focus-offset-flush',
  '--focus-offset-inset',
  '--icon-sm',
  '--icon-md',
  '--icon-lg',
  '--icon-column',
  '--z-below',
  '--z-base',
  '--z-raised',
  '--z-local-overlay',
  '--z-menu',
  '--z-drag',
  '--z-panel',
  '--z-overlay',
  '--z-dialog',
  '--z-dialog-popover',
  '--z-tooltip',
  '--frost',
  // The hooks a component stylesheet declares or reads.
  '--stripe-ink',
  '--stripe-ground',
  '--dialog-tone',
  '--dialog-icon',
  '--dialog-top',
  '--pane-columns-height',
  '--pane-path-height',
  '--pane-column-gap',
  '--pane-row-inset',
  '--pane-grid',
  '--date-picker-digits',
  '--page-tabs-fade-start',
  '--page-tabs-fade-end',
  '--segmented-height'
] as const;

/** Every token name uiok defines: the fixed tokens, those a theme sets, and the stylesheet's own. */
const UIOK_TOKEN_NAMES: ReadonlySet<string> = new Set([
  ...Object.keys(FIXED_TOKENS),
  ...Object.keys(themeTokens(DEFAULT_LIGHT_THEME)),
  ...BASE_TOKEN_NAMES
]);

/**
 * Whether `text` holds a sequence that would end a declaration, rule, or
 * comment early. It masks what CSS reads as one token: a quoted string,
 * which honours backslash escapes and ends at a raw newline (so a quoted
 * `url("…")` may hold a `)`), an unquoted `url(…)` (a data URI's
 * `;base64`), and an escaped character outside a string (`\:` in a
 * selector). A separator, quote, lone backslash, or comment delimiter left
 * over is unsafe; a raw newline outside a string is not.
 */
function breaksOut(text: string): boolean {
  const bare = text.replace(
    /"(?:[^"\\\n\r\f]|\\[^\n\r\f])*"|'(?:[^'\\\n\r\f]|\\[^\n\r\f])*'|url\((?!\s*["'])[^)"'\\]*\)|\\[^\n\r\f]/g,
    ''
  );
  return /[;{}"'\\]|\/\*|\*\//.test(bare);
}

/**
 * `extra`, checked to add only custom properties uiok leaves undefined, each
 * with a value confined to its declaration, so an app token can never
 * silently replace a token uiok's components read.
 */
function extraTokens(
  extra: Readonly<Record<string, string>>,
  source: string
): Readonly<Record<string, string>> {
  for (const [name, value] of Object.entries(extra)) {
    if (!/^--[a-z0-9-]+$/.test(name)) {
      throw new Error(`${source} names ${name}, which is not a kebab-case custom property.`);
    }
    if (UIOK_TOKEN_NAMES.has(name)) {
      throw new Error(`${source} redefines ${name}, a token UIOK defines.`);
    }
    if (breaksOut(value)) {
      throw new Error(`${source} gives ${name} a value that would end its declaration early.`);
    }
  }
  return extra;
}

/**
 * The stylesheet of every colour token: the default themes on `:root` (light
 * outside any query, dark under `prefers-color-scheme: dark`), a block per
 * theme that `data-light-theme` or `data-dark-theme` on the root element
 * selects under its appearance, and a preview scope per theme
 * (`PREVIEW_TOKENS` under `data-theme-preview`) outside any query. `:root`
 * also declares `color-scheme: light dark`, so native controls and scrollbars
 * follow the appearance the tokens follow. `options` adds an app's own
 * tokens to the same blocks, or writes those alone.
 */
export function themeStylesheet(options: ThemeStylesheetOptions = {}): string {
  const { banner = BANNER, includeUiokTokens = true, extraFixed = {}, extraBlocks = {} } = options;
  if (banner.includes('*/')) {
    throw new Error('banner holds */, which would end its comment early.');
  }
  const own = (tokens: Readonly<Record<string, string>>) => (includeUiokTokens ? tokens : {});
  const tokensOf = (theme: Theme): Readonly<Record<string, string>> => {
    const tokens = themeTokens(theme);
    const extra = options.extraTokens?.(theme, tokens) ?? {};
    return { ...own(tokens), ...extraTokens(extra, `extraTokens(${theme.id})`) };
  };
  /** A rule, or none where it would declare nothing. */
  const block = (selector: string, tokens: Readonly<Record<string, string>>, depth = 0) =>
    Object.keys(tokens).length === 0 ? [] : [rule(selector, tokens, depth)];
  /** `rules` under a media query, or nothing where there are none. */
  const media = (condition: string, rules: readonly string[]) =>
    rules.length === 0 ? [] : [`@media ${condition} {\n${rules.join('\n\n')}\n}`];
  const themed = (appearance: ThemeAppearance) =>
    THEMES.filter((theme) => theme.appearance === appearance).flatMap((theme) =>
      block(`:root[${THEME_ATTRIBUTES[appearance]}='${theme.id}']`, tokensOf(theme), 1)
    );

  return [
    `/* ${banner
      .split('\n')
      .map((line, index) => (index === 0 || line === '' ? line : `   ${line}`))
      .join('\n')} */`,
    ...block(':root', {
      ...own({ 'color-scheme': 'light dark', ...FIXED_TOKENS }),
      ...extraTokens(extraFixed, 'extraFixed'),
      ...tokensOf(DEFAULT_LIGHT_THEME)
    }),
    ...Object.entries(extraBlocks).flatMap(([selector, tokens]) => {
      if (breaksOut(selector)) {
        throw new Error(`extraBlocks['${selector}'] is a selector that would end its rule early.`);
      }
      return block(selector, extraTokens(tokens, `extraBlocks['${selector}']`));
    }),
    ...media('(prefers-color-scheme: dark)', block(':root', tokensOf(DEFAULT_DARK_THEME), 1)),
    ...media('(prefers-color-scheme: light)', themed('light')),
    ...media('(prefers-color-scheme: dark)', themed('dark')),
    ...THEMES.flatMap((theme) =>
      block(`[${THEME_PREVIEW_ATTRIBUTE}='${theme.id}']`, own(previewTokens(theme)))
    )
  ]
    .join('\n\n')
    .concat('\n');
}
