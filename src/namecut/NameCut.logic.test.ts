import { describe, expect, it } from 'vitest';

import { labelParts, middleCut, nameParts, partsText } from './NameCut.logic.js';

describe('middleCut', () => {
  it('keeps the extension and six characters before it as the tail', () => {
    expect(middleCut('2026-10-17 homepage hero, final v3 (approved by client).mov')).toEqual({
      head: '2026-10-17 homepage hero, final v3 (approved by c',
      tail: 'lient).mov'
    });
    expect(middleCut('Better.Call.Saul.S01E01.1080p.BluRay.CtrlHD.mkv').tail).toBe('CtrlHD.mkv');
  });

  it('keeps ten characters at least, a folder or a dot name included', () => {
    expect(middleCut('a-very-long-name-without-an-extension').tail).toBe('-extension');
    expect(middleCut('.zshrc-backup-of-last-year').tail).toBe('-last-year');
  });

  it('keeps twenty-four characters at most, so a long run after the last dot still gives way', () => {
    expect(middleCut('v1.2 final deck for the board meeting in October').tail).toBe(
      'board meeting in October'
    );
  });

  it('never cuts a short name, which fits whole', () => {
    expect(middleCut('Breaking Bad')).toEqual({ head: '', tail: 'Breaking Bad' });
    expect(middleCut('app.ts')).toEqual({ head: '', tail: 'app.ts' });
    expect(middleCut('Client Deliverables!')).toEqual({ head: '', tail: 'Client Deliverables!' });
  });
});

describe('labelParts', () => {
  it('cuts the first quoted name in its middle and leaves the rest to give way at its end', () => {
    expect(
      labelParts('Copying "Better.Call.Saul.S01E01.1080p.BluRay.CtrlHD.mkv" to "Seedbox"')
    ).toEqual([
      { kind: 'text', text: 'Copying "' },
      { kind: 'name', head: 'Better.Call.Saul.S01E01.1080p.BluRay.', tail: 'CtrlHD.mkv"' },
      { kind: 'text', text: ' to "Seedbox"' }
    ]);
  });

  it('keeps a closing quote with the name it ends, so the line ends on it', () => {
    expect(labelParts('Adding 2,310 items to "release-candidate-2026-10-28.zip"')).toEqual([
      { kind: 'text', text: 'Adding 2,310 items to "' },
      { kind: 'name', head: 'release-candidate-2026', tail: '-10-28.zip"' }
    ]);
  });

  it('reads a short name as words, so the words after it give way before it does', () => {
    expect(labelParts('Copying "Breaking Bad" to "Seedbox"')).toEqual([
      { kind: 'text', text: 'Copying "Breaking Bad" to "Seedbox"' }
    ]);
  });

  it('reads curly quotes too, and a line with no name as words', () => {
    expect(
      labelParts('“Better.Call.Saul.S01E01.1080p.BluRay.CtrlHD.mkv” already exists')[1]
    ).toEqual({ kind: 'name', head: 'Better.Call.Saul.S01E01.1080p.BluRay.', tail: 'CtrlHD.mkv”' });
    expect(labelParts('Compressing 3 items')).toEqual([
      { kind: 'text', text: 'Compressing 3 items' }
    ]);
  });

  it('reads the quotation marks of a translated line', () => {
    const name = 'Better.Call.Saul.S01E01.1080p.BluRay.CtrlHD.mkv';

    expect(labelParts(`„${name}“ nach „Seedbox“ kopieren`)).toEqual([
      { kind: 'text', text: '„' },
      { kind: 'name', head: 'Better.Call.Saul.S01E01.1080p.BluRay.', tail: 'CtrlHD.mkv“' },
      { kind: 'text', text: ' nach „Seedbox“ kopieren' }
    ]);
    expect(labelParts(`Copie de « ${name} »`)[1]).toEqual({
      kind: 'name',
      head: ' Better.Call.Saul.S01E01.1080p.BluRay.',
      tail: 'CtrlHD.mkv »'
    });
    expect(labelParts(`Kopiera ”${name}”`)[1]).toEqual({
      kind: 'name',
      head: 'Better.Call.Saul.S01E01.1080p.BluRay.',
      tail: 'CtrlHD.mkv”'
    });
  });

  it('reads the whole line back for assistive technology', () => {
    const line = 'Adding "a-very-long-name-without-an-extension" to "release.zip"';

    expect(partsText(labelParts(line))).toBe(line);
  });
});

describe('nameParts', () => {
  it('builds a line from words and names, leaving out empty words', () => {
    expect(nameParts(['', { name: 'notes.txt' }, ' already exists'])).toEqual([
      { kind: 'text', text: 'notes.txt already exists' }
    ]);
    expect(nameParts([{ name: 'a-very-long-name-without-an-extension' }, ''])).toEqual([
      { kind: 'name', head: 'a-very-long-name-without-an', tail: '-extension' }
    ]);
  });
});
