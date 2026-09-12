const User = require('../models/User');
const config = Object.freeze({ minSamples: 3, alpha: 0.25, minRatio: 0.4, maxRatio: 2.5, minMultiplier: 0.7, maxMultiplier: 1.75 });
const positive = value => Number.isFinite(Number(value)) && Number(value) > 0;
const baseEstimate = task => positive(task.baseEstimatedMinutes) ? Number(task.baseEstimatedMinutes) : positive(task.estimatedMinutes) ? Number(task.estimatedMinutes) : 45;
const getEffectiveEstimatedMinutes = task => positive(task.adaptiveEstimatedMinutes) ? Number(task.adaptiveEstimatedMinutes) : baseEstimate(task);
const roundToFiveMinutes = value => Math.max(5, Math.round(value / 5) * 5);
const clamp = value => Math.max(config.minMultiplier, Math.min(value, config.maxMultiplier));
const getPaceProfile = user => {
  const pace = user?.learningPace || {};
  const sampleCount = pace.sampleCount || 0;
  const enabled = user?.preferences?.adaptiveTimeEstimation !== false;
  const globalMultiplier = sampleCount >= config.minSamples ? clamp(pace.globalMultiplier || 1) : 1;
  return { enabled, globalMultiplier, sampleCount, active: enabled && sampleCount >= config.minSamples,
    averageEstimateAccuracy: Math.round(pace.averageEstimateAccuracy ?? 100), minSamples: config.minSamples,
    estimatedMinutes: pace.estimatedMinutes || 0, actualMinutes: pace.actualMinutes || 0,
    paceAdjustmentPercent: Math.round((globalMultiplier - 1) * 100) };
};
const getAdaptiveEstimate = (user, baseMinutes) => {
  const profile = getPaceProfile(user);
  return profile.active ? roundToFiveMinutes(baseMinutes * profile.globalMultiplier) : baseMinutes;
};
const personalizeTask = (user, task) => {
  const original = task.toObject ? task.toObject() : task;
  if (original.status === 'completed') return original;
  const baseEstimatedMinutes = baseEstimate(original);
  return { ...original, baseEstimatedMinutes, estimatedMinutes: baseEstimatedMinutes,
    adaptiveEstimatedMinutes: getAdaptiveEstimate(user, baseEstimatedMinutes),
    estimationSource: getPaceProfile(user).active ? 'adaptive' : 'groq' };
};
const calculateEstimateAccuracy = (estimated, actual) => Math.max(0, 100 - Math.abs(actual - estimated) / estimated * 100);
const validSample = task => {
  const base = baseEstimate(task);
  const actual = task.actualFocusMinutes;
  return task.status === 'completed' && task.focusRecorded === true && positive(task.baseEstimatedMinutes ?? task.estimatedMinutes)
    && positive(actual) && actual / base >= config.minRatio && actual / base <= config.maxRatio;
};
// Called only by the winner of the atomic task-completion transition. Pipeline updates
// aggregate against the current user record, so simultaneous distinct tasks cannot lose samples.
const updateUserPace = async (userId, task) => {
  if (!validSample(task)) return getPaceProfile(await User.findById(userId));
  const base = baseEstimate(task), actual = task.actualFocusMinutes;
  const accuracy = calculateEstimateAccuracy(getEffectiveEstimatedMinutes(task), actual);
  const add = (field, value) => ({ $add: [{ $ifNull: ['$learningPace.' + field, 0] }, value] });
  const user = await User.findOneAndUpdate({ _id: userId }, [
    { $set: {
      'learningPace.sampleCount': add('sampleCount', 1),
      'learningPace.accuracyTotal': add('accuracyTotal', accuracy),
      'learningPace.estimatedMinutes': add('estimatedMinutes', base),
      'learningPace.actualMinutes': add('actualMinutes', actual),
      'learningPace.smoothedMultiplier': { $max: [config.minMultiplier, { $min: [config.maxMultiplier,
        { $add: [config.alpha * actual / base, { $multiply: [1 - config.alpha, { $ifNull: ['$learningPace.smoothedMultiplier', 1] }] }] }
      ] }] },
      'learningPace.lastUpdatedAt': new Date()
    } },
    { $set: {
      'learningPace.globalMultiplier': { $cond: [{ $gte: ['$learningPace.sampleCount', config.minSamples] }, '$learningPace.smoothedMultiplier', 1] },
      'learningPace.averageEstimateAccuracy': { $divide: ['$learningPace.accuracyTotal', '$learningPace.sampleCount'] }
    } }
  ], { returnDocument: 'after', updatePipeline: true });
  return getPaceProfile(user);
};
module.exports = { config, baseEstimate, getEffectiveEstimatedMinutes, roundToFiveMinutes, getPaceProfile, getAdaptiveEstimate, personalizeTask, calculateEstimateAccuracy, validSample, updateUserPace };
