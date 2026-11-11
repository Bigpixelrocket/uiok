# Settings, themes, and updates

The surfaces an app's window draws around its own pages, which every app of the family draws the same way: the Settings dialog (its frame, the sidebar of pages, a page's subsections, a settings file's problems), the theme picker, the Updates page's card and notes, the update pill's entrance, the release channel tag, the sign-in prompts, and the block a part of the window shows when it fails to load. They ship in `@bigpixelrocket/uiok/styles.css` (`src/shell/shell.css`). None is a component: the app writes the markup, the words, and the behaviour, and puts these classes on it. The app's header, brand lockup, and startup screens stay the app's.

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
          <span>Appearance</span>
        </button>
        <div className="settings-sidebar-subsections">
          <button className="settings-sidebar-subsection" aria-current="location">
            Light theme
          </button>
        </div>
        <button className="settings-sidebar-page">
          <Download size={ICON_MD} />
          <span>Updates</span>
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

| Class                          | What it is                                                                                                                                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `settings-dialog`              | On the `ModalDialog`: the fixed frame                                                                                                                                                                       |
| `settings-dialog-body`         | The sidebar's 196px column beside the page column, edge to edge                                                                                                                                             |
| `settings-sidebar`             | The sidebar on `--scrim-strong`; add `scroll-fade`                                                                                                                                                          |
| `settings-sidebar-group`       | A set of pages; 12px from the set before it                                                                                                                                                                 |
| `settings-sidebar-header`      | With `overline`: the set's name                                                                                                                                                                             |
| `settings-sidebar-page`        | A page's row (a `button`): its glyph and title, 26px (`--bar-height`), wrapping on the compact line. `aria-current="page"` puts it on the current item's tint and ring, with its glyph full                 |
| `settings-sidebar-chip`        | A page's trailing label as a warning chip (an offered build); on the current page it keeps the outline alone                                                                                                |
| `settings-sidebar-subsections` | The current page's subsections on a rail under its row                                                                                                                                                      |
| `settings-sidebar-subsection`  | A subsection's row (a `button`), 22px, dim; `aria-current="location"` lights it and the rail beside it                                                                                                      |
| `settings-column`              | The page column, ruled off from the sidebar                                                                                                                                                                 |
| `settings-page`                | The page that scrolls in it; add `scroll-fade`. `fills` makes its body take the column's height (a part of it scrolls in its own box)                                                                       |
| `settings-page-title`          | The page's title                                                                                                                                                                                            |
| `settings-subsection`          | A group of rows under its `overline` (or `settings-subsection-title`), a hairline between groups                                                                                                            |
| `settings-label-detail`        | A row label's quieter second line                                                                                                                                                                           |
| `settings-save-failure`        | On a danger `notice` over the page column: a change a file could not take                                                                                                                                   |
| `settings-notice`              | On a warning `notice notice-card` outside the dialog: a band under the header about a new mistake in a settings file, in the page's flow; `settings-notice-place` (code face), `settings-notice-more` (dim) |

A page's rows are `field-grid` ([Field](field.md)) at the small size, every page on the one label column.

### A settings file's problems

| Class                         | What it is                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `settings-file-name`          | A file's name in the code face (on its `field-label`)                                 |
| `settings-file-path`          | A path in the code face, cut with an ellipsis (give it a tooltip with the whole path) |
| `settings-file-action`        | On a `Button` at the end of a file's line                                             |
| `settings-file-problems`      | The list of a file's problems                                                         |
| `settings-file-problem`       | On a `notice` (`notice-danger` for a problem, plain and dim for a note)               |
| `settings-file-problem-place` | Where it is (line and key), above what is wrong                                       |

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
    <span className="theme-choice-name">Catppuccin Latte</span>
  </button>
</div>
```

- **Rest:** a 1px `--border-strong` frame; the name dim.
- **Hover:** the frame and the name in `--text-dim` and `--text`.
- **Chosen** (`aria-checked="true"`): a 2px accent ring round the miniature; the name in `--text` at the strong weight.
- **Pressed:** the frame sinks (`--pressed-wash`, `--shadow-pressed`), keeping the chosen ring if it has one.
- **Focus:** the focus ring outside the frame, over whichever of the above applies, so a focused choice that is not chosen never reads as chosen.

A note after the grid (`field-note`) keeps 4px clear of it. The grid fills its column with miniatures at least 112px wide; a long name wraps.

## Updates

The Updates page (`updates-page`, in a `settings-page fills`) holds the check cadence over the status card, both on `card` ([Notices and cards](surface.md)).

| Class                 | What it is                                                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `update-checks`       | The cadence: `update-checks-label`, the select at the end, a `field-note` under both                                                                                          |
| `update-card`         | The status card; `data-tone` is `idle`, `busy`, `ready`, `ok`, `warning`, or `error` and colours its glyph (the error's words too)                                            |
| `update-card-head`    | The glyph's 16px column, `update-card-said` (`update-card-title` over `update-card-sub`), and a `Button` at the end                                                           |
| `update-card-glyph`   | The state's glyph; add `spinner` while it checks                                                                                                                              |
| `update-card-note`    | A quiet line under the head                                                                                                                                                   |
| `with-run`            | A download under the head (uiok's `RunHeader`): the head turns quieter and ruled off, its glyph a size down in the same column                                                |
| `with-notes`          | Notes at the card's foot: the card grows only to the column's bottom                                                                                                          |
| `update-notes`        | What's new under a hairline, its heading an `overline`                                                                                                                        |
| `update-notes-list`   | One line per change; add `scroll-fade` and `tabIndex={0}`. A squeezed list keeps `--update-note-rows` rows (3 unless set)                                                     |
| `update-notes-groups` | On the list when the lines come under areas: the list a `div` with `role="group"`, each `update-notes-group` a `div` holding an `update-notes-area` heading over its own `ul` |

A download that stopped short draws no empty track in the card's `RunHeader`.

### The update pill

`shell-update-pill` on a header's `Button` (tonal while a build is offered, primary once it is ready to install, neutral after a failed download, `data-state` naming the state): it slides in once (not under reduced motion) and keeps its words on one line. With `data-state="download-failed"` its glyph wears `--warning`; its words stay in the button's colour. It never shows progress.

## Channel tag

`channel-tag` on a `span` beside a lockup, on a build that is not the release: the channel's name in small capitals on a pill. An app that colours its channels sets `--channel` (the hue) and `--channel-text` (its words, 4.5:1 on the pill) for the tag's scope; without them it wears `--accent` and `--accent-text`.

## Sign-in prompts

A `ModalDialog` that asks for what a connection needs to sign in.

- `sign-in-dialog` (420px): a secret in a `field-group` ([Field](field.md)): its `field-label`, the field with `field sign-in-field` across the dialog, and, after a refusal, a `field-problem` named in the field's `aria-describedby` with `aria-invalid="true"` on the field.
- `sign-in-host-key` (520px): the question, then `sign-in-fingerprint`, a `dl` of the key's type (`dt`, dim) and fingerprint (`dd`, selectable, whole on one line where it fits).

## Load failure

`space-load-failure` on the block shown in place of content that failed to load: a `strong` headline, a dim `p` with the reason (at most 420px wide), and any action, centred in the space it takes.

## Keyboard

The classes add no keys. The sidebar's rows and the theme choices are buttons; a theme picker is a radio group, so the app moves the choice with the arrow keys and keeps only the chosen radio in the tab order.
