# Shell (`@bigpixelrocket/uiok/shell`)

The surfaces an app's window draws around its own pages, which every app of the family draws the same way: the title bar (the lockup and its brand mark, the release channel's marker, the update pill), the Settings dialog (its frame, the sidebar of pages, a page's subsections, a settings file's problems) and its shared pages (Appearance with the theme picker, Language, Updates with its cards and notes, Files), the About window, the sign-in prompts, and the block a part of the window shows when it fails to load. The components below draw them; their look is `src/shell/shell.css` in `@bigpixelrocket/uiok/styles.css`, and the class tables after them say what each class does, for a host that writes the markup itself. The app keeps its words (through props and `UiokLabels`), its behaviour (what a verb asks of its host), its icon, and its brand mark's glyph.

## Components

| Component             | What it draws                                                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TitleBar`            | The window's title bar where the native one is hidden (`.shell-topbar`): its children at the leading end, clear of macOS's window buttons with `trafficLights`; a drag region but for the marker |
| `Lockup`              | A product's wordmark (`lead` light, `strong` heavy) after an optional `mark`; `as="span"` inside another heading; `size` `title` (15px), `about` (21px), or `hero` (40px, the default)           |
| `BrandMark`           | The family's mark: a plate in the accent, the app's `glyph` on it (`BrandMarkShape`s on a 24-unit grid), and a check badge                                                                       |
| `ChannelMarker`       | A build's channel after the lockup: a dot in `--channel`, the name, the build number or branch (`detail`), a dot for uncommitted changes (`modified`), the whole line as a tooltip (`title`)     |
| `UpdatePill`          | The title bar's update control while a build is offered: `state` `offered` (tonal), `ready` (primary), `download-failed` (neutral, warning outline)                                              |
| `AboutWindow`         | The About window's panel: `icon` (a URL), `lockup`, the `channelTag` coloured by `channel`, and the `version`                                                                                    |
| `SettingsDialog`      | The Settings dialog over `groups` of `SettingsPage`s, opened on `pageRequest`'s page; `notice` stands over the page column; `onPageShown` hears each page                                        |
| `SettingsSubsection`  | One subsection of a page (`id`, `title`), which the sidebar scrolls to and follows                                                                                                               |
| `SettingsSaveFailure` | A change a settings file could not take, as `SettingsDialog`'s `notice`, with a verb that turns to the page that lists it                                                                        |
| `AppearanceSettings`  | The Appearance page's Theme subsection: System, Light, or Dark, then each appearance's themes, the band in use marked                                                                            |
| `ThemeChoices`        | One appearance's themes as a radio group of miniatures (`ThemePreview`); `themesOf(appearance)` lists the catalog's                                                                              |
| `LanguageChoice`      | A Language page: one pop-up menu of `options`, each in its own language                                                                                                                          |
| `UpdatesPage`         | An Updates page's body: `checks` (an `UpdateChecks` cadence) over `card` (an `UpdateCard`), busy until the card is known                                                                         |
| `UpdateCard`          | The updater's status: `tone`, `glyph`, `title`, `sub`, `when`, one `verb`, a `run` (`RunHeader`), a `note`, a `failure`, and the offered build's `notes` (`UpdateNotes`)                         |
| `SettingsFiles`       | A Files page: the settings folder with a verb that shows it, then each file with its verbs (Open, Show in Finder, Copy Path) and its problems; a refused request shows under its row             |
| `SignInDialog`        | A password or passphrase asked in the dialog frame: `facts` (where and who), the field (`secretLabel`), and why it asks again (`rejection`)                                                      |
| `HostKeyDialog`       | A host key not seen before: the host as the one item, then its type and whole fingerprint                                                                                                        |
| `LoadFailure`         | The block a window shows in place of content that failed to load: glyph, `title`, `reason`, and `action`                                                                                         |

```tsx
import { BrandMark, ChannelMarker, Lockup, TitleBar, UpdatePill } from '@bigpixelrocket/uiok/shell';

