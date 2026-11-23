/**
 * The words the read-only file viewer repeats for every file: its modes,
 * the facts line, change notices, each view's status line, buttons, and
 * fallbacks, and the number, size, and date formats it writes them with.
 * The file's name and contents are the app's.
 */

/** The names of the viewer's modes in its switcher (`ViewerWindow`). */
export interface ViewerModeLabels {
  /** A text file's text: "Text". */
  readonly text: string;
  /** An SVG's markup: "Source". */
  readonly source: string;
  /** Any file's bytes: "Hex". */
  readonly hex: string;
  /** An image: "Image". */
  readonly image: string;
  /** Audio or video: "Player". */
  readonly player: string;
  /** A PDF: "Document". */
  readonly document: string;
}

/** What kind of file the facts line names, given the format where one is known. */
export interface ViewerContentLabels {
  /** "Text". */
  readonly text: string;
  /** "Binary". */
  readonly binary: string;
  /** "SVG image". */
  readonly svg: string;
  /** "PDF document". */
  readonly pdf: string;
  /** "PNG image", or "Image" when `format` is null. */
  readonly image: (format: string | null) => string;
  /** "MP3 audio", or "Audio" when `format` is null. */
  readonly audio: (format: string | null) => string;
  /** "QuickTime video", or "Video" when `format` is null. */
  readonly video: (format: string | null) => string;
}

