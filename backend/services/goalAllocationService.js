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
const explainAllocations = allocations => {
  const ordered=[...allocations].filter(item=>!item.deferred).sort((a,b)=>b.minutes-a.minutes);
  for(const item of allocations){
    item.requestedSessions=item.desiredSessions;
    item.requestedMinutes=item.desiredMinutes;
    item.allocatedSessions=item.sessions;
    item.allocatedMinutes=item.minutes;
    item.requestedCadence=item.goal.cadence?.type || 'ai_recommended';
    const explicitCadence=item.requestedCadence!=='ai_recommended'&&item.requestedCadence!=='flexible';
    item.cadenceSatisfied=!explicitCadence||(!item.deferred&&item.sessions>=item.desiredSessions);
    item.actualSessionsPerWeek=item.sessions;
    item.adjustmentReason=item.adjusted||item.deferred?'Reduced to keep the complete portfolio within your available study capacity.':null;
    if(item.deferred){
      item.cadenceReason=`${item.title} was deferred after protecting more urgent or essential work.`;
      item.reason=`Originally requested ${item.desiredSessions} sessions/week. Deferred for this week because it is ${item.goal.priority}-priority and ${item.urgency.label}.`;
      continue;
    }
    const workload=item.remainingMinutes===null?'estimated weekly commitment':`${item.remainingMinutes} minutes of estimated work remaining`;
    const comparison=ordered.length>1&&ordered[0].goalId===item.goalId?` It receives the largest allocation among ${ordered.length} active goals.`:'';
    const finalSessionSummary=item.sessions*item.sessionMinutes===item.minutes?`${item.sessions} x ${item.sessionMinutes}-minute sessions`:`${item.sessions} sessions totaling ${item.minutes} minutes`;
    const adjustment=item.adjusted?` Originally requested ${item.desiredSessions} sessions/week (${item.desiredMinutes} minutes). Replanned to ${finalSessionSummary} (${item.minutes} minutes/week) to fit the current portfolio.`:'';
    item.cadenceReason=item.cadenceSatisfied?null:`${item.title} requested ${item.desiredSessions} sessions/week, but only ${item.sessions} fit the final allocation.`;
    item.reason=`Allocated ${finalSessionSummary} (${item.minutes} minutes/week) for this ${item.goal.priority}-priority ${item.goal.category || 'study'} goal with ${workload}, ${item.urgency.label}, and ${progressLabel(item.progress)} progress.${comparison}${adjustment}`;
  }
  return allocations;
};
const reductionOrder = (a,b) => a.protection-b.protection || a.weight-b.weight || a.goalId.localeCompare(b.goalId);
const planGoalAllocations = ({ goals, profile, start, end, legalDaysByGoal, protectedTasks=[], completedMinutesByGoal=new Map() }) => {
  const days=capacityDays(profile,start,end), totalCapacity=days.reduce((sum,day)=>sum+day.capacity,0);
  const protectedMinutes=protectedTasks.filter(task=>{const key=formatDateString(task.scheduledDate);return key>=formatDateString(start)&&key<=formatDateString(end);}).reduce((sum,task)=>sum+getEffectiveEstimatedMinutes(task),0);
  const totalPlannableMinutes=Math.max(0,totalCapacity-protectedMinutes), preferred=Math.max(15,Math.min(90,Number(profile.preferredSessionMinutes)||45));
  const allocations=goals.map(goal=>{
    const goalId=String(goal._id), legalCount=(legalDaysByGoal.get(goalId)||[]).length, complexity=inferComplexity(goal), urgency=urgencyFor(goal,start), progress=Number(goal.currentProgress)||0;
    const difficulty=String(goal.aiAnalysis?.difficulty||goal.currentLevel||'moderate').toLowerCase(), difficultyWeight=/hard|advanced|difficult/.test(difficulty)?1.2:/easy|beginner/.test(difficulty)?0.9:1;
    const priorityWeight=PRIORITY[goal.priority]||2, horizonWeight=HORIZON[goal.horizon]||1, progressWeight=PROGRESS(progress), complexityWeight=COMPLEXITY[complexity];
    const continuity=continuousCategories.test(`${goal.category||''} ${goal.title||''}`), weight=priorityWeight*urgency.factor*horizonWeight*progressWeight*complexityWeight*difficultyWeight;
    const sessions=desiredSessionCount(goal,complexity,urgency,progress,continuity,legalCount), minimumSessions=minimumSessionCount(goal,urgency,continuity,sessions,legalCount);
    const completedMinutes=completedMinutesByGoal.get(goalId)||0, remainingMinutes=goal.totalEstimatedMinutes==null?null:Math.max(0,goal.totalEstimatedMinutes-completedMinutes);
    const weeks=urgency.days===null?1:Math.max(1,urgency.days/7), requiredWeeklyMinutes=remainingMinutes===null?0:Math.ceil(remainingMinutes/weeks/5)*5;
    const userCommitment=Math.max(0,goal.minimumWeeklyMinutes||0,goal.weeklyMinutes||0), desiredMinutes=Math.min(sessions*90,Math.max(sessions*preferred,userCommitment,requiredWeeklyMinutes));
    const essential=goal.priority==='high'||goal.importance==='essential'||urgency.factor===3;
    const sessionMinutes=sessions ? Math.max(15,Math.min(90,Math.ceil(desiredMinutes/sessions/5)*5)) : 0;
    return {goal,goalId,title:goal.title,complexity,urgency,progress,continuity,difficulty,difficultyWeight,priorityWeight,horizonWeight,progressWeight,complexityWeight,weight,essential,remainingMinutes,requiredWeeklyMinutes,
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
    const candidate=[...allocations].filter(item=>!item.essential&&!item.deferred&&item.sessions>0).sort(reductionOrder)[0];
    if(!candidate) break;
    const removed=candidate.minutes;candidate.sessions=0;candidate.minutes=0;candidate.deferred=true;total-=removed;
    reductions.push({goalId:candidate.goalId,title:candidate.title,type:'deferred',minutes:removed});
  }
  while(total>totalPlannableMinutes){
    const candidate=[...allocations].filter(item=>item.sessions>0&&item.sessionMinutes>15).sort(reductionOrder)[0];
    if(!candidate) break;
    const decrement=Math.min(5,candidate.sessionMinutes-15);candidate.sessionMinutes-=decrement;candidate.minutes=candidate.sessions*candidate.sessionMinutes;total-=decrement*candidate.sessions;
    reductions.push({goalId:candidate.goalId,title:candidate.title,type:'duration',minutes:decrement*candidate.sessions});
  }
  const scheduled=allocations.filter(item=>!item.deferred), identicalGroups=new Map();
  for(const item of scheduled){const key=`${item.sessions}:${item.minutes}`;if(!identicalGroups.has(key))identicalGroups.set(key,[]);identicalGroups.get(key).push(item);}
  for(const group of identicalGroups.values()){
    if(group.length<2||group.every(item=>Math.abs(item.weight-group[0].weight)<=0.01))continue;
    group.sort((a,b)=>b.weight-a.weight);const offsets=group.map((item,index)=>(group.length-1-index*2)*5);
    if(group.every((item,index)=>item.sessionMinutes+offsets[index]>=15&&item.sessionMinutes+offsets[index]<=90)){
      for(let index=0;index<group.length;index++){const item=group[index];item.sessionMinutes+=offsets[index];item.minutes=item.sessions*item.sessionMinutes;reductions.push({goalId:item.goalId,title:item.title,type:'redistributed',minutes:Math.abs(offsets[index]*item.sessions)});}
    } else for(const item of group)item.identicalJustified=true;
  }
  for(const item of allocations)item.adjusted=item.sessions!==item.desiredSessions||item.minutes!==item.desiredMinutes;
  explainAllocations(allocations);
  const finalTotal=allocations.reduce((sum,item)=>sum+item.minutes,0);
  const minimumFeasible=finalTotal<=totalPlannableMinutes;
  const reducedSessions=reductions.filter(change=>change.type==='session').length, deferredGoals=reductions.filter(change=>change.type==='deferred').length, reducedMinutes=originalDesiredMinutes-finalTotal;
  return {allocations,totalCapacity,totalPlannableMinutes,protectedMinutes,originalDesiredMinutes,plannedAllocationMinutes:finalTotal,minimumFeasible,reductions,
    optimizationMessage:reductions.length?`AI replanned the initial recommendation by reducing ${reducedSessions} session${reducedSessions===1?'':'s'}, deferring ${deferredGoals} lower-urgency goal${deferredGoals===1?'':'s'}, and freeing ${reducedMinutes} minutes so the final plan fits.`:'The initial recommendation already fits your availability.'};
};
const validatePlanning = ({allocations,totalCapacity,totalPlannableMinutes,minimumFeasible,duplicates,result,profile}) => {
  const planned=allocations.reduce((sum,item)=>sum+item.minutes,0);
  const identicalWithoutReason=allocations.filter(item=>!item.deferred).some((a,i,list)=>list.slice(i+1).some(b=>a.sessions===b.sessions&&a.minutes===b.minutes&&Math.abs(a.weight-b.weight)>0.01&&!a.identicalJustified&&!b.identicalJustified&&(a.goal.cadence?.type==='ai_recommended'||b.goal.cadence?.type==='ai_recommended')));
  const deadlineAchievable=allocations.filter(item=>item.essential&&!item.deferred&&item.urgency.days!==null&&item.urgency.days<=7&&item.remainingMinutes!==null).every(item=>item.minutes>=item.remainingMinutes);
  const dailySafe=(result?.days||[]).every(day=>day.used<=day.capacity&&day.used<=profile.maximumDailyMinutes);
  const capacitySafe=minimumFeasible&&planned<=totalPlannableMinutes&&(!result||(result.shortageMinutes||0)===0);
  const placementSafe=!(result?.unscheduled?.length)&&!(result?.conflicts?.length);
  const cadenceFailures=allocations.filter(item=>!item.cadenceSatisfied).map(item=>({
    goalId:item.goalId,title:item.title,requestedCadence:item.requestedCadence,requestedSessions:item.requestedSessions,
    actualSessionsPerWeek:item.allocatedSessions,satisfied:false,reason:item.cadenceReason
  }));
  const comparable=(a,b)=>{
    const workloadComparable=(a.remainingMinutes===null&&b.remainingMinutes===null)||(a.remainingMinutes!==null&&b.remainingMinutes!==null&&Math.abs(a.remainingMinutes-b.remainingMinutes)<=Math.max(a.remainingMinutes,b.remainingMinutes,1)*0.25);
    return a.complexity===b.complexity&&a.urgency.factor===b.urgency.factor&&a.desiredSessions===b.desiredSessions&&workloadComparable;
  };
  const allocationAdjustments=allocations.filter(item=>item.adjusted||item.deferred).map(item=>({
    goalId:item.goalId,title:item.title,requestedSessions:item.requestedSessions,requestedMinutes:item.requestedMinutes,allocatedSessions:item.allocatedSessions,allocatedMinutes:item.allocatedMinutes,
    reason:`${item.title} was adjusted from ${item.requestedSessions} sessions (${item.requestedMinutes} minutes) to ${item.allocatedSessions} sessions (${item.allocatedMinutes} minutes) per week.`
  }));  const priorityConflicts=[];
  for(const higher of allocations.filter(item=>!item.deferred))for(const lower of allocations.filter(item=>!item.deferred)){
    if(higher.priorityWeight>lower.priorityWeight&&comparable(higher,lower)&&higher.minutes<lower.minutes){
      priorityConflicts.push({higherGoalId:higher.goalId,higherTitle:higher.title,higherPriority:higher.goal.priority,lowerGoalId:lower.goalId,lowerTitle:lower.title,lowerPriority:lower.goal.priority,message:`${higher.title} is ${higher.goal.priority} priority but currently receives less weekly time than ${lower.title}.`});
    }
  }
  const checks=[
    {key:'capacity',kind:'hard',passed:capacitySafe,message:capacitySafe?'Total planned work fits usable capacity.':'Required workload exceeds usable study capacity.'},
    {key:'placement',kind:'hard',passed:placementSafe,message:placementSafe?'Every final session has a legal, non-overlapping slot.':'One or more sessions cannot be placed within legal dates and daily limits.'},
    {key:'deadline',kind:'hard',passed:deadlineAchievable,message:deadlineAchievable?'Important deadlines have sufficient planned time.':'An urgent essential deadline cannot be met with the available capacity.'},
    {key:'daily_limit',kind:'hard',passed:dailySafe,message:dailySafe?'Daily maximum is respected.':'A day exceeds the configured maximum.'},
    {key:'buffer',kind:'hard',passed:planned<=totalPlannableMinutes,message:planned<=totalPlannableMinutes?'Buffer is preserved.':'The configured buffer cannot be preserved.'},
    {key:'cadence',kind:'soft',passed:!cadenceFailures.length,message:cadenceFailures.length?cadenceFailures.map(item=>item.reason).join(' '):'Requested goal cadences are satisfied.',details:cadenceFailures},
    {key:'weekly_commitment',kind:'soft',passed:!allocationAdjustments.length,message:allocationAdjustments.length?allocationAdjustments.map(item=>item.reason).join(' '):'Requested weekly commitments are preserved.',details:allocationAdjustments},
    {key:'priority_alignment',kind:'soft',passed:!priorityConflicts.length,message:priorityConflicts.length?priorityConflicts.map(item=>item.message).join(' '):'Comparable goals follow their priority order.',details:priorityConflicts},
    {key:'unique_goals',kind:'soft',passed:!duplicates.length,message:duplicates.length?'Possible duplicate goals should be reviewed.':'No semantic duplicate goals detected.'},
    {key:'personalized_allocations',kind:'soft',passed:!identicalWithoutReason,message:identicalWithoutReason?'Some differently weighted goals received identical allocations and should be reviewed.':'Allocations are independently personalized.'}
  ];
  const wasAdjusted=allocations.some(item=>item.adjusted||item.deferred);
  for(const check of checks)check.status=check.passed?'passed':check.kind==='hard'?'failed':'needs_adjustment';
  const hardConstraintsSatisfied=checks.filter(check=>check.kind==='hard').every(check=>check.passed);
  const softConstraintsSatisfied=checks.filter(check=>check.kind==='soft').every(check=>check.passed);
  const status=!hardConstraintsSatisfied?'NOT_FEASIBLE':softConstraintsSatisfied?'FEASIBLE':'NEEDS_REVIEW';
  return {passed:hardConstraintsSatisfied&&softConstraintsSatisfied,hardConstraintsSatisfied,softConstraintsSatisfied,canApply:hardConstraintsSatisfied,status,adjusted:wasAdjusted,checks,
    whatWorks:checks.filter(check=>check.passed).map(check=>check.message),
    needsAdjustment:checks.filter(check=>!check.passed).map(check=>check.message),cadenceFailures,allocationAdjustments,priorityConflicts};
};
module.exports={inferComplexity,urgencyFor,findSemanticDuplicates,planGoalAllocations,validatePlanning,explainAllocations,workTypesByCategory};