<TitleBar trafficLights={platform === 'darwin'}>
  <Lockup
    size="title"
    lead="Acme"
    strong="OK"
    mark={
      <BrandMark
        glyph={[
          { d: 'M5 7l5-2.5L15 7l-5 2.5z M5 10.5l5 2.5 5-2.5 M5 14l5 2.5 5-2.5', look: 'line' }
        ]}
      />
    }
  />
  {channel ? (
    <ChannelMarker label="Local" detail="feat/services" title="Local build · feat/services" />
  ) : null}
</TitleBar>;
```

A brand mark's glyph is a list of shapes (`BrandMarkShape`: a path's `d` on the mark's 24-unit grid, inside the plate from 1 to 19 on each axis, and its `look`), drawn in order: `fill` fills a shape in the brand's white, `line` strokes it in that white (a line drawing), and `cut` strokes in the plate's colour over a white fill, so it reads as cut out of it.

```tsx
import {
  AppearanceSettings,
  SettingsDialog,
  SettingsSubsection,
  UpdatesPage
} from '@bigpixelrocket/uiok/shell';

<SettingsDialog
  groups={[
    {
      id: 'app',
      title: 'App',
      pages: [
        {
          id: 'appearance',
          title: 'Appearance',
          Icon: Palette,
          subsections: [{ id: 'theme', title: 'Theme' }],
          body: (
            <AppearanceSettings
              mode={mode}
              onModeChange={saveMode}
              themes={themes}
              onThemeChange={saveTheme}
            />
          )
        },
        {
          id: 'updates',
          title: 'Updates',
          Icon: ArrowDownToLine,
          subsections: [],
          fills: true,
          body: <UpdatesPage checks={checks} card={card} />
        }
      ]
    }
  ]}
  pageRequest={request}
  onClose={close}
/>;
```

Each request to show Settings on a page is a `SettingsPageRequest` (`{ pageId, seq }`), the number growing with every request so a repeat for the page already chosen still turns to it. A page whose body takes the column's height (its notes scroll in a box of their own) sets `fills`. A page's `chip` stands after its sidebar title as a warning chip (an offered build's version, `settings-sidebar-chip`): words alone, or a `SettingsChip` (`text`, `icon`, a lucide glyph before the words such as an up arrow or a restart, and `tip`, its tooltip). While a row carries a chip its accessible name is `settings.pageWithChip(title, tip ?? text)` ("Updates, Update to 1.4.4"), so the page and the chip are read apart, never as one word.

A page with keys of its own (a shortcut editor's find and recording) hands them to the dialog while it shows with `useSettingsPageKeys({ legend, onLeave, done })`: its legend replaces Done, `onLeave` runs on Escape and the leave slot instead of closing, and `done` puts Done back as the primary while Return has nothing of the page's to do. It gives them back as it unmounts. `settingsLegend(keys, onDone, done)` is the legend the dialog draws, and `SettingsPageKeysContext` is where a page renders on its own without a dialog. A page marks the control it brings into view as it opens with `SETTINGS_REVEAL_ATTRIBUTE` (`ThemeChoices` does for the theme in use), and a sticky head over its subsections with `SETTINGS_PAGE_HEAD_ATTRIBUTE`. `spiedSubsection` and `subsectionScrollTop` are the pure rules of which subsection the sidebar marks and where a sidebar click scrolls.

`useSystemDark()` follows the system's appearance; `appearanceInUse(mode, systemDark)` says which appearance the window wears; `steppedIndex(key, index, count)` is the arrow keys' step in a radio group.

### Labels read

`settings`: `title`, `sidebar`, `done`, and `pageWithChip` (`SettingsDialog`), `appearance` (`AppearanceSettings`). `dialog`: `cancel` (`SignInDialog`'s leave verb). See [labels](../labels.md).

## Settings dialog

uiok's `ModalDialog`, frosted, with `className="settings-dialog"`: a fixed frame (900 by 620, less in a smaller window) so switching pages never moves it. Its body is the sidebar beside the page column, reaching the frame's edges.

```tsx
<ModalDialog className="settings-dialog" frosted title="Settings" …>
  <div className="settings-dialog-body">
    <nav className="settings-sidebar scroll-fade" aria-label="Settings pages">
      <div className="settings-sidebar-group">
        <span className="settings-sidebar-header overline">App</span>
        <button className="settings-sidebar-page" aria-current="page">
          <Palette size={ICON_MD} />
          <span {...cutTooltip('Appearance')}>Appearance</span>
        </button>
        <div className="settings-sidebar-subsections">
          <button className="settings-sidebar-subsection" aria-current="location" {...cutTooltip('Light theme')}>
            Light theme
          </button>
        </div>
        <button className="settings-sidebar-page">
          <Download size={ICON_MD} />
          <span {...cutTooltip('Updates')}>Updates</span>
          <span className="settings-sidebar-chip">2.5.0</span>
        </button>
      </div>
    </nav>
    <div className="settings-column">
      <div className="settings-page scroll-fade">
        <h3 className="settings-page-title">Appearance</h3>
        <section className="settings-subsection">
          <h4 className="overline">Light theme</h4>
          <div className="field-grid">…</div>
        </section>
      </div>
    </div>
  </div>
