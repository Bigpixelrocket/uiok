/**
 * Shared teardown for every suite: unmount what Testing Library rendered
 * after each test, so no suite sees another's DOM.
 */

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
