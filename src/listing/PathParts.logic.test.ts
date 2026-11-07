import { describe, expect, it } from 'vitest';

import { pathParts } from './PathParts.logic.js';

describe('pathParts', () => {
  it('splits a path into the folders that give way, the last folder, and the name', () => {
    expect(pathParts('/opt/homebrew/var/postgresql@17/postgresql.conf')).toEqual({
      head: '/opt/homebrew/var/',
      tail: 'postgresql@17/',
      base: 'postgresql.conf'
    });
    expect(pathParts('/opt/homebrew/var/mysql/')).toEqual({
      head: '/opt/homebrew/',
      tail: 'var/',
      base: 'mysql'
    });
    expect(pathParts('/etc')).toEqual({ head: '', tail: '/', base: 'etc' });
  });
});