/** The viewer's shared words. */
export interface ViewerLabels {
  /** The window's title while it has no file name to show: "Viewer". */
  readonly title: string;
  /** The failure shown when the viewer was given no reader: "The viewer could not reach its file." */
  readonly unreachable: string;
  /** The failure a reader call that rejected settles into: "The app did not answer." */
  readonly noAnswer: string;
  /** The mode switcher's accessible name: "View as". */
  readonly modesLabel: string;
  /** Each mode's name. */
  readonly modes: ViewerModeLabels;
  /** The verb that reopens a changed file: "Reload". */
  readonly reload: string;
  /** The kind of file, for the facts line. */
  readonly content: ViewerContentLabels;
  /** Where a copy came from, first in the facts line: "in backup.zip". */
  readonly inArchive: (archive: string) => string;
  /** When the file last changed, in the facts line: "Modified 2026-10-05 09:30". */
  readonly modified: (date: string) => string;
  /** The exact size on hover over the facts line: "1,234 bytes". */
  readonly exactSize: (count: number) => string;
  /** The note on hover for a copy: "A read-only copy of src/a.txt in backup.zip". */
  readonly readOnlyCopy: (path: string, archive: string) => string;
  /** The notices that the file changed at its source. */
  readonly change: {
    /** "The file changed on disk." */
    readonly modified: string;
    /** "The file was replaced on disk." */
    readonly replaced: string;
    /** "The file was moved or deleted. This window still shows it as it was opened." */
    readonly removed: string;
  };
  /** What the text and hex views show for an empty file: "The file is empty." */
  readonly empty: string;
  /** The status line while a large selection is read for copy: "Copying the selection…". */
  readonly copying: string;
  /** The status line when copy failed: "Could not copy the selection." */
  readonly copyFailed: string;
  /** The text view's words. */
  readonly text: {
    /** The rows' accessible name: "Text of notes.txt". */
    readonly rows: (name: string) => string;
    /** The status line's position: "Line 1,561". */
    readonly line: (line: number) => string;
    /** The position while lines are still being counted: "Byte 8,192 · Counting lines…". */
    readonly counting: (byte: number) => string;
    /** The wrap toggle: "Wrap". */
    readonly wrap: string;
    /** UTF-8 that starts with a byte order mark: "UTF-8 with BOM". */
    readonly utf8Bom: string;
    /** Highlighting off for a large file: "JavaScript · Not highlighted, file over 16 MB". */
    readonly tooLarge: (language: string, size: string) => string;
    /** Long lines left plain: "JavaScript · Lines over 4 KB not highlighted". */
    readonly longLines: (language: string, size: string) => string;
    /** Highlighting failed to load: "JavaScript · Could not load highlighting". */
    readonly unavailable: (language: string) => string;
    /** A selection too large to copy: "The selection is too large to copy. Select up to 1 MB of text at a time." */
    readonly copyTooLarge: (size: string) => string;
    /** A copy a reload overtook: "The file was reloaded. Select the text again." */
    readonly copyReloaded: string;
  };
  /** The hex view's words. */
  readonly hex: {
    /** The rows' accessible name: "Bytes of photo.png". */
    readonly rows: (name: string) => string;
    /** The status line's position: "Offset 00001F40". */
    readonly top: (offset: string) => string;
    /**
     * The status line's selection: "Offset 00000010 selected" for one byte,
     * "00000010–0000001F · 16 bytes" for more.
     */
    readonly selection: (start: string, end: string, count: number) => string;
    /** "Copy Hex". */
    readonly copyHex: string;
    /** "Copy Text". */
    readonly copyText: string;
    /** "The selection is too large to copy. Select up to 64 KB at a time." */
    readonly copyTooLarge: (size: string) => string;
    /** "The file was reloaded. Select the bytes again." */
    readonly copyReloaded: string;
    /** The jump button and its tooltip: "Go to Offset". */
    readonly jump: string;
    /** The jump field's accessible name: "Offset in hex". */
    readonly jumpLabel: string;
    /** The jump field's placeholder: "Offset, such as 1F40". */
    readonly jumpPlaceholder: string;
    /** "Type an offset in hex, such as 1F40 or 0x1F40." */
    readonly jumpInvalid: string;
    /** A jump in an empty file: "The file is empty." */
    readonly jumpEmpty: string;
    /** "Offset 2000 is past the end of the file. The last offset is 1FFF." */
    readonly jumpPastEnd: (offset: string, last: string) => string;
  };
  /** The image view's words. */
  readonly image: {
    /** Before the image decodes: "Loading…". */
    readonly loading: string;
    /** "1,280 × 720 px", given the numbers already formatted. */
    readonly pixelSize: (width: string, height: string) => string;
    /** The zoom: "25%". */
    readonly scale: (percent: string) => string;
    /** An SVG without a size of its own: "No intrinsic size". */
    readonly noIntrinsicSize: string;
    /** The fit button: "Fit". */
    readonly fit: string;
    /** The fit button's tooltip: "Zoom to Fit". */
    readonly fitTooltip: string;
    /** "Actual Size". */
    readonly actualSize: string;
    /** "Could not decode this image, so it shows in hex." */
    readonly fallbackDecode: string;
    /** "Could not render this SVG, so it shows its source." */
    readonly fallbackSvg: string;
  };
  /** The audio and video players' words. */
  readonly media: {
    /** "Play". */
    readonly play: string;
    /** "Pause". */
    readonly pause: string;
    /** The seek bar's name: "Seek". */
    readonly seek: string;
    /** The seek bar's value: "1:05 of 3:20". */
    readonly seekValue: (elapsed: string, total: string) => string;
    /** "Mute". */
    readonly mute: string;
    /** "Unmute". */
    readonly unmute: string;
    /** The volume slider's name: "Volume". */
    readonly volume: string;
    /** "Full Screen". */
    readonly enterFullScreen: string;
    /** "Exit Full Screen". */
    readonly exitFullScreen: string;
    /** A format the browser does not play: "Could not play this video format, so it shows in hex." */
    readonly fallbackFormat: (media: 'audio' | 'video') => string;
    /** "Could not decode this video, so it shows in hex." */
    readonly fallbackDecode: (media: 'audio' | 'video') => string;
    /** "Could not play this video, so it shows in hex." */
    readonly fallbackPlay: (media: 'audio' | 'video') => string;
    /** A video file with sound only: "No picture to show". */
    readonly noPicture: string;
    /** "1,280 × 720 px", given the numbers already formatted. */
    readonly pixelSize: (width: string, height: string) => string;
  };
  /** A whole number as the app's language writes it: "1,234". */
  readonly number: (value: number) => string;
  /** A size in bytes, short: "1.4 MB". */
  readonly size: (bytes: number) => string;
  /** A date and time: "2026-10-05 09:30"; empty for a date the file does not have. */
  readonly dateTime: (epochMs: number) => string;
}

const WHOLE = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const ONE_DECIMAL = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** "1.4 MB" in English: 1024 steps, one decimal under 100 of a unit, none from 100. */
const englishSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return '–';
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const amount = unit === 0 || value >= 100 ? WHOLE.format(value) : ONE_DECIMAL.format(value);

  return `${amount} ${SIZE_UNITS[unit] ?? 'B'}`;
};

