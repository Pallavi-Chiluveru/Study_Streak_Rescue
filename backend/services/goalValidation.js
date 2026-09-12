const { getStartOfDay, formatDateString } = require('../utils/dateUtils');
const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
const text = (value, max, name, required = false) => {
 if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) fail(`Enter a valid ${name}.`);
 return value.trim();
};
const number = (v, min, max, name) => { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) fail(`Invalid ${name}.`); return v; };
const choice = (v, values, name) => { if (!values.includes(v)) fail(`Invalid ${name}.`); return v; };
const date = (v, name) => {
 if (!v) return null;
 if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || formatDateString(getStartOfDay(v)) !== v) fail(`Invalid ${name}.`);
 return getStartOfDay(v);
};
const weekdays = v => { if (!Array.isArray(v) || v.length > 7 || v.some(n => !Number.isInteger(n) || n < 0 || n > 6)) fail('Choose valid weekdays.'); return [...new Set(v)]; };
const validateGoal = (body, previous = {}) => {
 const result = { ...previous };
 for (const [key, max] of Object.entries({ title: 160, category: 80, description: 2000, motivation: 1000, mainOutcome: 1000, notes: 2000, currentLevel: 200 }))
  if (body[key] !== undefined) result[key] = text(body[key], max, key, ['title', 'category'].includes(key));
 if (!result.title || !result.category) fail('Goal title and category are required.');
 for (const [key, allowed] of Object.entries({ horizon: ['short','medium','long'], priority: ['high','medium','low'], importance: ['essential','important','flexible'] }))
  if (body[key] !== undefined) result[key] = choice(body[key], allowed, key);
 for (const [key, max] of Object.entries({ minimumWeeklyMinutes: 5040, weeklyMinutes: 5040, totalEstimatedMinutes: 100000, currentProgress: 100 }))
  if (body[key] !== undefined) result[key] = key === 'totalEstimatedMinutes' && body[key] === null ? null : number(body[key], key === 'weeklyMinutes' ? 5 : 0, max, key);
 for (const key of ['startDate','deadline']) if (body[key] !== undefined) result[key] = date(body[key],key);
 if (result.deadline && result.startDate && result.deadline < result.startDate) fail('Deadline must be on or after the start date.');
 if (body.cadence !== undefined) {
  const c = body.cadence;
  if (!c || typeof c !== 'object') fail('Invalid cadence.');
  result.cadence = { type: choice(c.type, ['ai_recommended','daily','weekdays','alternate_days','times_per_week','weekends','specific_days','flexible'], 'cadence'), timesPerWeek: number(c.timesPerWeek ?? 3,1,7,'sessions per week'), daysOfWeek: weekdays(c.daysOfWeek || []) };
  if (!Number.isInteger(result.cadence.timesPerWeek)) fail('Sessions per week must be a whole number.');
  if (c.type === 'specific_days' && !result.cadence.daysOfWeek.length) fail('Choose at least one day.');
 }
 if (body.milestones !== undefined) {
  if (!Array.isArray(body.milestones) || body.milestones.length > 12) fail('Use up to twelve milestones.');
  result.milestones = body.milestones.map(m => {
   const targetDate = date(m.targetDate, 'milestone date');
   if (targetDate && ((result.startDate && targetDate < result.startDate) || (result.deadline && targetDate > result.deadline))) fail('Milestone dates must fit the goal timeline.');
   return { title: text(m.title,160,'milestone',true), targetDate, estimatedWork: number(m.estimatedWork || 0,0,100000,'milestone work'), status: choice(m.status || 'pending',['pending','completed'],'milestone status') };
  });
 }
 for (const m of result.milestones || []) if (m.targetDate && ((result.startDate && m.targetDate < result.startDate) || (result.deadline && m.targetDate > result.deadline))) fail('Update milestone dates to fit the new goal timeline.');
 return result;
};
const validateProfile = (body, previous = {}) => {
 const p = { ...previous };
 if (body.rawDirectionText !== undefined) {
  if (typeof body.rawDirectionText !== 'string' || body.rawDirectionText.length > 6000) fail('Enter a valid direction.');
  p.rawDirectionText = body.rawDirectionText;
 }
 if (body.mainAim !== undefined) p.mainAim = text(body.mainAim,2000,'main aim');
 if (body.weeklyAvailability !== undefined) {
  if (!Array.isArray(body.weeklyAvailability) || body.weeklyAvailability.length !== 7) fail('Enter availability for all seven days, Monday first.');
  p.weeklyAvailability = body.weeklyAvailability.map(v => number(v,0,1440,'daily availability'));
 }
 for (const [key,min,max] of [['maximumDailyMinutes',15,720],['preferredSessionMinutes',15,90]]) if (body[key] !== undefined) p[key] = number(body[key],min,max,key);
 if (body.restDays !== undefined) p.restDays = weekdays(body.restDays);
 if (body.utilizationPreference !== undefined) p.utilizationPreference = choice(body.utilizationPreference,['light','balanced','maximum'],'buffer preference');
 if (body.preferredStudyPeriod !== undefined) p.preferredStudyPeriod = choice(body.preferredStudyPeriod,['morning','afternoon','evening','late_evening','none'],'study period');
 if (body.fixedBlocks !== undefined) {
  if (!Array.isArray(body.fixedBlocks) || body.fixedBlocks.length > 20) fail('Use up to twenty fixed blocks.');
  p.fixedBlocks = body.fixedBlocks.map(b => {
   const startMinute = number(b.startMinute,0,1439,'block start'), endMinute = number(b.endMinute,1,1440,'block end');
   if (endMinute <= startMinute) fail('Fixed blocks must end after they start.');
   return { daysOfWeek: weekdays(b.daysOfWeek), startMinute, endMinute, label: text(b.label || '',80,'block label') };
  });
 }
 return p;
};
module.exports = { validateGoal, validateProfile, date, fail };
