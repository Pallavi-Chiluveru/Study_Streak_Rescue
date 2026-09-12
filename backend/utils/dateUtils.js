/**
 * Calendar-day helpers. Scheduled dates are stored at UTC noon so JSON
 * serialization preserves the selected YYYY-MM-DD in every practical timezone.
 */
const dateKeyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad = value => String(value).padStart(2, '0');

const parseDateKey = value => {
  if (typeof value === 'string') {
    const match = value.slice(0, 10).match(dateKeyPattern);
    if (match) {
      const year=Number(match[1]), month=Number(match[2]), day=Number(match[3]);
      const probe=new Date(Date.UTC(year,month-1,day,12));
      if (probe.getUTCFullYear()===year && probe.getUTCMonth()===month-1 && probe.getUTCDate()===day) return `${match[1]}-${match[2]}-${match[3]}`;
      return null;
    }
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Canonical UTC-noon values and legacy local-midnight values both retain
    // their intended day through local calendar components.
    return `${value.getFullYear()}-${pad(value.getMonth()+1)}-${pad(value.getDate())}`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : `${parsed.getFullYear()}-${pad(parsed.getMonth()+1)}-${pad(parsed.getDate())}`;
};

const dateFromKey = key => {
  const match=String(key||'').match(dateKeyPattern);
  if(!match) return new Date(NaN);
  return new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]),12));
};
const parseDateOnly = value => dateFromKey(parseDateKey(value));
const getStartOfDay = (value = new Date()) => parseDateOnly(value);
const getEndOfDay = (value = new Date()) => {
  const date=getStartOfDay(value);
  date.setUTCHours(23,59,59,999);
  return date;
};
const formatDateKey = value => parseDateKey(value);
const formatDateString = value => formatDateKey(value);
const compareDateKeys = (first,second) => {
  const a=formatDateKey(first), b=formatDateKey(second);
  if(!a||!b) throw new Error('Invalid calendar date.');
  return a.localeCompare(b);
};
const compareDateOnly = compareDateKeys;
const isBeforeDateKey = (first,second) => compareDateKeys(first,second)<0;
const isAfterDateKey = (first,second) => compareDateKeys(first,second)>0;
const isBeforeDate = isBeforeDateKey;
const isAfterDate = isAfterDateKey;
const addDaysToDateKey = (value,amount) => {
  const date=getStartOfDay(value);
  date.setUTCDate(date.getUTCDate()+Number(amount));
  return formatDateKey(date);
};
const addCalendarDays = (value,amount) => dateFromKey(addDaysToDateKey(value,amount));
const getAvailableDays = (startDate,deadlineDate) => {
  const start=getStartOfDay(startDate), end=getStartOfDay(deadlineDate);
  return Math.max(1,Math.round((end-start)/86400000)+1);
};
const getDateRange = (startDate,deadlineDate) => {
  const start=formatDateKey(startDate), end=formatDateKey(deadlineDate);
  if(!start||!end||start>end) return [];
  const result=[];
  for(let key=start;key<=end;key=addDaysToDateKey(key,1)) result.push(dateFromKey(key));
  return result;
};
const isBeforeToday = (value,reference=new Date()) => formatDateKey(value)<formatDateKey(reference);
const assertDateWithinRange = (scheduledDate,startDate,deadline) => {
  if(isBeforeDateKey(scheduledDate,startDate)) throw new Error('Scheduling invariant violation: task scheduled before plan start date.');
  if(isAfterDateKey(scheduledDate,deadline)) throw new Error('Scheduling invariant violation: task scheduled after plan deadline.');
  return getStartOfDay(scheduledDate);
};

module.exports={parseDateKey,dateFromKey,parseDateOnly,getStartOfDay,getEndOfDay,getAvailableDays,getDateRange,formatDateKey,formatDateString,isBeforeToday,addDaysToDateKey,addCalendarDays,compareDateKeys,compareDateOnly,isBeforeDateKey,isAfterDateKey,isBeforeDate,isAfterDate,assertDateWithinRange};