/**
 * The live demo of each component area, by the name of its doc
 * (`docs/components/<area>.md`). An area without an entry still gets its
 * page, with the doc alone.
 */

import type { ComponentType } from 'react';

import { ActivityDemo } from './activity';
import { ButtonDemo } from './button';
import { ChartsDemo } from './charts';
import { ClockDemo } from './clock';
import { DateTimeDemo } from './datetime';
import { DialogDemo } from './dialog';
import { FieldDemo } from './field';
import { FilterDemo } from './filter';
import { GridDemo } from './grid';
import { KeyChordDemo } from './keychord';
import { LegendDemo } from './legend';
import { ListingDemo } from './listing';
import { MenuDemo } from './menu';
import { NameCutDemo } from './namecut';
import { PagerDemo } from './pager';
import { PaletteDemo } from './palette';
import { PaneDemo } from './pane';
import { RunDemo } from './run';
import { SegmentedDemo } from './segmented';
import { SelectAllDemo } from './selectall';
import { StoreDemo } from './store';
import { SurfaceDemo } from './surface';
import { TabsDemo } from './tabs';
import { TerminalDemo } from './terminal';
import { TextDemo } from './text';
import { TooltipDemo } from './tooltip';

/** Demos by area. */
export const DEMOS: Readonly<Record<string, ComponentType>> = {
  activity: ActivityDemo,
  button: ButtonDemo,
  charts: ChartsDemo,
  clock: ClockDemo,
  datetime: DateTimeDemo,
  dialog: DialogDemo,
  field: FieldDemo,
  filter: FilterDemo,
  grid: GridDemo,
  keychord: KeyChordDemo,
  legend: LegendDemo,
  listing: ListingDemo,
  menu: MenuDemo,
  namecut: NameCutDemo,
  pager: PagerDemo,
  palette: PaletteDemo,
  pane: PaneDemo,
  run: RunDemo,
  segmented: SegmentedDemo,
  selectall: SelectAllDemo,
  store: StoreDemo,
  surface: SurfaceDemo,
  tabs: TabsDemo,
  terminal: TerminalDemo,
  text: TextDemo,
  tooltip: TooltipDemo
};
