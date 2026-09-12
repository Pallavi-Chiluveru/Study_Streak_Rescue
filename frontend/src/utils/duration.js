export const normalizeMinutes = value => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1440, Math.round(number))) : 0;
};
export const splitDuration = totalMinutes => {
  const total = normalizeMinutes(totalMinutes);
  return { hours: Math.floor(total / 60), minutes: total % 60 };
};
export const combineDuration = (hours, minutes) => {
  const safeHours = Math.max(0, Math.min(24, Number(hours) || 0));
  const safeMinutes = Math.max(0, Math.min(59, Number(minutes) || 0));
  return normalizeMinutes((safeHours * 60) + safeMinutes);
};
export const formatDuration = totalMinutes => {
  const { hours, minutes } = splitDuration(totalMinutes);
  if (!hours) return minutes + 'm';
  if (!minutes) return hours + 'h';
  return hours + 'h ' + minutes + 'm';
};
export const pluralize = (count, singular, plural = singular + 's') => count + ' ' + (Number(count) === 1 ? singular : plural);