</ModalDialog>
```

| Class                                      | What it is                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `settings-dialog`                          | On the `ModalDialog`: the fixed frame                                                                                                                                                                                                                                                                                                      |
| `settings-dialog-body`                     | The sidebar's 196px column beside the page column, edge to edge                                                                                                                                                                                                                                                                            |
| `settings-sidebar`                         | The sidebar on `--scrim-strong`; add `scroll-fade`                                                                                                                                                                                                                                                                                         |
| `settings-sidebar-group`                   | A set of pages; 12px from the set before it                                                                                                                                                                                                                                                                                                |
| `settings-sidebar-header`                  | With `overline`: the set's name                                                                                                                                                                                                                                                                                                            |
| `settings-sidebar-page`                    | A page's row (a `button`): its glyph and title, 26px (`--bar-height`), wrapping on the compact line with its glyph and chip on the first line (a `cutTooltip` on its `span` is harmless: it never opens). `aria-current="page"` puts it on the current item's tint and ring, with its glyph full. Hover is the quiet control's shared look |
| `settings-sidebar-chip`                    | A page's trailing label as a warning chip (an offered build); on the current page it keeps the outline alone                                                                                                                                                                                                                               |
| `settings-sidebar-subsections`             | The current page's subsections on a rail (a hairline) under its row                                                                                                                                                                                                                                                                        |
| `settings-sidebar-subsection`              | A subsection's row (a `button`), 22px, dim; `aria-current="location"` marks the one in view: bold in `--text`, with its segment of the rail lit in `--accent`. No fill: the page's row keeps the one current-item tint                                                                                                                     |
| `settings-column`                          | The page column, ruled off from the sidebar                                                                                                                                                                                                                                                                                                |
| `settings-page`                            | The page that scrolls in it; add `scroll-fade`. `fills` makes its body take the column's height (a part of it scrolls in its own box)                                                                                                                                                                                                      |
| `settings-page-title`                      | The page's title                                                                                                                                                                                                                                                                                                                           |
| `settings-subsection`                      | A group of rows under its `overline` (or `settings-subsection-title`), a hairline between groups                                                                                                                                                                                                                                           |
| `settings-label-detail`                    | A row label's quieter second line                                                                                                                                                                                                                                                                                                          |
| `settings-restore`                         | Restore default value: dim beside a setting off its default                                                                                                                                                                                                                                                                                |
| `settings-count`, `settings-count-or-word` | On a `field`: a count a few digits wide (9ch), or one whose empty field reads as a word such as "No limit" (20ch)                                                                                                                                                                                                                          |
| `settings-save-failure`                    | On a danger `notice` over the page column: a change a file could not take                                                                                                                                                                                                                                                                  |

A page's rows are `field-grid` ([Field](field.md)) at the small size, every page on the one label column: `settings-page` sets `--field-label-width: 136px`, so the controls start at the same place on every page. A lone form outside Settings sizes its column to its longest label instead.

### A new problem in a settings file

A new mistake in a settings file needs the user's attention but is not the outcome of the control they just used, so the host raises an alert, never a line under its header: uiok's `ConfirmDialog` with `tone="warning"`, `TriangleAlert`, and `size="md"`. The title says what it is ("Settings File Problem"), the message what happens meanwhile, and each problem the host carries is a fact row (`{ label: place, value: message, more }`, the place being the file and line), the last one ending in "+N more". Close is the leave verb on Escape; Show Problems opens Settings on the page that lists them all. It opens once per set of problems.

### A settings file's problems

`SettingsFiles` (`SettingsFilesProps`) draws the Files page from data: `folderLabel`, `folderHelp`, `folder`, `showFolderLabel` with `onShowFolder`, `folderProblem`, `openLabel`, `copyPathLabel`, and `files`. Each `SettingsFileEntry` has its `name`, `summary`, `problems` (`SettingsFileProblem`s in line order) with `problemsLabel`, and the verbs the host gives it, drawn in this order: `onOpen` (Open, in the system's editor), `onShow` (Show in Finder, under `showFolderLabel`: the file picked in its folder), and `onCopyPath` (Copy Path, under `copyPathLabel`, which the page needs for any file to draw it). Leave a verb out while it cannot run (Open and Show in Finder while the file does not exist). Each verb is a `SettingsFileRequest`, a promise of null when it went through or a failure's message, which shows under the file's row; of a row's requests the latest started is the one whose answer shows, so a slow one ending late never replaces it. Every file's verbs share their words, so each button is described by its file's name (`aria-describedby`).

| Class                         | What it is                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `settings-file-name`          | A file's name in the code face (on its `field-label`)                                                                        |
| `settings-file-path`          | A path in the code face, selectable so it can be copied, cut with an ellipsis (give it a tooltip with the whole path)        |
| `settings-file-action`        | On a `Button` at the end of a file's line                                                                                    |
| `settings-file-problems`      | The list of a file's problems                                                                                                |
| `settings-file-problem`       | On a `notice` (`notice-danger` for a problem with `CircleAlert`, plain and dim for a note with `Info`), its tone glyph first |
| `settings-file-problem-text`  | With `notice-text`, after the glyph: where it is over what is wrong                                                          |
| `settings-file-problem-place` | Where it is (line and key), above what is wrong                                                                              |

## Theme picker

A radio group of miniatures, one per theme, each with its name under it. Each miniature is drawn by the theme's own preview tokens: the element that wears `data-theme-preview` (`THEME_PREVIEW_ATTRIBUTE` from `@bigpixelrocket/uiok/themes`) set to the theme's id paints that theme whatever the page wears ([Themes](../themes.md)).

```tsx
<div className="theme-choices" role="radiogroup" aria-label="Light theme">
  <button className="theme-choice" role="radio" aria-checked="true">
    <span className="theme-choice-frame">
      <span className="theme-preview" data-theme-preview="catppuccin-latte" aria-hidden>
        <span className="theme-preview-header">
          <span className="theme-preview-lights">
            <span />
            <span />
            <span />
          </span>
        </span>
        <span className="theme-preview-body">
          <span className="theme-preview-sidebar">
            <span className="theme-preview-row lit" />
            <span className="theme-preview-row" />
          </span>
          <span className="theme-preview-panel">
            <span className="theme-preview-line text" />
            <span className="theme-preview-line dim" />
            <span className="theme-preview-chips">
              <span className="theme-preview-chip primary" />
              <span className="theme-preview-chip accent" />
            </span>
            <span className="theme-preview-swatches">
              <span className="theme-preview-swatch ansi-1" /> … ansi-6
            </span>
          </span>
        </span>
      </span>
    </span>
    <span className="theme-choice-name" data-name="Catppuccin Latte">
      Catppuccin Latte
    </span>
  </button>
