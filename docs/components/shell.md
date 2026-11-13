# Settings, themes, and updates

The surfaces an app's window draws around its own pages, which every app of the family draws the same way: the Settings dialog (its frame, the sidebar of pages, a page's subsections, a settings file's problems), the theme picker, the Updates page's cards and notes, the update pill's failed state, the release channel tag, the About window's layout, the sign-in prompts, and the block a part of the window shows when it fails to load. They ship in `@bigpixelrocket/uiok/styles.css` (`src/shell/shell.css`). None is a component: the app writes the markup, the words, and the behaviour, and puts these classes on it. The app's header, brand wordmark, icon, window drag regions, and startup screens stay the app's.

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

| Class                          | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `settings-dialog`              | On the `ModalDialog`: the fixed frame                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `settings-dialog-body`         | The sidebar's 196px column beside the page column, edge to edge                                                                                                                                                                                                                                                                                                                                                                                                       |
| `settings-sidebar`             | The sidebar on `--scrim-strong`; add `scroll-fade`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `settings-sidebar-group`       | A set of pages; 12px from the set before it                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `settings-sidebar-header`      | With `overline`: the set's name                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `settings-sidebar-page`        | A page's row (a `button`): its glyph and title, 26px (`--bar-height`), wrapping on the compact line with its glyph and chip on the first line (a `cutTooltip` on its `span` is harmless: it never opens). `aria-current="page"` puts it on the current item's tint and ring, with its glyph full. Hover is the quiet control's shared look                                                                                                                            |
| `settings-sidebar-chip`        | A page's trailing label as a warning chip (an offered build); on the current page it keeps the outline alone                                                                                                                                                                                                                                                                                                                                                          |
| `settings-sidebar-subsections` | The current page's subsections on a rail (a hairline) under its row                                                                                                                                                                                                                                                                                                                                                                                                   |
| `settings-sidebar-subsection`  | A subsection's row (a `button`), 22px, dim; `aria-current="location"` marks the one in view: bold in `--text`, with its segment of the rail lit in `--accent`. No fill: the page's row keeps the one current-item tint                                                                                                                                                                                                                                                |
| `settings-column`              | The page column, ruled off from the sidebar                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `settings-page`                | The page that scrolls in it; add `scroll-fade`. `fills` makes its body take the column's height (a part of it scrolls in its own box)                                                                                                                                                                                                                                                                                                                                 |
| `settings-page-title`          | The page's title                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `settings-subsection`          | A group of rows under its `overline` (or `settings-subsection-title`), a hairline between groups                                                                                                                                                                                                                                                                                                                                                                      |
| `settings-label-detail`        | A row label's quieter second line                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `settings-save-failure`        | On a danger `notice` over the page column: a change a file could not take                                                                                                                                                                                                                                                                                                                                                                                             |
| `settings-notice`              | On a warning `notice notice-card` outside the dialog: the window's status line under the header about a new mistake in a settings file (glyph, words, a small Show button, no close cross), one line cut with an ellipsis, so its `notice-text` takes `cutTooltip` with the whole text; `settings-notice-place` (code face), `settings-notice-more` (dim; put it after the `notice-text`, not inside it, so a narrow window cuts the words and keeps the count whole) |

A page's rows are `field-grid` ([Field](field.md)) at the small size, every page on the one label column: `settings-page` sets `--field-label-width: 136px`, so the controls start at the same place on every page. A lone form outside Settings sizes its column to its longest label instead.

### A settings file's problems

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

`channel-tag` on a `span` beside a lockup, on a build that is not the release: the channel's name in small capitals on a pill tinted with the channel's hue. An app that colours its channels sets `--channel` (the hue) and `--channel-text` (its words, 4.5:1 on the pill) for the tag's scope; without them it wears `--accent` and `--accent-text`.

## About window

`about-window` on the window's one panel: the app's icon, `about-lockup` (the icon-sized mark and the wordmark side by side, 6px apart), and `about-version`, the version in the code face at the caption size, dim, the one line a reader may select. A fixed frame the window's height that never scrolls, its content centred in it with a 12px inset. The app sizes its icon and wordmark and sets its window's drag regions.

## Sign-in prompts

A `ModalDialog` that asks for what a connection needs to sign in.

- `sign-in-dialog` (420px): one body in every host. The title is "Sign In" alone, never the host's name. The body is one label column (`field-grid`) that opens with two fact rows saying where and who: a Server row (the server's name), then an Account row (`user@host`), or a Key file row (`~/.ssh/id_ed25519`) for a passphrase, so a long account or path never crowds the field. Each fact row is a `field-label sign-in-fact` and a `p.sign-in-fact-value` (one dim line, cut with an ellipsis; give it `cutTooltip`). Then the secret as one row of the label column, a `field-grid` ([Field](field.md)): its one-word `field-label` (Password, Passphrase) at the leading edge (the column as wide as the label, the label column's default, its line centred on the 28px field), then a `field-value` holding the field (`field sign-in-field`) and, under the field, a choice such as Save in Keychain or, after a refusal, a `field-problem` named in the field's `aria-describedby` with `aria-invalid="true"` on the field. Never a label stacked over the field.
- `sign-in-host-key` (520px): the question, then `sign-in-fingerprint`, a `dl` framed as a well (`--border-strong`, `--radius-md`) of the key's type (`dt`, dim) and fingerprint (`dd`, selectable, whole on one line where it fits).

## Exit confirmation

The confirmation shown before an app quits or restarts with work running is uiok's `ConfirmDialog` with `className="exit-confirmation dialog-size-md"` (480px), read at a glance: a title of at most five words that says what will happen, one short sentence of consequence, then what is running as `facts`, one row each (a label, a count, a few names cut with an ellipsis).

```tsx
<ConfirmDialog
  className="exit-confirmation dialog-size-md"
  title="Quit and Stop Tasks?"
  message="Logs are kept; the transfer resumes at the next launch."
  facts={[
    { label: 'Processes', count: 3, value: 'api, web, worker' },
    { label: 'Transfers', count: 1, value: 'backup.tar.gz' }
  ]}
  …
/>
```

## Load failure

`space-load-failure` on the block shown in place of content that failed to load: the failure's glyph first (`CircleAlert` at `ICON_XL` with `absoluteStrokeWidth`, drawn in `--danger`), a `strong` headline, a dim `p` with the reason (at most 420px wide), and any action, centred in the space it takes.

```tsx
<div className="space-load-failure" role="alert">
  <CircleAlert size={ICON_XL} absoluteStrokeWidth aria-hidden />
  <strong>Could not load projects</strong>
  <p>EACCES: permission denied</p>
  <Button onClick={retry}>Try Again</Button>
</div>
```

It is the window's counterpart of a listing pane's `.pane-empty` block ([Listing](listing.md)), which adds a row of actions and the system's error line; a pane inside a listing uses that one.

## Keyboard

The classes add no keys. The sidebar's rows and the theme choices are buttons; a theme picker is a radio group, so the app moves the choice with the arrow keys and keeps only the chosen radio in the tab order.
