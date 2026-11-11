/**
 * The site's shell: a header with the theme switcher, a sidebar of pages, the
 * page shown, and a key legend along the bottom, all drawn with the
 * library's own components and tokens.
 */

import { Menu, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import {
  DARK_THEME_IDS,
  LIGHT_THEME_IDS,
  THEME_ENTRIES,
  TooltipLayer,
  UiokProvider
} from '@bigpixelrocket/uiok';
import { IconButton } from '@bigpixelrocket/uiok/button';
import { ICON_LG, ICON_MD } from '@bigpixelrocket/uiok/icon';
import { isModalOpen, isOverlayOpen, isTextEditingTarget } from '@bigpixelrocket/uiok/keyboard';
import { KeyChord } from '@bigpixelrocket/uiok/keychord';
import { KeyLegendStrip, type LegendPair, type LegendVerb } from '@bigpixelrocket/uiok/legend';
import { SegmentedChoice } from '@bigpixelrocket/uiok/segmented';
import { tooltip } from '@bigpixelrocket/uiok/tooltip';

import { CommandPalette } from './CommandPalette';
import { PAGES } from './pages';
import { go, useRoute } from './router';
import { SiteThemeContext, useSiteTheme, type AppearanceChoice } from './theme';

const APPEARANCES: readonly AppearanceChoice[] = ['system', 'light', 'dark'];
const APPEARANCE_WORDS: Readonly<Record<AppearanceChoice, string>> = {
  system: 'Auto',
  light: 'Light',
  dark: 'Dark'
};
const themeName = (id: string): string =>
  THEME_ENTRIES.find((entry) => entry.id === id)?.name ?? id;

const PAIR_LABELS: Readonly<Record<string, string>> = { previousNextPage: 'Previous/Next Page' };
const pairLabel = (pair: LegendPair): string => PAIR_LABELS[pair] ?? pair;

/** The page after or before the one shown, wrapping at the ends. */
function stepPage(route: string, by: 1 | -1): string {
  const at = PAGES.findIndex((page) => page.route === route);
  const next = PAGES[(Math.max(at, 0) + by + PAGES.length) % PAGES.length];
  return next?.route ?? '/';
}

/** The site. */
export function App() {
  const theme = useSiteTheme();
  const route = useRoute();
  const [finding, setFinding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const appearanceLabel = useId();
  const page = PAGES.find((candidate) => candidate.route === route) ?? PAGES[0];

  const mainRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const shownPage = useRef(page);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
    document.title = page === undefined || page.route === '/' ? 'UIOK' : `${page.title} · UIOK`;
    // A move to another page takes the focus to its content, so it does not stay on a nav link
    // that may now be hidden; the first page load leaves the focus where the browser puts it.
    if (shownPage.current !== page) {
      shownPage.current = page;
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [page]);

  // The sidebar keeps the current page's entry in view: on load, on every page change, and when
  // the narrow window's drawer opens. `nearest` leaves an entry already in view where it is, the
  // nav's scroll padding keeps it clear of the edge fades, and the jump is instant (the nav sets
  // no smooth scrolling), so nothing animates under reduced motion.
  useEffect(() => {
    const current = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (current === null || current === undefined || current.offsetParent === null) return;
    current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [page, menuOpen]);

  const verbs: readonly LegendVerb[] = useMemo(
    () => [
      { label: 'Find Page', chord: { key: 'k', meta: true }, run: () => setFinding(true) },
      {
        label: 'Previous Page',
        chord: { key: '[' },
        run: () => go(stepPage(route, -1)),
        pair: 'previousNextPage'
      },
      {
        label: 'Next Page',
        chord: { key: ']' },
        run: () => go(stepPage(route, 1)),
        pair: 'previousNextPage'
      }
    ],
    [route]
  );

  // The legend's chords. ⌘K works anywhere but under a modal (Control K off macOS); the
  // bracket keys only while no field or overlay holds the keys.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      const find = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);
      if (find && !event.altKey && !isModalOpen(document)) {
        event.preventDefault();
        setFinding(true);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // Escape closes the open drawer, as a press beside it does.
      if (event.key === 'Escape' && menuOpen && !isOverlayOpen(document)) {
        setMenuOpen(false);
        return;
      }
      if (isTextEditingTarget(event.target) || isOverlayOpen(document)) return;
      if (event.key === '[') go(stepPage(route, -1));
      if (event.key === ']') go(stepPage(route, 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [route, menuOpen]);

  const themeIds = theme.appearance === 'light' ? LIGHT_THEME_IDS : DARK_THEME_IDS;
  const commands = useMemo(
    () =>
      PAGES.map((candidate) => ({
        id: candidate.route,
        label: candidate.name,
        hint: candidate.group,
        meta: candidate.route,
        run: () => go(candidate.route)
      })),
    []
  );
  const groups = ['Guides', 'Components'] as const;

  return (
    <SiteThemeContext value={theme}>
      <UiokProvider>
        <div className="shell" data-menu={menuOpen ? 'open' : 'closed'}>
          {/* The hash is the route, so the skip link moves the focus itself rather than linking. */}
          <a
            className="skip-link"
            href="#main"
            onClick={(event) => {
              event.preventDefault();
              mainRef.current?.focus();
            }}
          >
            Skip to content
          </a>
          <header className="site-header">
            <IconButton
              aria-expanded={menuOpen}
              aria-label="Pages"
              className="menu-toggle"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Menu size={ICON_LG} />
            </IconButton>
            <a className="brand" href="#/">
              <span className="brand-mark" aria-hidden="true">
                ▚
              </span>
              <span className="brand-name">UIOK</span>
            </a>
            <button
              aria-label="Find a page"
              className="find-button keycap"
              onClick={() => setFinding(true)}
              type="button"
              {...tooltip('Find a page')}
            >
              <Search aria-hidden="true" size={ICON_MD} />
              <span className="find-words">Find a page</span>
              <KeyChord chord={{ key: 'k', meta: true }} />
            </button>
            <div className="theme-switcher">
              <span className="visually-hidden" id={appearanceLabel}>
                Appearance
              </span>
              <SegmentedChoice
                choices={APPEARANCES}
                labelId={appearanceLabel}
                onChange={(appearance) => theme.setChoice({ ...theme.choice, appearance })}
                render={(choice) => APPEARANCE_WORDS[choice]}
                value={theme.choice.appearance}
              />
              <select
                aria-label={`${theme.appearance === 'light' ? 'Light' : 'Dark'} theme`}
                className="field theme-select"
                onChange={(event) =>
                  theme.setChoice({ ...theme.choice, [theme.appearance]: event.target.value })
                }
                value={theme.worn}
              >
                {themeIds.map((id) => (
                  <option key={id} value={id}>
                    {themeName(id)}
                  </option>
                ))}
              </select>
            </div>
          </header>
          {/* In a narrow window the open drawer dims the page beside it; a press there closes it. */}
          <div aria-hidden="true" className="nav-scrim" onClick={() => setMenuOpen(false)} />
          <nav aria-label="Pages" className="site-nav scroll-fade" ref={navRef}>
            {groups.map((group) => (
              <section className="nav-group" key={group}>
                <h2 className="nav-heading overline">{group}</h2>
                <ul>
                  {PAGES.filter((candidate) => candidate.group === group).map((candidate) => (
                    <li key={candidate.route}>
                      <a
                        aria-current={candidate === page ? 'page' : undefined}
                        className="nav-link"
                        href={`#${candidate.route}`}
                      >
                        {candidate.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>
          <main className="site-main" id="main" ref={mainRef} tabIndex={-1}>
            {page === undefined ? null : <page.Page key={page.route} />}
          </main>
          <footer className="site-legend">
            <KeyLegendStrip pairLabel={pairLabel} verbs={verbs} />
          </footer>
        </div>
        {finding ? (
          <div className="listing-root">
            <CommandPalette
              commands={commands}
              label="Find a page"
              onClose={() => setFinding(false)}
              placeholder="Type a page name"
            />
          </div>
        ) : null}
        <TooltipLayer />
      </UiokProvider>
    </SiteThemeContext>
  );
}
