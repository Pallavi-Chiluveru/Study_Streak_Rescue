const { capacityDays } = require('./availabilityService');
const { getAvailableDays, formatDateString } = require('../utils/dateUtils');
const { getEffectiveEstimatedMinutes } = require('./adaptiveEstimationService');

const PRIORITY = { high: 3, medium: 2, low: 1 };
const HORIZON = { short: 1.15, medium: 1, long: 0.9 };
const PROGRESS = value => value <= 10 ? 1.3 : value <= 30 ? 1.2 : value < 80 ? 1 : 0.7;
const COMPLEXITY = {
  intensive: 1.4,
  moderate: 1,
  light: 0.7
};
const intensiveCategories = /interview|competitive exam|coding|dsa|computer science|cs fundamentals|project/i;
const lightCategories = /language learning|career \/ resume/i;
const workTypesByCategory = {
  'Interview Preparation': ['DSA practice', 'CS fundamentals revision', 'project preparation', 'mock interviews', 'communication practice'],
  'Semester / Academics': ['subject revision', 'assignments', 'labs', 'exam preparation', 'previous-paper practice'],
  'Coding / DSA': ['concept review', 'guided problems', 'timed problem solving', 'solution review'],
  'Aptitude': ['concept drills', 'timed practice', 'error review'],
  'Competitive Exam': ['syllabus revision', 'question practice', 'mock tests', 'error analysis'],
  'Project': ['design', 'implementation', 'testing', 'documentation'],
  'Certification': ['course study', 'labs', 'practice questions', 'revision'],
  'Skill Development': ['guided learning', 'deliberate practice', 'review']
};

