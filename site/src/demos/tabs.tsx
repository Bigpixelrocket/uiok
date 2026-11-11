/**
 * A page tab strip and its smaller pill strip; Left and Right move between
 * tabs, and a narrow strip fades the edges that hide tabs. Under them, the
 * name-only and icon-only looks, a strip with no current tab (a home page
 * that is no tab), and a strip too narrow for its tabs.
 */

import { Bell, Database, FileText, Gauge, Search, Settings, Shield, Users } from 'lucide-react';
import { useState } from 'react';

import { PageTabs } from '@bigpixelrocket/uiok/tabs';

type Page = 'overview' | 'members' | 'settings' | 'alerts' | 'search';
type Setting = 'general' | 'security' | 'storage';

const PAGES = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'search', label: 'Search', icon: Search }
] as const;

/** The page tabs page's demo. */
export function TabsDemo() {
  const [page, setPage] = useState<Page>('settings');
  const [setting, setSetting] = useState<Setting>('general');
  return (
    <div className="demo-stack">
      <PageTabs
        current={page}
        label="Project pages"
        onSelect={setPage}
        tabs={[
          { id: 'overview', label: 'Overview', icon: FileText },
          { id: 'members', label: 'Members', icon: Users },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'alerts', label: 'Alerts', icon: Bell },
          { id: 'search', label: 'Search', icon: Search }
        ]}
      />
      {page === 'settings' ? (
        <PageTabs
          current={setting}
          label="Settings pages"
          onSelect={setSetting}
          pills
          tabs={[
            { id: 'general', label: 'General', icon: Gauge },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'storage', label: 'Storage', icon: Database }
          ]}
        />
      ) : null}
      <code className="demo-readout">
        page: {page}
        {page === 'settings' ? ` / ${setting}` : ''}
      </code>
      <h3 className="demo-subhead">Looks</h3>
      <PageTabs
        current={page}
        label="Project pages, names only"
        look="text"
        onSelect={setPage}
        tabs={PAGES}
      />
      <PageTabs
        current={page}
        label="Project pages, icons only"
        look="icons"
        onSelect={setPage}
        tabs={PAGES}
      />
      <PageTabs
        current={null}
        label="Project pages, none current"
        onSelect={setPage}
        tabs={PAGES}
      />
      <h3 className="demo-subhead">Too narrow for its tabs</h3>
      <div style={{ maxWidth: 280 }}>
        <PageTabs current={page} label="Project pages, narrow" onSelect={setPage} tabs={PAGES} />
      </div>
    </div>
  );
}
