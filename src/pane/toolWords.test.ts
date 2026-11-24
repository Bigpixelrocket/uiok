import { describe, expect, it } from 'vitest';

import { clearWordTips, giveWordTips } from './toolWords.js';

describe('the word step’s tooltips', () => {
  it('takes back the word it gave, and never a tooltip the host wrote since', () => {
    const root = document.createElement('div');
    root.innerHTML = `<button class="pane-act" data-word="Restart"></button>
      <button class="pane-act" data-word="Stop" data-tooltip="Stop the server"></button>`;
    const [given, own] = root.querySelectorAll<HTMLElement>('.pane-act');

    giveWordTips([given!, own!]);
    expect([given!.dataset.tooltip, own!.dataset.tooltip]).toEqual(['Restart', 'Stop the server']);
    clearWordTips(root);
    expect(given!.hasAttribute('data-tooltip')).toBe(false);

    // Folded again; the host then renames the tool and gives it a tip of its own.
    giveWordTips([given!]);
    given!.dataset.word = 'Run';
    given!.dataset.tooltip = 'Run the task now';
    clearWordTips(root);
    expect(given!.dataset.tooltip).toBe('Run the task now');
    expect(given!.hasAttribute('data-word-tip')).toBe(false);
    expect(own!.dataset.tooltip).toBe('Stop the server');

    // A tip in the very words the fit gave, written with its description
    // (`describedTooltip`), stays too.
    const same = document.createElement('button');
    same.dataset.word = 'Restart';
    root.append(same);
    giveWordTips([same]);
    same.setAttribute('aria-description', 'Restart');
    same.dataset.tooltip = 'Restart';
    clearWordTips(root);
    expect(same.dataset.tooltip).toBe('Restart');
  });
});