/** "2026-10-05 09:30", local time. */
const englishDateTime = (epochMs: number): string => {
  if (!Number.isFinite(epochMs) || epochMs <= 0) return '';
  const date = new Date(epochMs);
  const pad = (part: number): string => String(part).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** English viewer words: the `viewer` group `UiokProvider` starts from. */
export const DEFAULT_VIEWER_LABELS: ViewerLabels = {
  title: 'Viewer',
  unreachable: 'The viewer could not reach its file.',
  noAnswer: 'The app did not answer.',
  modesLabel: 'View as',
  modes: {
    text: 'Text',
    source: 'Source',
    hex: 'Hex',
    image: 'Image',
    player: 'Player',
    document: 'Document'
  },
  reload: 'Reload',
  content: {
    text: 'Text',
    binary: 'Binary',
    svg: 'SVG image',
    pdf: 'PDF document',
    image: (format) => (format ? `${format} image` : 'Image'),
    audio: (format) => (format ? `${format} audio` : 'Audio'),
    video: (format) => (format ? `${format} video` : 'Video')
  },
  inArchive: (archive) => `in ${archive}`,
  modified: (date) => `Modified ${date}`,
  exactSize: (count) => (count === 1 ? '1 byte' : `${WHOLE.format(count)} bytes`),
  readOnlyCopy: (path, archive) => `A read-only copy of ${path} in ${archive}`,
  change: {
    modified: 'The file changed on disk.',
    replaced: 'The file was replaced on disk.',
    removed: 'The file was moved or deleted. This window still shows it as it was opened.'
  },
  empty: 'The file is empty.',
  copying: 'Copying the selection…',
  copyFailed: 'Could not copy the selection.',
  text: {
    rows: (name) => `Text of ${name}`,
    line: (line) => `Line ${WHOLE.format(line)}`,
    counting: (byte) => `Byte ${WHOLE.format(byte)} · Counting lines…`,
    wrap: 'Wrap',
    utf8Bom: 'UTF-8 with BOM',
    tooLarge: (language, size) => `${language} · Not highlighted, file over ${size}`,
    longLines: (language, size) => `${language} · Lines over ${size} not highlighted`,
    unavailable: (language) => `${language} · Could not load highlighting`,
    copyTooLarge: (size) =>
      `The selection is too large to copy. Select up to ${size} of text at a time.`,
    copyReloaded: 'The file was reloaded. Select the text again.'
  },
  hex: {
    rows: (name) => `Bytes of ${name}`,
    top: (offset) => `Offset ${offset}`,
    selection: (start, end, count) =>
      count === 1 ? `Offset ${start} selected` : `${start}–${end} · ${WHOLE.format(count)} bytes`,
    copyHex: 'Copy Hex',
    copyText: 'Copy Text',
    copyTooLarge: (size) => `The selection is too large to copy. Select up to ${size} at a time.`,
    copyReloaded: 'The file was reloaded. Select the bytes again.',
    jump: 'Go to Offset',
    jumpLabel: 'Offset in hex',
    jumpPlaceholder: 'Offset, such as 1F40',
    jumpInvalid: 'Type an offset in hex, such as 1F40 or 0x1F40.',
    jumpEmpty: 'The file is empty.',
    jumpPastEnd: (offset, last) =>
      `Offset ${offset} is past the end of the file. The last offset is ${last}.`
  },
  image: {
    loading: 'Loading…',
    pixelSize: (width, height) => `${width} × ${height} px`,
    scale: (percent) => `${percent}%`,
    noIntrinsicSize: 'No intrinsic size',
    fit: 'Fit',
    fitTooltip: 'Zoom to Fit',
    actualSize: 'Actual Size',
    fallbackDecode: 'Could not decode this image, so it shows in hex.',
    fallbackSvg: 'Could not render this SVG, so it shows its source.'
  },
  media: {
    play: 'Play',
    pause: 'Pause',
    seek: 'Seek',
    seekValue: (elapsed, total) => `${elapsed} of ${total}`,
    mute: 'Mute',
    unmute: 'Unmute',
    volume: 'Volume',
    enterFullScreen: 'Full Screen',
    exitFullScreen: 'Exit Full Screen',
    fallbackFormat: (media) => `Could not play this ${media} format, so it shows in hex.`,
    fallbackDecode: (media) => `Could not decode this ${media}, so it shows in hex.`,
    fallbackPlay: (media) => `Could not play this ${media}, so it shows in hex.`,
    noPicture: 'No picture to show',
    pixelSize: (width, height) => `${width} × ${height} px`
  },
  number: (value) => WHOLE.format(value),
  size: englishSize,
  dateTime: englishDateTime
};
