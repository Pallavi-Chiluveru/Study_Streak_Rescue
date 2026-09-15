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
test('review output is keyed to the complete canonical planning profile', () => {
  assert.ok(source.includes('planningProfileFor'));
  assert.ok(source.includes('maximumDailyMinutes: Number(draft.maximumDailyMinutes)'));
  assert.ok(source.includes('preferredSessionMinutes: Number(draft.preferredSessionMinutes)'));
  assert.ok(source.includes('utilizationPreference: draft.utilizationPreference'));
  assert.ok(source.includes('analysisContextKey: contextKey'));
  assert.ok(source.includes('requestId !== analysisRequestIdRef.current'));
  assert.ok(source.includes('storedPreview?.analysisContextKey'));
});
test('review saves and previews the exact latest planning profile sequentially', () => {
  assert.ok(source.includes('const latestPlanningProfile = planningProfileFor(draft)'));
  const profileSave = source.indexOf('await API.patch("/goals/profile", latestPlanningProfile)');
  const previewRequest = source.indexOf('planningProfile: latestPlanningProfile');
  assert.ok(profileSave >= 0);
  assert.ok(previewRequest > profileSave);
});
test('planning preference changes invalidate stale review results', () => {
  assert.ok(source.includes('const updatePlanningPreference'));
  assert.ok(source.includes('setPreview(null)'));
  assert.ok(source.includes('updatePlanningPreference("maximumDailyMinutes", Number(e.target.value))'));
  assert.ok(source.includes('updatePlanningPreference("preferredSessionMinutes", Number(e.target.value))'));
  assert.ok(source.includes('updatePlanningPreference("preferredStudyPeriod", e.target.value)'));
  assert.ok(source.includes('updatePlanningPreference("utilizationPreference", e.target.value)'));
  assert.ok(source.includes('updatePlanningPreference("availability", availability)'));
});test('removed persisted goals are reconciled before recalculation', () => {
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
test('review explains requested and adjusted allocations with actionable validation', () => {
  assert.ok(source.includes('Requested:'));
  assert.ok(source.includes('strategy.adjusted ? "Adjusted" : "Allocated"'));
  assert.ok(source.includes('/week'));
  assert.ok(source.includes('Possible duplicate goals'));
  assert.ok(source.includes('What works'));
  assert.ok(source.includes('What needs adjustment'));
  assert.ok(source.includes('strategy.priority'));
  assert.ok(source.includes('strategy.horizon'));
});
test('review renders authoritative final states without contradictory banners', () => {
  assert.ok(source.includes('["FEASIBLE","ADJUSTED_FEASIBLE"].includes(preview?.status)'));
  assert.ok(source.includes('preview?.wasAdjusted && preview?.status !== "NOT_FEASIBLE"'));
  assert.ok(source.includes('Adjusted Plan &mdash; Feasible'));
  assert.ok(source.includes('Even after adjusting flexible goals'));
  assert.ok(source.includes('["NEEDS_REVIEW","ADJUSTED_FEASIBLE"].includes(preview.status)'));
  assert.ok(!source.includes('meaningful minimum plan for every active goal'));
});
test('review keeps deferred-goal labels and explicit recheck behavior', () => {
  assert.ok(source.includes('Deferred this week'));
  assert.ok(source.includes('Plan needs recalculation'));
  assert.ok(source.includes('Recheck Feasibility'));
  assert.ok(source.includes('Your inputs changed. Recheck feasibility before building.'));
});