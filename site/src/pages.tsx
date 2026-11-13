/**
 * Every page of the site, in sidebar order. Guides are listed by hand; there
 * is one component page per `docs/components/<area>.md`, found and rendered
 * at build time, with the live demo `demos/index.ts` registers for its area.
 * A new area's doc becomes a page on its own; its demo is one module and one
 * line there.
 */

import type { ComponentType } from 'react';

import type { RenderedDoc } from '../render-docs';
import { DEMOS } from './demos';
import { KeyboardDemo } from './demos/keyboard';
import { LabelsDemo } from './demos/labels';
import { ThemingDemo } from './demos/theming';
import { TokensDemo } from './demos/tokens';
import { DocPage } from './DocPage';
import { Home } from './Home';
import keyboardDoc from '../../docs/components/keyboard.md?doc';
import labelsDoc from '../../docs/labels.md?doc';
import themesDoc from '../../docs/themes.md?doc';
import tokensDoc from '../../docs/tokens.md?doc';

/** A page the sidebar lists and the router opens. */
export interface SitePage {
  /** The hash route, from `/`. */
  readonly route: string;
  /** The page's own title, as its first heading reads; the window title uses it. */
  readonly title: string;
  /** The short name the sidebar and Find a page list it by. */
  readonly name: string;
  readonly group: 'Guides' | 'Components';
  readonly Page: ComponentType;
}

/** Component docs by area name, rendered at build time. */
const COMPONENT_DOCS = Object.fromEntries(
  Object.entries(
    import.meta.glob<RenderedDoc>('../../docs/components/*.md', {
      query: '?doc',
      import: 'default',
      eager: true
    })
  ).map(([path, doc]) => [/([a-z][a-z-]*)\.md$/.exec(path)?.[1] ?? path, doc])
);

/**
 * The sidebar's name for an area whose doc title is not already one plain,
 * short entry: a sentence, or a component's export name (`DataGrid`). Every
 * entry reads as words ("Data grid"), so the list follows one naming rule;
 * the page keeps its full title.
 */
const AREA_NAMES: Readonly<Record<string, string>> = {
  activity: 'Activity bar',
  clock: 'Clock',
  datetime: 'Date-time picker',
  filter: 'Filter',
  grid: 'Data grid',
  icon: 'Icons',
  keychord: 'Key chord',
  namecut: 'Name cut',
  segmented: 'Segmented choice',
  selectall: 'Select-all bar',
  shell: 'Shell',
  store: 'Store',
  surface: 'Surfaces',
  tabs: 'Page tabs'
};

/** Areas a guide already covers, so they get no second page. */
const GUIDE_AREAS = new Set(['keyboard']);

const docPage = (doc: RenderedDoc, Demo?: ComponentType): ComponentType =>
  function Page() {
    return <DocPage Demo={Demo} doc={doc} />;
  };

const guides: readonly SitePage[] = [
  { route: '/', title: 'Home', name: 'Home', group: 'Guides', Page: Home },
  {
    route: '/theming',
    title: 'Theming',
    name: 'Theming',
    group: 'Guides',
    Page: docPage(themesDoc, ThemingDemo)
  },
  {
    route: '/tokens',
    title: 'Scale tokens',
    name: 'Scale tokens',
    group: 'Guides',
    Page: docPage(tokensDoc, TokensDemo)
  },
  {
    route: '/labels',
    title: 'Labels',
    name: 'Labels',
    group: 'Guides',
    Page: docPage(labelsDoc, LabelsDemo)
  },
  {
    route: '/keyboard',
    title: 'Keyboard',
    name: 'Keyboard',
    group: 'Guides',
    Page: docPage(keyboardDoc, KeyboardDemo)
  }
];

const components: readonly SitePage[] = Object.entries(COMPONENT_DOCS)
  .filter(([area]) => !GUIDE_AREAS.has(area))
  .map(([area, doc]) => ({
    route: `/components/${area}`,
    title: doc.title,
    name: AREA_NAMES[area] ?? doc.title,
    group: 'Components' as const,
    Page: docPage(doc, DEMOS[area])
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** Every page, in sidebar order. */
export const PAGES: readonly SitePage[] = [...guides, ...components];
