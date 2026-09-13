const { capacityDays } = require('./availabilityService');
const { getAvailableDays, formatDateString } = require('../utils/dateUtils');
const { getEffectiveEstimatedMinutes } = require('./adaptiveEstimationService');

const PRIORITY = { high: 3, medium: 2, low: 1 };
const HORIZON = { short: 1.15, medium: 1, long: 0.9 };
const PROGRESS = value => value <= 10 ? 1.3 : value <= 30 ? 1.2 : value < 80 ? 1 : 0.7;
const COMPLEXITY = { intensive: 1.4, moderate: 1, light: 0.7 };
const intensiveCategories = /interview|competitive exam|coding|dsa|computer science|cs fundamentals|project/i;
const lightCategories = /language learning|career \/ resume/i;
const continuousCategories = /interview|competitive exam|coding|dsa|language|aptitude/i;
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
  const value = `${goal.category || ''} ${goal.title || ''}`;
  if (intensiveCategories.test(value)) return 'intensive';
  if (lightCategories.test(value)) return 'light';
  return 'moderate';
};
const urgencyFor = (goal, start) => {
  if (!goal.deadline) return { factor: 1, days: null, label: 'no immediate deadline' };
  const days = Math.max(1, getAvailableDays(start, goal.deadline));
  if (days <= 7) return { factor: 3, days, label: `deadline in ${days} day${days === 1 ? '' : 's'}` };
  if (days <= 30) return { factor: 2, days, label: `deadline in ${days} days` };
  return { factor: 1, days, label: `deadline in ${days} days` };
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
  if (['daily','weekdays','weekends','specific_days','alternate_days'].includes(type)) return legalDayCount;
  if (type==='flexible') return 1;
  return Math.min(legalDayCount,Math.max(1,goal.cadence?.timesPerWeek || 3));
};
const desiredSessionCount = (goal, complexity, urgency, progress, continuity, legalCount) => {
  if (goal.cadence?.type !== 'ai_recommended') return manualSessionCount(goal,legalCount);
  let sessions=complexity==='intensive' ? 5 : complexity==='moderate' ? 3 : 2;
  if (urgency.factor===3) sessions+=2; else if (urgency.factor===2) sessions+=1;
  if (goal.priority==='high') sessions+=1; else if (goal.priority==='low') sessions-=1;
  if (goal.horizon==='short') sessions+=1;
  if (progress>=80) sessions-=1;
  if (continuity) sessions=Math.max(3,sessions);
  return Math.max(legalCount ? 1 : 0,Math.min(7,legalCount,sessions));
};
const minimumSessionCount = (goal, urgency, continuity, desired, legalCount) => {
  if (!legalCount) return 0;
  if (goal.cadence?.type !== 'ai_recommended') return desired;
  let minimum=goal.priority==='low' ? 1 : goal.priority==='high' ? 2 : 1;
  if (continuity) minimum=Math.max(minimum,3);
  if (urgency.factor===3) minimum=Math.max(minimum,3);
  return Math.min(legalCount,desired,minimum);
};
const explain = item => {
  const {goal,complexity,continuity,urgency,progress,sessions}=item;
  return `${goal.priority[0].toUpperCase()+goal.priority.slice(1)}-priority, ${goal.horizon || 'medium'}-term ${complexity}${continuity?' recurring practice':''}; ${urgency.label}; ${progressLabel(progress)}. Planned as ${sessions} focused session${sessions===1?'':'s'}.`;
};
const reductionOrder = (a,b) => a.protection-b.protection || a.weight-b.weight || a.goalId.localeCompare(b.goalId);
const planGoalAllocations = ({ goals, profile, start, end, legalDaysByGoal, protectedTasks=[] }) => {
  const days=capacityDays(profile,start,end), totalCapacity=days.reduce((sum,day)=>sum+day.capacity,0);
  const protectedMinutes=protectedTasks.filter(task=>{const key=formatDateString(task.scheduledDate);return key>=formatDateString(start)&&key<=formatDateString(end);}).reduce((sum,task)=>sum+getEffectiveEstimatedMinutes(task),0);
  const totalPlannableMinutes=Math.max(0,totalCapacity-protectedMinutes), preferred=Math.max(15,Math.min(90,Number(profile.preferredSessionMinutes)||45));
  const allocations=goals.map(goal=>{
    const goalId=String(goal._id), legalCount=(legalDaysByGoal.get(goalId)||[]).length, complexity=inferComplexity(goal), urgency=urgencyFor(goal,start), progress=Number(goal.currentProgress)||0;
    const priorityWeight=PRIORITY[goal.priority]||2, horizonWeight=HORIZON[goal.horizon]||1, progressWeight=PROGRESS(progress), complexityWeight=COMPLEXITY[complexity];
    const continuity=continuousCategories.test(`${goal.category||''} ${goal.title||''}`), weight=priorityWeight*urgency.factor*horizonWeight*progressWeight*complexityWeight;
    const sessions=desiredSessionCount(goal,complexity,urgency,progress,continuity,legalCount), minimumSessions=minimumSessionCount(goal,urgency,continuity,sessions,legalCount);
    const userCommitment=Math.max(0,goal.minimumWeeklyMinutes||0,goal.weeklyMinutes||0), desiredMinutes=Math.min(sessions*90,Math.max(sessions*preferred,userCommitment));
    const sessionMinutes=sessions ? Math.max(15,Math.min(90,Math.ceil(desiredMinutes/sessions/5)*5)) : 0;
    return {goal,goalId,title:goal.title,complexity,urgency,progress,continuity,priorityWeight,horizonWeight,progressWeight,complexityWeight,weight,
      sessions,minimumSessions,sessionMinutes,minutes:sessions*sessionMinutes,desiredSessions:sessions,desiredMinutes:sessions*sessionMinutes,
      protection:urgency.factor*100+priorityWeight*30+(continuity?15:0),workTypes:workTypesByCategory[goal.category]||workTypesByCategory['Skill Development']};
  });
  const originalDesiredMinutes=allocations.reduce((sum,item)=>sum+item.minutes,0), reductions=[];
  let total=originalDesiredMinutes;
  while(total>totalPlannableMinutes){
    const candidate=[...allocations].filter(item=>item.sessions>item.minimumSessions).sort(reductionOrder)[0];
    if(!candidate) break;
    candidate.sessions--;candidate.minutes=candidate.sessions*candidate.sessionMinutes;total-=candidate.sessionMinutes;
    reductions.push({goalId:candidate.goalId,title:candidate.title,type:'session',minutes:candidate.sessionMinutes});
  }
  while(total>totalPlannableMinutes){
    const candidate=[...allocations].filter(item=>item.sessions>0&&item.sessionMinutes>15).sort(reductionOrder)[0];
    if(!candidate) break;
    const decrement=Math.min(5,candidate.sessionMinutes-15);candidate.sessionMinutes-=decrement;candidate.minutes=candidate.sessions*candidate.sessionMinutes;total-=decrement*candidate.sessions;
    reductions.push({goalId:candidate.goalId,title:candidate.title,type:'duration',minutes:decrement*candidate.sessions});
  }
  for(const item of allocations){item.adjusted=item.sessions!==item.desiredSessions||item.minutes!==item.desiredMinutes;item.reason=explain(item);}
  const minimumFeasible=total<=totalPlannableMinutes;
  const reducedSessions=reductions.filter(change=>change.type==='session').length, reducedMinutes=originalDesiredMinutes-total;
  return {allocations,totalCapacity,totalPlannableMinutes,protectedMinutes,originalDesiredMinutes,plannedAllocationMinutes:total,minimumFeasible,reductions,
    optimizationMessage:reductions.length?`AI reduced ${reducedSessions} non-essential session${reducedSessions===1?'':'s'} and ${reducedMinutes} minutes from the initial recommendation so the plan fits.`:'The initial recommendation already fits your availability.'};
};
const validatePlanning = ({allocations,totalCapacity,totalPlannableMinutes,minimumFeasible,duplicates,result,profile}) => {
  const planned=allocations.reduce((sum,item)=>sum+item.minutes,0);
  const identicalWithoutReason=allocations.some((a,i)=>allocations.slice(i+1).some(b=>a.sessions===b.sessions&&a.minutes===b.minutes&&Math.abs(a.weight-b.weight)>0.01&&(a.goal.cadence?.type==='ai_recommended'||b.goal.cadence?.type==='ai_recommended')));
  const highMeaningful=allocations.filter(item=>item.goal.priority==='high').every(item=>item.sessions>=item.minimumSessions&&item.minutes>0);
  const weightAligned=allocations.every(a=>allocations.every(b=>a.weight<=b.weight||a.minutes>=b.minutes||a.minimumSessions>b.minimumSessions));
  const urgencyAligned=allocations.every(a=>allocations.every(b=>a.urgency.factor<=b.urgency.factor||a.priorityWeight!==b.priorityWeight||a.complexityWeight!==b.complexityWeight||a.minutes>=b.minutes));
  const dailySafe=(result?.days||[]).every(day=>day.used<=day.capacity&&day.used<=profile.maximumDailyMinutes);
  const allMinimums=(result?.tasks ? allocations.every(item=>result.tasks.filter(task=>String(task.goalId)===item.goalId).length>=item.minimumSessions) : true);
  const checks=[
    {key:'unique_goals',passed:!duplicates.length,message:duplicates.length?'Merge or remove possible duplicate goals before scheduling.':'No semantic duplicate goals detected.'},
    {key:'minimum_plan',passed:minimumFeasible&&allMinimums,message:minimumFeasible&&allMinimums?'Every active goal has a meaningful minimum allocation.':'The current constraints cannot accommodate a meaningful minimum plan for every active goal.'},
    {key:'personalized_allocations',passed:!identicalWithoutReason,message:identicalWithoutReason?'Different AI goal weights still produced identical allocations; review required.':'Allocations are independently personalized.'},
    {key:'weight_alignment',passed:weightAligned,message:weightAligned?'Weekly time follows goal protection and relative weights.':'A more important goal received less time without a minimum-plan reason.'},
    {key:'urgency_alignment',passed:urgencyAligned,message:urgencyAligned?'Deadline urgency is reflected in allocation.':'A more urgent comparable goal received less time.'},
    {key:'capacity',passed:planned<=totalPlannableMinutes&&(!result||result.plannedMinutes<=totalCapacity),message:'Planned time stays within usable weekly capacity.'},
    {key:'daily_limit',passed:dailySafe,message:'Daily planned time stays within the configured maximum.'},
    {key:'buffer',passed:planned<=totalPlannableMinutes,message:'Configured buffer remains reserved.'},
    {key:'high_priority',passed:highMeaningful,message:highMeaningful?'High-priority goals retain meaningful time.':'A high-priority goal fell below its minimum viable allocation.'}
  ];
  return {passed:checks.every(check=>check.passed),checks};
};
module.exports={inferComplexity,urgencyFor,findSemanticDuplicates,planGoalAllocations,validatePlanning,workTypesByCategory};