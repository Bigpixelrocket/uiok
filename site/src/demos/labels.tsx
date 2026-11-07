/**
 * The same components under the English defaults and under an override
 * passed to a nested `UiokProvider`, so the words that change are the
 * labels' and nothing else.
 */

import { useId, useMemo, useState } from 'react';

import { UiokProvider, type UiokLabelsOverride } from '@bigpixelrocket/uiok';
import { KeyChord } from '@bigpixelrocket/uiok/keychord';
import { Pager } from '@bigpixelrocket/uiok/pager';
import { SegmentedChoice } from '@bigpixelrocket/uiok/segmented';
import { SelectAllBar } from '@bigpixelrocket/uiok/selectall';
import { useLabels } from '@bigpixelrocket/uiok';
import { chordSpoken } from '@bigpixelrocket/uiok/keyboard';

const FRENCH: UiokLabelsOverride = {
  keys: {
    modifiers: { ctrl: 'Contrôle', alt: 'Option', shift: 'Maj', meta: 'Commande' },
    names: { Enter: 'Retour', Escape: 'Échap', ' ': 'Espace' },
    spaceCap: 'espace',
    escapeCap: 'échap'
  },
  pager: {
    begin: 'Début',
    previous: 'Précédent',
    next: 'Suivant',
    end: 'Fin',
    pages: () => 'Pages de lignes',
    page: () => 'Page de lignes',
    step: (step) =>
      ({
        begin: 'Première page',
        previous: 'Page précédente',
        next: 'Page suivante',
        end: 'Dernière page'
      })[step],
    pageOption: (page, pages) => `${page} sur ${pages}`
  },
  selectAll: {
    checkAll: 'Tout cocher',
    withSelected: 'Avec la sélection :',
    label: 'Avec la sélection'
  }
};

type Language = 'en' | 'fr';

/** Shows what the labels say inside whatever provider wraps it. */
function Sample() {
  const [page, setPage] = useState(2);
  const [checked, setChecked] = useState(3);
  const keys = useLabels().keys;
  const chord = { key: 'Enter', meta: true, shift: true };
  return (
    <div className="labels-sample">
      <div className="demo-row">
        <KeyChord chord={chord} />
        <span className="demo-readout">“{chordSpoken(chord, keys)}”</span>
        <KeyChord chord={{ key: ' ' }} />
        <KeyChord chord={{ key: 'Escape' }} />
      </div>
      <div className="demo-row">
        <Pager look="both" kind="rows" onPage={setPage} page={page} pages={12} />
      </div>
      <SelectAllBar checked={checked} onCheckAll={(on) => setChecked(on ? 8 : 0)} total={8}>
        <span className="demo-readout">{checked} of 8 checked</span>
      </SelectAllBar>
    </div>
  );
}

/** The labels page's demo. */
export function LabelsDemo() {
  const [language, setLanguage] = useState<Language>('fr');
  const labelId = useId();
  const labels = useMemo(() => (language === 'fr' ? FRENCH : {}), [language]);
  return (
    <div className="labels-demo">
      <div className="demo-row">
        <span className="demo-label" id={labelId}>
          Labels
        </span>
        <SegmentedChoice
          choices={['en', 'fr'] as const}
          labelId={labelId}
          onChange={setLanguage}
          render={(choice) => (choice === 'en' ? 'English (default)' : 'French override')}
          value={language}
        />
      </div>
      <UiokProvider labels={labels}>
        <Sample />
      </UiokProvider>
    </div>
  );
}
