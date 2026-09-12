const { getDateRange, formatDateString, getStartOfDay } = require('../utils/dateUtils');
const utilization = { light: 0.75, balanced: 0.85, maximum: 1 };
const subtract = (spans, start, end) => spans.flatMap(([a,b]) => end <= a || start >= b ? [[a,b]] : [[a,Math.max(a,start)],[Math.min(b,end),b]].filter(([x,y]) => y > x));
const capacityDays = (profile, start, end, todayMinutes) => getDateRange(start,end).map(date => {
 const day = date.getDay(), index = (day + 6) % 7;
 let spans = [[360,1380]];
 for (const block of profile.fixedBlocks || []) if (block.daysOfWeek.includes(day)) spans = subtract(spans,block.startMinute,block.endMinute);
 const free = spans.reduce((sum,[a,b]) => sum+b-a,0);
 const isToday = formatDateString(date) === formatDateString(new Date());
 const available = (profile.restDays || []).includes(day) ? 0 : Math.min(profile.weeklyAvailability?.[index] ?? 0,profile.maximumDailyMinutes || 180,free,isToday && todayMinutes !== undefined ? todayMinutes : Infinity);
 return { date: getStartOfDay(date), key: formatDateString(date), available, capacity: Math.floor(available*(utilization[profile.utilizationPreference] || 0.85)), used: 0, spans, sessions: [] };
});
const takeSlot = (day, minutes, period = 'none') => {
 if (day.used + minutes > day.capacity) return null;
 const preferred = { morning: 480, afternoon: 780, evening: 1080, late_evening: 1200 }[period] ?? 360;
 const options = day.spans.flatMap(([a,b]) => [Math.max(a,preferred),a].filter(start => start+minutes <= b).map(start => ({ start, distance: Math.abs(start-preferred) })));
 options.sort((a,b) => a.distance-b.distance || a.start-b.start);
 if (!options.length) return null;
 const start = options[0].start;
 day.spans = subtract(day.spans,start,start+minutes); day.used += minutes;
 return { scheduledDate: day.date, scheduledStartMinute: start, scheduledEndMinute: start+minutes };
};
module.exports = { capacityDays, subtract, takeSlot };
