import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/pages/GoalOnboardingPage.jsx', import.meta.url), 'utf8');

test('direction step uses one canonical textarea value for AI extraction', () => {
  const directionStep = source.slice(source.indexOf('{step === 1'), source.indexOf('{step === 2'));
  assert.equal((directionStep.match(/<textarea/g) || []).length, 1);
  assert.ok(directionStep.includes('value={draft.rawDirectionText}'));
  assert.ok(source.includes('directionText: rawDirectionText'));
  assert.ok(!source.includes('naturalText'));
  assert.ok(!source.includes('everything on your plate'));
});
test('goals step keeps only core review fields and collapses advanced planning inputs', () => {
  const goalsStep = source.slice(source.indexOf('{step === 2'), source.indexOf('{step === 3'));
  assert.ok(goalsStep.includes('Review what AI understood'));
  assert.ok(source.includes('Where are you currently?'));
  assert.ok(source.includes('Advanced preferences'));
  assert.ok(!goalsStep.includes('Notes'));
  assert.ok(!goalsStep.includes('Importance'));
  assert.ok(!goalsStep.includes('Current progress (%)'));
  assert.ok(!goalsStep.includes('Estimated weekly minutes'));
});
test('review output is keyed to canonical planning inputs', () => {
  assert.ok(source.includes('planningContextKeyFor'));
  assert.ok(source.includes('analysisContextKey: contextKey'));
  assert.ok(source.includes('requestId !== analysisRequestIdRef.current'));
  assert.ok(source.includes('storedPreview?.analysisContextKey'));
});
test('removed persisted goals are reconciled before recalculation', () => {
  assert.ok(source.includes('removedGoalIds'));
  assert.ok(source.includes('removedGoalIds: []'));
});

test('Goal edit PATCH sends only editable fields', async () => {
  const goalsPage = await readFile(new URL('../src/pages/GoalsPage.jsx', import.meta.url), 'utf8');
  const payload = goalsPage.slice(goalsPage.indexOf('const body='), goalsPage.indexOf(';form._id?'));
  assert.ok(payload.includes('title:form.title'));
  assert.ok(!payload.includes('...form'));
  assert.ok(!payload.includes('milestones'));
});
test('review explains personalized allocations and surfaces planner validation', () => {
  assert.ok(source.includes('Why this allocation:'));
  assert.ok(source.includes('/week'));
  assert.ok(source.includes('Possible duplicate goals'));
  assert.ok(source.includes('Planning validation'));
  assert.ok(source.includes('s.priority'));
  assert.ok(source.includes('s.horizon'));
});
test('normal review presents automatic optimization instead of a red feasibility dead end', () => {
  assert.ok(source.includes('AI optimized your plan to fit your availability.'));
  assert.ok(source.includes('preview.optimization?.message'));
  assert.ok(source.includes('meaningful minimum plan for every active goal'));
  assert.ok(!source.includes('Return to adjust goals or availability'));
});