const inferComplexity = goal => {
  const text = `${goal.category || ''} ${goal.title || ''}`;
  if (intensiveCategories.test(text)) return 'intensive';
  if (lightCategories.test(text)) return 'light';
  return 'moderate';
};
const urgencyFor = (goal, start) => {
  if (!goal.deadline) return { factor: 1, label: 'no immediate deadline' };
  const days = Math.max(1, getAvailableDays(start, goal.deadline));
  if (days <= 7) return { factor: 3, label: `deadline in ${days} day${days === 1 ? '' : 's'}` };
  if (days <= 30) return { factor: 2, label: `deadline in ${days} days` };
  return { factor: 1, label: `deadline in ${days} days` };
};
const progressLabel = value => value <= 10 ? 'not started' : value <= 30 ? 'just started' : value < 80 ? 'in progress' : 'almost done';
const tokens = title => new Set(String(title || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
  .map(token => token.replace(/(ing|ed|es|s)$/,'')).filter(token => token.length > 2 && !['for','the','and','goal','prepare','preparation'].includes(token)));
const findSemanticDuplicates = goals => {
  const pairs = [];
  for (let i = 0; i < goals.length; i++) for (let j = i + 1; j < goals.length; j++) {
    const a=tokens(goals[i].title), b=tokens(goals[j].title), intersection=[...a].filter(token=>b.has(token)).length;
    const containment=intersection/Math.max(1,Math.min(a.size,b.size));
    const sameCategory=String(goals[i].category).toLowerCase()===String(goals[j].category).toLowerCase();
    if (containment >= 0.67 || (sameCategory && containment >= 0.5)) pairs.push({ goalIds:[String(goals[i]._id),String(goals[j]._id)], titles:[goals[i].title,goals[j].title], similarity:Number(containment.toFixed(2)), message:'These goals appear very similar. Would you like to merge them?' });
  }
  return pairs;
};
const manualSessionCount = (goal, legalDayCount) => {
  const type=goal.cadence?.type;
  if (type==='daily' || type==='weekdays' || type==='weekends' || type==='specific_days' || type==='alternate_days') return legalDayCount;
  if (type==='flexible') return 1;
  return Math.min(legalDayCount,Math.max(1,goal.cadence?.timesPerWeek || 3));
};
const explain = ({goal, complexity, urgency, progress, sessions}) => {
  const continuity = /interview|coding|dsa|language/i.test(`${goal.category} ${goal.title}`) ? ' recurring practice' : '';
  return `${goal.priority[0].toUpperCase()+goal.priority.slice(1)}-priority, ${goal.horizon || 'medium'}-term ${complexity}${continuity}; ${urgency.label}; ${progressLabel(progress)}. Planned as ${sessions} focused session${sessions===1?'':'s'}.`;
};
const planGoalAllocations = ({ goals, profile, start, end, legalDaysByGoal, protectedTasks=[] }) => {
  const days=capacityDays(profile,start,end), totalCapacity=days.reduce((sum,day)=>sum+day.capacity,0);
  const protectedMinutes=protectedTasks.filter(task=>{
    const key=formatDateString(task.scheduledDate);return key>=formatDateString(start)&&key<=formatDateString(end);
  }).reduce((sum,task)=>sum+getEffectiveEstimatedMinutes(task),0);
  const totalPlannableMinutes=Math.max(0,totalCapacity-protectedMinutes);
  const analyses=goals.map(goal=>{
    const complexity=inferComplexity(goal), urgency=urgencyFor(goal,start), progress=Number(goal.currentProgress)||0;
    const priorityWeight=PRIORITY[goal.priority] || 2, horizonWeight=HORIZON[goal.horizon] || 1, progressWeight=PROGRESS(progress), complexityWeight=COMPLEXITY[complexity];
    return {goal,complexity,urgency,progress,priorityWeight,horizonWeight,progressWeight,complexityWeight,weight:priorityWeight*urgency.factor*horizonWeight*progressWeight*complexityWeight};
  });
  const totalWeight=analyses.reduce((sum,item)=>sum+item.weight,0) || 1;
  const preferred=Math.max(15,Number(profile.preferredSessionMinutes)||45);
  const allocations=analyses.map(item=>{
    const {goal}=item, legalCount=(legalDaysByGoal.get(String(goal._id))||[]).length;
    const weightedMinutes=totalPlannableMinutes*item.weight/totalWeight;
    const minimum=Math.max(0,goal.minimumWeeklyMinutes||0);
    let sessions=goal.cadence?.type==='ai_recommended' ? Math.round(weightedMinutes/preferred) : manualSessionCount(goal,legalCount);
    sessions=Math.max(legalCount ? 1 : 0,Math.min(7,legalCount,sessions));
    let minutes=Math.max(minimum,Math.round(weightedMinutes/5)*5);
    if (sessions) minutes=Math.min(minutes,sessions*90);
    else minutes=0;
    return {...item,goalId:String(goal._id),title:goal.title,sessions,minutes,sessionMinutes:sessions?Math.max(5,Math.min(90,Math.round(minutes/sessions/5)*5)):0,
      workTypes:workTypesByCategory[goal.category] || workTypesByCategory['Skill Development']};
  });
  // Rounding must not consume the reserved buffer.
  let overflow=allocations.reduce((sum,item)=>sum+item.minutes,0)-totalPlannableMinutes;
  for(const item of [...allocations].sort((a,b)=>a.weight-b.weight)) if(overflow>0){const reducible=Math.max(0,item.minutes-Math.max(item.goal.minimumWeeklyMinutes||0,item.sessions*5));const reduction=Math.min(reducible,Math.ceil(overflow/5)*5);item.minutes-=reduction;overflow-=reduction;item.sessionMinutes=item.sessions?Math.max(5,Math.round(item.minutes/item.sessions/5)*5):0;}
  for(const item of allocations) item.reason=explain(item);
  return {allocations,totalCapacity,totalPlannableMinutes,protectedMinutes,totalWeight};
};
const validatePlanning = ({allocations,totalCapacity,totalPlannableMinutes,duplicates,result,profile}) => {
  const planned=allocations.reduce((sum,item)=>sum+item.minutes,0);
  const identicalWithoutReason=allocations.some((a,i)=>allocations.slice(i+1).some(b=>a.sessions===b.sessions&&a.minutes===b.minutes&&Math.abs(a.weight-b.weight)>0.01&&(a.goal.cadence?.type==='ai_recommended'||b.goal.cadence?.type==='ai_recommended')));
  const highMeaningful=allocations.filter(item=>item.goal.priority==='high').every(item=>item.minutes>0&&item.sessions>0);
  const weightAligned=allocations.every(a=>allocations.every(b=>a.weight<=b.weight||a.minutes>=b.minutes));
  const urgencyAligned=allocations.every(a=>allocations.every(b=>a.urgency.factor<=b.urgency.factor||a.priorityWeight!==b.priorityWeight||a.complexityWeight!==b.complexityWeight||a.minutes>=b.minutes));
  const dailySafe=(result?.days||[]).every(day=>day.used<=day.capacity&&day.used<=profile.maximumDailyMinutes);
  const checks=[
    {key:'unique_goals',passed:!duplicates.length,message:duplicates.length?'Merge or remove possible duplicate goals before scheduling.':'No semantic duplicate goals detected.'},
    {key:'personalized_allocations',passed:!identicalWithoutReason,message:identicalWithoutReason?'Different goal weights rounded to identical allocations; review frequency or capacity.':'Allocations reflect each goal weight.'},
    {key:'weight_alignment',passed:weightAligned,message:weightAligned?'Weekly time follows relative goal weights.':'A higher-weight goal received less time than a lower-weight goal.'},
    {key:'urgency_alignment',passed:urgencyAligned,message:urgencyAligned?'Deadline urgency is reflected in allocation.':'A more urgent comparable goal received less time.'},
    {key:'capacity',passed:planned<=totalPlannableMinutes&&(!result||result.plannedMinutes<=totalCapacity),message:'Planned time stays within usable weekly capacity.'},
    {key:'daily_limit',passed:dailySafe,message:'Daily planned time stays within the configured maximum.'},
    {key:'buffer',passed:planned<=totalPlannableMinutes,message:'Configured buffer remains reserved.'},
    {key:'high_priority',passed:highMeaningful,message:highMeaningful?'High-priority goals receive meaningful time.':'A high-priority goal has no meaningful allocation.'}
  ];
  return {passed:checks.every(check=>check.passed),checks};
};
module.exports={inferComplexity,urgencyFor,findSemanticDuplicates,planGoalAllocations,validatePlanning,workTypesByCategory};