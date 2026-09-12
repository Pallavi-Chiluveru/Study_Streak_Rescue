import test from 'node:test';
import assert from 'node:assert/strict';
import { combineDuration, formatDuration, normalizeMinutes, pluralize, splitDuration } from '../src/utils/duration.js';

test('availability durations convert between UI hours/minutes and canonical minutes', () => {
  assert.deepEqual(splitDuration(150), { hours: 2, minutes: 30 });
  assert.equal(combineDuration(1, 30), 90);
  assert.equal(combineDuration('', ''), 0);
  assert.equal(combineDuration(24, 59), 1440);
  assert.equal(normalizeMinutes(12000), 1440);
  assert.equal(formatDuration(30), '30m');
  assert.equal(formatDuration(60), '1h');
  assert.equal(formatDuration(135), '2h 15m');
  assert.equal(pluralize(1, 'task'), '1 task');
  assert.equal(pluralize(2, 'task'), '2 tasks');
});