</div>
```

- **Rest:** a 1px `--border-strong` frame; the name dim.
- **Hover:** the frame's hairline darkens to `--text-dim`; the name in `--text`. Nothing grows.
- **Chosen** (`aria-checked="true"`): a 2px accent ring round the miniature; the name in `--text` at the strong weight.
- **Pressed:** the ring goes to full `--text` (or keeps the chosen accent ring), and the frame sinks (`--pressed-wash`, `--shadow-pressed`); the miniature stays where it is.
- **Focus:** the focus ring outside the frame, over whichever of the above applies, so a focused choice that is not chosen never reads as chosen.

A note after the grid (`field-note`) keeps 4px clear of it. The grid fills its column with miniatures at least 112px wide; a long name wraps. Repeat the name in `data-name` on `theme-choice-name`: the name reserves the room its strong weight takes, so choosing a theme never rewraps its name or moves the rows under it.

## Updates

The Updates page (`updates-page`, in a `settings-page fills`) holds the check cadence over the status card, both on `card` ([Notices and cards](surface.md)).

| Class                 | What it is                                                                                                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `update-checks`       | The cadence: `update-checks-label`, the select at the end, a `field-note` under both                                                                                                                                                        |
| `update-card`         | The status card; `data-tone` is `idle`, `busy`, `ready`, `ok`, `warning`, or `error` and colours its glyph; an error's headline takes `--danger-text`, its reason stays quiet                                                               |
| `update-card-head`    | The glyph's 16px column, `update-card-said` (`update-card-title` over `update-card-sub`; a `strong` in the title, such as a version, is set strong), and a `Button` at the end. It never shrinks: under a long list only the notes give way |
| `update-card-glyph`   | The state's glyph; add `spinner` while it checks                                                                                                                                                                                            |
| `update-card-note`    | A quiet line under the head                                                                                                                                                                                                                 |
| `with-run`            | A download under the head (uiok's `RunHeader`): the head turns quieter and ruled off, its glyph a size down in the same column. The head's glyph stays still (the `Download` arrow), since the `RunHeader`'s ring is the one that turns     |
| `with-notes`          | Notes at the card's foot: the card grows only to the column's bottom                                                                                                                                                                        |
| `update-notes`        | What's new under a hairline, its heading an `overline`                                                                                                                                                                                      |
| `update-notes-list`   | One line per change; add `scroll-fade` and `tabIndex={0}`, so the arrow keys scroll it. A squeezed list keeps `--update-note-rows` rows (3 unless set)                                                                                      |
| `update-notes-frame`  | Round a fading list: draws the list's focus ring, which the fade's mask would erase on the list itself, and gives the list a small inset so the ring clears the text                                                                        |
| `update-notes-groups` | On the list when the lines come under areas: the list a `div` with `role="group"`, each `update-notes-group` a `div` holding an `update-notes-area` heading over its own `ul`                                                               |

A download that stopped short draws no empty track in the card's `RunHeader`, and the reason it prints (what the system returned) is in the code face at the small size.

The `error` tone colours the card's title, so it is for a card whose title is the failure itself ("The update could not be installed"), with the reason in `update-card-sub`. A host whose title stays neutral, such as the installed version over a check that could not reach the feed, keeps a neutral tone (`idle`) and tells the failure as a failed download is told: a failed `RunHeader` in the card's run block (`with-run`), its headline the failure, its detail the reason the system returned, and the time as a fact. That way the one line in `--danger-text` is always the one that says what went wrong. A running download's `RunHeader` puts the clock (`figure`) on the headline's line at the headline's size, so the two share a baseline, and leads its facts with the percent.

### The update pill

`shell-update-pill` on a header's `Button` (tonal while a build is offered, primary once it is ready to install, neutral after a failed download, `data-state` naming the state): it appears at once, as every control does, and keeps its words on one line. With `data-state="download-failed"` its border (kept under hover and press) and its glyph wear `--warning`; its words stay in the button's colour. It never shows progress.

## Channel tag

`channel-tag` on a `span` beside a lockup, on a build that is not the release: the channel's name in small capitals on a pill tinted with the channel's hue. An element with `data-channel="latest"` or `data-channel="local"` (the app's root, the About window) sets `--channel` (the hue) and `--channel-text` (its words, 4.5:1 on the pill) for its scope from the theme's channel tokens ([Themes](../themes.md)); without one the tag wears `--accent` and `--accent-text`.

## Title bar

`shell-topbar` (`TitleBar`) holds `shell-brand`, which lays out the lockup (`shell-lockup`, 15px) and the channel marker (`shell-channel`: `shell-channel-dot`, `shell-channel-name`, `shell-channel-detail`, which gives way to an ellipsis up to 224px, and `shell-channel-modified`). With `data-traffic-lights` the brand starts at `--traffic-light-inset`. The marker's words are `--channel-name` and `--channel-detail`, each 4.5:1 on the header; its dot is `--channel`, ringed with `--group-dot-ring` where a channel's hue sits near 2:1. `shell-trailing` holds the update pill after the main pane's tabs, out of the drag region.

## Lockup and brand mark

`lockup` (`Lockup`): the mark 0.4em from the wordmark (`lockup-wordmark`, its `b` heavy), sized by `--lockup-size` (40px unless set). `brand-mark` (`BrandMark`, 1.4em square): `brand-mark-plate` in the accent, the glyph, `brand-mark-badge` in the success hue ringed in `--surface-header`, and `brand-mark-check`. Under a dark appearance the plate and the badge deepen toward `--brand-plate` (`--brand-plate-dark`, `--brand-badge-dark`), so the white keeps its contrast on a light accent.

## About window

`about-window` (`AboutWindow`) on the window's one panel: the app's icon (`about-icon`, 128px), `about-lockup` (the lockup, `about-lockup-text` at 21px, beside the channel tag), and `about-version`, the version in the code face at the caption size, dim, the one line a reader may select. A fixed frame the window's height that never scrolls, its content centred in it with a 12px inset; the panel drags the window under a hidden title bar, all but the version line.

## Sign-in prompts

A `ModalDialog` that asks for what a connection needs to sign in.

- `sign-in-dialog` (420px): one body in every host. The title is "Sign In" alone, never the host's name. The body is one label column (`field-grid`) that opens with two fact rows saying where and who: a Server row (the server's name), then an Account row (`user@host`), or a Key file row (`~/.ssh/id_ed25519`) for a passphrase, so a long account or path never crowds the field. Each fact row is a `field-label sign-in-fact` and a `p.sign-in-fact-value` (one dim line, cut with an ellipsis; give it `cutTooltip`). Then the secret as one row of the label column, a `field-grid` ([Field](field.md)): its one-word `field-label` (Password, Passphrase) at the leading edge (the column as wide as the label, the label column's default, its line centred on the 28px field), then a `field-value` holding the field (`field sign-in-field`) and, under the field, a choice such as Save in Keychain or, after a refusal, a `field-problem` named in the field's `aria-describedby` with `aria-invalid="true"` on the field. Never a label stacked over the field.
- A host key the computer has not seen before is a `ConfirmDialog` ([Dialogs](dialog.md#one-anatomy-for-every-case)): a title such as "Trust Host Key?", a lead, the host as its one item, and then, as its children, `sign-in-fingerprint`, a `dl` framed as a well (`--border-strong`, `--radius-md`) of the key's type (`dt`, dim) and fingerprint (`dd`, selectable, whole on one line where it fits). It takes the confirmation's width; no class sets another.

## Exit confirmation

The confirmation shown before an app quits or restarts with work running is uiok's `ConfirmDialog`, in the anatomy every confirmation has ([Dialogs](dialog.md#one-anatomy-for-every-case)): a title of at most five words with no count ("Quit?"), the lead that says what stops and how many, then what is running as `groups`, each kind's short label and count above the same framed list of items.

```tsx
<ConfirmDialog
  title="Quit?"
  message="Quitting stops 3 processes and pauses 1 transfer. Logs are kept, and the transfer resumes at the next launch."
  groups={[
    { label: 'Running processes', icon: Cog, items: [{ name: 'api', detail: 'shop' }, …] },
    { label: 'Transfers', icon: ArrowUpDown, items: [{ name: 'backup.tar.gz', detail: '1.2 GB' }] }
  ]}
  …
/>
```

An app that can keep its work running without a window offers that as the confirmation's `alternative` (Close Window and Keep Running, on its own chord such as ⌥⏎), between Cancel and the confirm verb.

## Load failure

`LoadFailure` (`title`, `reason`, `action`, `icon`) is the block a window shows in place of content that failed to load, outside any pane: the failure's glyph (`CircleAlert` unless given, at `ICON_XL`, in `--danger`), the headline, a dim reason at most 420px wide, and its way on, centred in the space it takes and announced as an alert.

```tsx
<LoadFailure
  title="Could not load projects"
  reason="EACCES: permission denied"
  action={<Button onClick={retry}>Try Again</Button>}
/>
```

It is the window's counterpart of `EmptyState` with `failure` ([Listing](listing.md)), which a pane inside a listing uses.

## Keyboard

The classes add no keys. The sidebar's rows and the theme choices are buttons; a theme picker is a radio group, so the app moves the choice with the arrow keys and keeps only the chosen radio in the tab order.
