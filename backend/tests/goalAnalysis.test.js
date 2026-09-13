const test = require('node:test');
const assert = require('node:assert/strict');
const { parseJson, MODEL } = require('../services/groqService');
const { normalizeExtraction } = require('../services/goalAnalysisService');
const { validateGoal } = require('../services/goalValidation');

test('Groq default uses the supported replacement model and parses fenced or wrapped JSON', () => {
  assert.equal(MODEL, process.env.GROQ_MODEL || 'openai/gpt-oss-20b');
  assert.deepEqual(parseJson('```json\n{"goals":[]}\n```'), { goals: [] });
  assert.deepEqual(parseJson('Result:\n{"goals":[]}\nDone'), { goals: [] });
});

test('goal extraction normalizes the documented AI shape into editable goal drafts', () => {
  const result = normalizeExtraction({
    mainAim: 'Balance learning and career preparation',
    goals: [{
      title: 'Prepare for entrance exam', category: 'Competitive Exam', suggestedHorizon: 'long',
      suggestedPriority: 'high', outcome: 'Build exam readiness', deadline: null,
      missingInformation: ['exam date'], suggestedCadence: { type: 'ai_recommended' }
    }]
  }, 'original direction');
  assert.equal(result.provider, 'groq');
  assert.equal(result.goals[0].priority, 'high');
  assert.equal(result.goals[0].horizon, 'long');
  assert.equal(result.goals[0].description, 'Build exam readiness');
  assert.equal(result.goals[0].deadline, null);
  assert.equal(result.goals[0].cadence.type, 'ai_recommended');
  assert.ok(result.goals[0].missingInformation.includes('deadline'));
});
test('goal updates accept ISO dates previously serialized by the API', () => {
  const result = validateGoal({
    title: 'Prepare portfolio',
    category: 'Career / Resume',
    startDate: '2030-01-01T00:00:00.000Z',
    deadline: '2030-02-01T00:00:00.000Z',
    milestones: [{ title: 'First draft', targetDate: '2030-01-15T00:00:00.000Z', estimatedWork: 60, status: 'pending' }]
  });
  assert.equal(result.startDate.getFullYear(), 2030);
  assert.equal(result.deadline.getMonth(), 1);
  assert.equal(result.milestones[0].targetDate.getDate(), 15);
});