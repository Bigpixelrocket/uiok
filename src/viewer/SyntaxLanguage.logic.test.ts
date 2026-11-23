import { describe, expect, it } from 'vitest';

import {
  HIGHLIGHT_MAX_FILE_BYTES,
  highlightPlan,
  highlightStatus,
  languageFor,
  languageFromShebang
} from './SyntaxLanguage.logic.js';
import { DEFAULT_VIEWER_LABELS as L } from '../labels/viewer.js';

describe('language detection', () => {
  it.each([
    ['index.php', 'php'],
    ['welcome.blade.php', 'blade'],
    ['App.TSX', 'tsx'],
    ['server.mjs', 'javascript'],
    ['schema.sql', 'sql'],
    ['README.md', 'markdown'],
    ['data.csv', 'csv'],
    ['config.yml', 'yaml'],
    ['Info.plist', 'xml'],
    ['main.rs', 'rust'],
    ['fix.patch', 'diff']
  ])('names %s by its extension', (name, language) => {
    expect(languageFor(name, '')).toBe(language);
  });

  it.each([
    ['Dockerfile', 'docker'],
    ['Dockerfile.dev', 'docker'],
    ['Containerfile', 'docker'],
    ['Makefile', 'make'],
    ['GNUmakefile', 'make'],
    ['.zshrc', 'shellscript'],
    ['.bash_profile', 'shellscript'],
    ['.env', 'dotenv'],
    ['.env.local', 'dotenv'],
    ['.htaccess', 'apache'],
    ['nginx.conf', 'nginx'],
    ['tsconfig.json', 'jsonc'],
    ['Brewfile', 'ruby']
  ])('names %s by its file name', (name, language) => {
    expect(languageFor(name, '')).toBe(language);
  });

  it.each([
    ['#!/bin/sh', 'shellscript'],
    ['#!/bin/bash -e', 'shellscript'],
    ['#!/usr/bin/env zsh', 'shellscript'],
    ['#!/usr/bin/env node', 'javascript'],
    ['#!/usr/bin/env -S deno run --allow-read', 'typescript'],
    ['#!/usr/bin/python3.12', 'python'],
    ['#!/usr/bin/env FOO=1 ruby', 'ruby'],
    ['#! /opt/homebrew/bin/php', 'php'],
    ['#!/usr/bin/make -f', 'make']
  ])('names a script by its %s line', (line, language) => {
    expect(languageFromShebang(line)).toBe(language);
    expect(languageFor('deploy', line)).toBe(language);
  });

  it('names nothing for an unknown name, interpreter, or plain first line', () => {
    expect(languageFor('notes.txt', '')).toBeNull();
    expect(languageFor('app.log', '#!/bin/sh')).toBe('shellscript');
    expect(languageFor('LICENSE', 'MIT License')).toBeNull();
    expect(languageFromShebang('#!/usr/bin/env awk')).toBeNull();
    expect(languageFromShebang('# not a shebang')).toBeNull();
  });

  it('prefers the extension to the interpreter line', () => {
    expect(languageFor('tool.py', '#!/bin/sh')).toBe('python');
  });
});

describe('the highlight plan', () => {
  it('highlights a known language up to the size limit, and says why past it', () => {
    expect(highlightPlan('index.php', 3000, '<?php', 'text')).toEqual({
      kind: 'highlight',
      language: 'php'
    });
    expect(highlightPlan('app.js', HIGHLIGHT_MAX_FILE_BYTES + 1, '', 'text')).toEqual({
      kind: 'too-large',
      language: 'javascript'
    });
    expect(highlightPlan('notes.txt', 10, '', 'text')).toEqual({ kind: 'none' });
  });

  it("highlights an SVG's source as XML, whatever the case of its extension", () => {
    for (const name of ['icon.svg', 'Logo.SVG']) {
      expect(languageFor(name, '<?xml version="1.0"?>'), name).toBe('xml');
      expect(highlightPlan(name, 2048, '<?xml version="1.0"?>', 'svg'), name).toEqual({
        kind: 'highlight',
        language: 'xml'
      });
    }
  });

  it('highlights a file detected as SVG as XML, whatever its name says', () => {
    for (const name of ['logo', 'logo.js', 'icon.svg.bak']) {
      expect(
        highlightPlan(name, 2048, '<svg xmlns="http://www.w3.org/2000/svg">', 'svg'),
        name
      ).toEqual({
        kind: 'highlight',
        language: 'xml'
      });
    }
    expect(highlightPlan('logo.js', HIGHLIGHT_MAX_FILE_BYTES + 1, '<svg>', 'svg')).toEqual({
      kind: 'too-large',
      language: 'xml'
    });
  });

  it('names the language in the status bar, with the reason text shows plain', () => {
    expect(highlightStatus('php', null, L)).toBe('PHP');
    expect(highlightStatus('javascript', 'too-large', L)).toBe(
      'JavaScript · Not highlighted, file over 16 MB'
    );
    expect(highlightStatus('json', 'long-lines', L)).toBe('JSON · Lines over 4 KB not highlighted');
    expect(highlightStatus('go', 'unavailable', L)).toBe('Go · Could not load highlighting');
  });
});
