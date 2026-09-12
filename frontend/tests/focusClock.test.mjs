import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elapsedFocusMs, pauseFocusClock, resumeFocusClock } from '../src/utils/focusClock.js';
test('20 active + 20 paused + 20 active records 40 minutes and supports overtime', () => {
  let clock = { accumulated: 0, since: 0 };
  clock = pauseFocusClock(clock, 20 * 60000);
  assert.equal(elapsedFocusMs(clock, 40 * 60000), 20 * 60000);
  clock = resumeFocusClock(clock, 40 * 60000);
  assert.equal(elapsedFocusMs(clock, 60 * 60000), 40 * 60000);
  assert.equal(elapsedFocusMs(clock, 90 * 60000), 70 * 60000);
});
