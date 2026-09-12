import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
test('adaptive analytics, original fallback, personalized task and completed timing render accessibly', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { default: Card } = await server.ssrLoadModule('/src/components/AdaptivePaceCard.jsx');
    const { default: Task } = await server.ssrLoadModule('/src/components/tasks/TaskCard.jsx');
    const { default: Timer } = await server.ssrLoadModule('/src/components/tasks/FocusTimer.jsx');
    const render = (Component, props) => renderToString(React.createElement(Component, props));
    const pace = { sampleCount: 2, enabled: true, active: false, minSamples: 3 };
    assert.match(render(Card, { pace }), /Learning your study pace/);
    assert.match(render(Card, { pace }), /role="progressbar"/);
    assert.match(render(Card, { pace: { ...pace, sampleCount: 3, active: true, paceAdjustmentPercent: 18 } }), /18% additional study time/);
    assert.match(render(Card, { pace: { ...pace, enabled: false } }), /Personalization is off/);
    const task = { title: 'Practice', status: 'pending', scheduledDate: new Date(Date.now() + 86400000), estimatedMinutes: 45, adaptiveEstimatedMinutes: 55, estimationSource: 'adaptive' };
    const html = render(Task, { task });
    assert.match(html, /Personalized/); assert.match(html, /55/);
    const completed = render(Task, { task: { ...task, status: 'completed', actualFocusMinutes: 58 } });
    assert.match(completed, /Planned/); assert.match(completed, /Actual/); assert.match(completed, /58/);
    assert.doesNotMatch(completed, /Personalized/);
    const timer = render(Timer, { task, isOpen: true });
    assert.match(timer, /55:00/); assert.match(timer, /Complete Session/);
    const overtime = render(Timer, { task: { ...task, focusAccumulatedMs: 60 * 60000 }, isOpen: true });
    assert.match(overtime, /\+05:00/);
  } finally { await server.close(); }
});
