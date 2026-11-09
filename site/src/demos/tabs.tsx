/** A page tab strip and its smaller pill strip; Left and Right move between tabs, and a narrow window fades the edges that hide tabs. */

import { Bell, Database, FileText, Gauge, Search, Settings, Shield, Users } from 'lucide-react';
import { useState } from 'react';

import { PageTabs } from '@bigpixelrocket/uiok/tabs';

type Page = 'overview' | 'members' | 'settings' | 'alerts' | 'search';
type Setting = 'general' | 'security' | 'storage';

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
    </div>
  );
}
