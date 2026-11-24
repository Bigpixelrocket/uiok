/**
 * A pane hanging from its tabs (`PaneTabs`): a pinned tab, two tabs named
 * orders told apart by their context, a live one (lit while it takes
 * input), a dirty one, a following one in
 * italic, tabs on a production place in the danger tone, and enough tabs
 * to fold into the count at the strip's end. Drag a tab to reorder, ⌘- or
 * ⇧-click to pick, double-click to keep, middle-click or × to close, + or a
 * double-click on the empty end for a new tab. Drag the frame's corner to
 * narrow it and watch the tabs shrink, then fold.
 */

import { FileCode, Table2 } from 'lucide-react';
import { useState } from 'react';

import { ICON_SM } from '@bigpixelrocket/uiok/icon';
import {
  PanePathBar,
  PaneStatus,
  PaneTabs,
  pickedTabs,
  pickRun,
  togglePick,
  type PaneTabItem,
  type TabPicks
} from '@bigpixelrocket/uiok/pane';

const table = <Table2 size={ICON_SM} />;
const query = <FileCode size={ICON_SM} />;

const prod = (id: string, name: string, extra: Partial<PaneTabItem> = {}): PaneTabItem => ({
  id,
  name,
  mark: table,
  tone: 'danger',
  tip: `prod / shop / ${name}`,
  ...extra
});

const local = (id: string, name: string, extra: Partial<PaneTabItem> = {}): PaneTabItem => ({
  id,
  name,
  mark: table,
  tip: `local / warehouse / ${name}`,
  ...extra
});

const START: readonly PaneTabItem[] = [
  prod('shop', 'shop', { pinned: true, tip: 'prod / shop' }),
  local('analytics', 'analytics'),
  prod('orders', 'orders', { context: 'shop', dirty: true }),
  prod('archive', 'orders', { context: 'shop_archive', tip: 'prod / shop_archive / orders' }),
  // Live: its process takes input, so the tab is lit.
  prod('customers', 'customers', { live: 'Taking input' }),
  prod('payments', 'payment_attempts', { following: true }),
  local('events', 'events_by_campaign'),
  local('views', 'page_views_daily'),
  prod('revenue', 'revenue by country.sql', { mark: query }),
  local('sessions', 'sessions'),
  prod('refunds', 'refunds', { dirty: true }),
  prod('daily', 'v_daily_revenue'),
  local('warehouse', 'warehouse')
];

/** The live strip and the pane it hangs from. */
export function PaneTabsDemo({ say }: { readonly say: (what: string) => void }) {
  const [tabs, setTabs] = useState<readonly PaneTabItem[]>(START);
  const [front, setFront] = useState('customers');
  const [picks, setPicks] = useState<TabPicks | null>(null);
  const [made, setMade] = useState(0);
  const order = tabs.map((tab) => tab.id);
  const picked = pickedTabs(order, front, picks);
  const frontTab = tabs.find((tab) => tab.id === front);

  const select = (id: string) => {
    setFront(id);
    setPicks(null);
  };

  const close = (id: string) => {
    const at = order.indexOf(id);
    const rest = tabs.filter((tab) => tab.id !== id);
    if (rest.length === 0) return;
    if (id === front) select((rest[Math.min(at, rest.length - 1)] ?? rest[0])?.id ?? front);
    setTabs(rest);
    say(`closed ${tabs[at]?.name ?? id}`);
  };

  return (
    <div className="listing-root demo-tabs">
      <div className="pane active" data-tone={frontTab?.tone === 'danger' ? 'danger' : undefined}>
        <PaneTabs
          front={front}
          label="Tabs"
          onClose={close}
          onKeep={(id) => {
            setTabs((current) =>
              current.map((tab) => (tab.id === id ? { ...tab, following: false } : tab))
            );
            say(`kept ${id}`);
          }}
          onNew={() => {
            const id = `new-${made + 1}`;
            setMade(made + 1);
            setTabs((current) => {
              const at = current.findIndex((tab) => tab.id === front) + 1;
              return [
                ...current.slice(0, at),
                local(id, `query ${made + 1}.sql`, { mark: query }),
                ...current.slice(at)
              ];
            });
            select(id);
            say('opened a new tab');
          }}
          onPick={(id, how) => {
            setPicks(
              how === 'toggle' ? togglePick(order, front, picks, id) : pickRun(order, front, id)
            );
          }}
          onReorder={(next) => {
            setTabs(next.flatMap((id) => tabs.filter((tab) => tab.id === id)));
            say(`moved to ${next.join(', ')}`);
          }}
          onSelect={select}
          onTabContextMenu={(id, event) => {
            event.preventDefault();
            say(`asked for the menu of ${id}`);
          }}
          picked={picked.filter((id) => id !== front)}
          tabs={tabs}
        />
        <PanePathBar trail={(frontTab?.tip ?? frontTab?.name ?? '').split(' / ')} />
        <div className="pane-list" />
        <PaneStatus>
          {tabs.length} tabs, {picked.length} picked
        </PaneStatus>
      </div>
    </div>
  );
}
