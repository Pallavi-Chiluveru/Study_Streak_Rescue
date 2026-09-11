const pad = (value) => String(value).padStart(2, '0');

export const normalizeDate = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnly) {
      return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const getDateKey = (value) => {
  const date = normalizeDate(value);
  return date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : 'unscheduled';
};

export const getRelativeDateLabel = (value, reference = new Date()) => {
  const date = normalizeDate(value);
  const today = normalizeDate(reference);
  if (!date || !today) return 'UNSCHEDULED';

  const dayDifference = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (dayDifference === 0) return 'TODAY';
  if (dayDifference === 1) return 'TOMORROW';
  return date < today ? 'MISSED' : date.toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase();
};

export const formatScheduleDate = (value) => {
  const date = normalizeDate(value);
  return date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase() : 'UNSCHEDULED';
};

export const groupTasksByScheduledDate = (tasks = []) => {
  const groups = new Map();
  tasks.forEach((task, index) => {
    const key = getDateKey(task.scheduledDate);
    if (!groups.has(key)) groups.set(key, { key, date: task.scheduledDate, tasks: [] });
    groups.get(key).tasks.push({ task, index });
  });

  return [...groups.values()]
    .sort((first, second) => first.key.localeCompare(second.key))
    .map((group) => ({
      ...group,
      tasks: group.tasks
        .sort((first, second) => first.index - second.index)
        .map(({ task }) => task)
    }));
};