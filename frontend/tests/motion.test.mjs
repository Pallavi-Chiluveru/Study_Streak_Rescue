import test from 'node:test';
import assert from 'node:assert/strict';
import { shakeZoomImpact, warningShakeZoomImpact } from '../src/lib/motion.js';

test('signature impact stays within desktop and mobile movement bounds', () => {
  const desktop = shakeZoomImpact().animate;
  const mobile = shakeZoomImpact({ mobile: true }).animate;
  const warning = warningShakeZoomImpact().animate;
  assert.equal(Math.max(...desktop.x.map(Math.abs)), 2);
  assert.equal(Math.max(...desktop.scale), 1.025);
  assert.equal(Math.max(...mobile.x.map(Math.abs)), 1);
  assert.equal(Math.max(...mobile.scale), 1.015);
  assert.equal(Math.max(...warning.x.map(Math.abs)), 1.5);
  assert.equal(warning.transition.duration, 0.25);
});

test('reduced motion removes all horizontal shake', () => {
  assert.equal(shakeZoomImpact({ reducedMotion: true }).animate.x, 0);
  assert.equal(warningShakeZoomImpact({ reducedMotion: true }).animate.x, 0);
});