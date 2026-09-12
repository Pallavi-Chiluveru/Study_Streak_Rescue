export const getEffectiveEstimatedMinutes = task => {
  for (const value of [task?.adaptiveEstimatedMinutes, task?.baseEstimatedMinutes, task?.estimatedMinutes]) {
    if (Number.isFinite(Number(value)) && Number(value) > 0) return Number(value);
  }
  return 45;
};
