/**
 * Every page of the site, in sidebar order. Guides are listed by hand; there
 * is one component page per `docs/components/<area>.md`, found at build time,
 * with the live demo `demos/index.ts` registers for its area. A new area's
 * doc becomes a page on its own; its demo is one module and one line there.
 */

import type { ComponentType } from 'react';

import { DEMOS } from './demos';
import { KeyboardDemo } from './demos/keyboard';
import { LabelsDemo } from './demos/labels';
import { ThemingDemo } from './demos/theming';
import { DocPage } from './DocPage';
import { docTitle } from './markdown';
import { Home } from './Home';
import keyboardDoc from '../../docs/components/keyboard.md?raw';
import labelsDoc from '../../docs/labels.md?raw';
import themesDoc from '../../docs/themes.md?raw';

/** A page the sidebar lists and the router opens. */
export interface SitePage {
  /** The hash route, from `/`. */
  readonly route: string;
  /** The sidebar's name for it. */
  readonly title: string;
  readonly group: 'Guides' | 'Components';
  readonly Page: ComponentType;
}

/** Component docs by area name, as raw markdown. */
const COMPONENT_DOCS = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../docs/components/*.md', {
      query: '?raw',
      import: 'default',
      eager: true
    })
  ).map(([path, text]) => [/([a-z]+)\.md$/.exec(path)?.[1] ?? path, text])
);

/** Areas a guide already covers, so they get no second page. */
const GUIDE_AREAS = new Set(['keyboard']);

const docPage = (text: string, from: string, Demo?: ComponentType): ComponentType =>
  function Page() {
    return <DocPage Demo={Demo} from={from} text={text} />;
  };

const guides: readonly SitePage[] = [
  { route: '/', title: 'Home', group: 'Guides', Page: Home },
  {
    route: '/theming',
    title: 'Theming',
    group: 'Guides',
    Page: docPage(themesDoc, 'docs/themes.md', ThemingDemo)
  },
  {
    route: '/labels',
    title: 'Labels',
    group: 'Guides',
    Page: docPage(labelsDoc, 'docs/labels.md', LabelsDemo)
  },
  {
    route: '/keyboard',
    title: 'Keyboard',
    group: 'Guides',
    Page: docPage(keyboardDoc, 'docs/components/keyboard.md', KeyboardDemo)
  }
];

const components: readonly SitePage[] = Object.entries(COMPONENT_DOCS)
  .filter(([area]) => !GUIDE_AREAS.has(area))
  .map(([area, text]) => ({
    route: `/components/${area}`,
    title: docTitle(text, area),
    group: 'Components' as const,
    Page: docPage(text, `docs/components/${area}.md`, DEMOS[area])
  }))
  .sort((a, b) => a.title.localeCompare(b.title));

/** Every page, in sidebar order. */
export const PAGES: readonly SitePage[] = [...guides, ...components];
