const pad = (value) => String(value).padStart(2, '0');

export const parseDateOnly = (value) => {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
};

export const formatDateKey = (value) => {
  const date = parseDateOnly(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const addCalendarDays = (value, amount) => {
  const date = parseDateOnly(value);
  date.setDate(date.getDate() + amount);
  return date;
};

export const toLocalDateKey = (value) => {
  return value ? formatDateKey(value) : null;
};

export const normalizeDate = (value) => {
  const key = toLocalDateKey(value);
  if (!key) return null;
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const getDateKey = (value) => {
  return toLocalDateKey(value) || 'unscheduled';
};

export const getRelativeDateLabel = (value, reference = new Date()) => {
  const date = normalizeDate(value);
  const today = normalizeDate(reference);
  if (!date || !today) return 'UNSCHEDULED';

  const dayDifference = getDateKey(date) === getDateKey(today)
    ? 0
    : Math.round((date.getTime() - today.getTime()) / 86400000);
  if (dayDifference === 0) return 'TODAY';
  if (dayDifference === 1) return 'TOMORROW';
  return date < today ? 'MISSED' : date.toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase();
};

export const formatScheduleDate = (value) => {
  const date = normalizeDate(value);
  return date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase() : 'UNSCHEDULED';
};

export const isDateBeforeToday = (value, reference = new Date()) => {
  const dateKey = toLocalDateKey(value);
  const todayKey = toLocalDateKey(reference);
  return Boolean(dateKey && todayKey && dateKey < todayKey);
};

export const isTaskMissed = (task, reference = new Date()) => (
  task?.status === 'missed' || (task?.status !== 'completed' && isDateBeforeToday(task?.scheduledDate, reference))
);

export const groupTasksByScheduledDate = (tasks = []) => {
  const groups = new Map();
  tasks.forEach((task, index) => {
    const key = getDateKey(task.scheduledDate);
    if (!groups.has(key)) groups.set(key, { key, date: key, tasks: [] });
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