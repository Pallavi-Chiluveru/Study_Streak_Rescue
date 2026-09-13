const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Goal = require('../models/Goal');
const Plan = require('../models/Plan');
const Task = require('../models/Task');
const Preview = require('../models/PortfolioPreview');
const dates = require('../utils/dateUtils');
const adaptive = require('./adaptiveEstimationService');
const { scheduleMasterTasks } = require('./schedulingService');
const groq = require('./groqService');
const { goalHealth } = require('./goalPriorityService');
const { findSemanticDuplicates, planGoalAllocations, validatePlanning } = require('./goalAllocationService');
const fail = (message,status=409) => { throw Object.assign(new Error(message),{status}); };
const snapshot = async userId => {
 const [user,goals,tasks,plans]=await Promise.all([User.findById(userId),Goal.find({userId}).sort({_id:1}),Task.find({userId}).sort({_id:1}),Plan.find({userId}).sort({_id:1})]);
 return {user,goals,tasks,plans};
};
const fingerprint = state => crypto.createHash('sha256').update(JSON.stringify({
 profile:state.user.planningProfile, pace:state.user.learningPace, adaptive:state.user.preferences?.adaptiveTimeEstimation,
 goals:state.goals.map(g=>[g._id,g.updatedAt]),tasks:state.tasks.map(t=>[t._id,t.status,t.scheduleState,t.scheduledDate,t.scheduledStartMinute,t.adaptiveEstimatedMinutes,t.actualFocusMinutes,t.goalId]),
 plans:state.plans.map(p=>[p._id,p.goalId,p.startDate,p.deadline])
})).digest('hex');
const legalDays = (goal,start,end) => dates.getDateRange(start,end).filter(d => (!goal.startDate || d>=dates.getStartOfDay(goal.startDate)) && (!goal.deadline || d<=dates.getStartOfDay(goal.deadline)));
const cadenceDays = (goal,days) => {
 const type=goal.cadence?.type || 'ai_recommended';
 return days.filter((d,i)=> type==='weekdays' ? d.getDay()>0 && d.getDay()<6 : type==='weekends' ? [0,6].includes(d.getDay()) : type==='specific_days' ? goal.cadence.daysOfWeek.includes(d.getDay()) : type==='alternate_days' ? dates.getDateRange(goal.startDate || days[0],d).length%2===1 : true);
};
const cadenceCount = (goal,days) => ['daily','weekdays','weekends','specific_days','alternate_days'].includes(goal.cadence?.type)
 ? days.length : Math.min(days.length,goal.cadence?.type==='flexible' ? 1 : goal.cadence?.type==='ai_recommended' ? goal.aiAnalysis?.cadence?.timesPerWeek || 3 : goal.cadence?.timesPerWeek || 3);
const summarize = state => state.goals.map(goal => {
 const tasks=state.tasks.filter(t=>String(t.goalId)===String(goal._id));
 const today=dates.getStartOfDay(new Date()), monday=dates.addCalendarDays(today,-((today.getDay()+6)%7)), sunday=dates.addCalendarDays(monday,6);
 const week=tasks.filter(t=>t.scheduleState!=='held' && t.scheduledDate>=monday && t.scheduledDate<=sunday);
 return {...goal.toObject(),...goalHealth(goal,tasks),weekPlanned:week.length,weekCompleted:week.filter(t=>t.status==='completed').length,
  weeklyFocusMinutes:week.reduce((s,t)=>s+(t.actualFocusMinutes||0),0)};
});
const buildPreview = async (userId, options={}) => {
 const state=await snapshot(userId), profile=state.user.planningProfile.toObject();
 if (state.user.planningProfile.applyingPreviewId) fail('A schedule update is in progress. Please retry.');
 const start=options.start ? require('./goalValidation').date(options.start,'week start') : dates.getStartOfDay(new Date());
 if (!start || start<dates.getStartOfDay(new Date()) || start>dates.addCalendarDays(new Date(),14)) fail('Choose a start date within the next two weeks.',400);
 const end=dates.addCalendarDays(start,6);
 if (options.todayMinutes!==undefined && (!Number.isFinite(options.todayMinutes)||options.todayMinutes<0||options.todayMinutes>720)) fail('Invalid available time today.',400);
 let active=state.goals.filter(g=>g.status==='active');
 const activeIds=new Set(active.map(g=>String(g._id)));
 let targetPlan;
 if(options.planId) { targetPlan=state.plans.find(p=>String(p._id)===options.planId); if(!targetPlan) fail('Plan not found.',404); active=active.filter(g=>String(g._id)===String(targetPlan.goalId)); }
 const selected=state.tasks.filter(t=>t.status!=='completed' && !t.focusRunningSince && (targetPlan ? String(t.planId)===String(targetPlan._id) : activeIds.has(String(t.goalId))) && t.scheduledDate<=end);
 const selectedIds=new Set(selected.map(t=>String(t._id)));
 const protectedTasks=state.tasks.filter(t=>!selectedIds.has(String(t._id)) && t.scheduleState!=='held').map(t=>t.toObject());
 const jobs=[], strategies=[], warnings=[];
 if (targetPlan && !targetPlan.goalId) active=[{_id:'quick-plan',title:targetPlan.title,category:targetPlan.category || 'Skill Development',startDate:targetPlan.startDate,deadline:targetPlan.deadline,priority:'high',importance:'important',currentProgress:0,weeklyMinutes:0,cadence:{type:'flexible'},toObject(){return this;}}];
 const legalDaysByGoal=new Map(active.map(goal=>[String(goal._id),cadenceDays(goal,legalDays(goal,start,end))]));
 const duplicates=targetPlan ? [] : findSemanticDuplicates(active);
 const allocationPlan=planGoalAllocations({goals:active,profile,start,end,legalDaysByGoal,protectedTasks});
 const allocationByGoal=new Map(allocationPlan.allocations.map(item=>[item.goalId,item]));
 for (const goal of active) {
  const goalId=String(goal._id), allocation=allocationByGoal.get(goalId), days=legalDaysByGoal.get(goalId), count=allocation.sessions;
  const existing=selected.filter(t=>targetPlan ? String(t.planId)===String(targetPlan._id) : String(t.goalId)===goalId);
  const completed=state.tasks.filter(t=>String(t.goalId)===goalId && t.status==='completed');
  const remaining=goal.totalEstimatedMinutes ? Math.max(0,goal.totalEstimatedMinutes-completed.reduce((s,t)=>s+adaptive.baseEstimate(t),0)) : null;
  const target=allocation.minutes;
  let content=existing.map(t=>adaptive.personalizeTask(state.user,t)), provider='existing';
  if (!targetPlan && days.length) {
   const enough=()=>content.length>=count && content.reduce((s,t)=>s+adaptive.baseEstimate(t),0)>=target;
   if(!enough()) {
    const breakdown=await groq.generateTaskBreakdown({title:goal.title,description:`${goal.description || ''} Outcome: ${goal.mainOutcome || ''}. Category: ${goal.category}. Complexity: ${allocation.complexity}. Include an appropriate mix of: ${allocation.workTypes.join(', ')}. Current level: ${goal.currentLevel || 'unspecified'}. Upcoming week only. Completed work: ${completed.slice(-10).map(t=>t.title).join('; ')}`,sessionLength:allocation.sessionMinutes || profile.preferredSessionMinutes,priority:goal.priority});
    provider=breakdown.provider;
    let index=0;
    while(!enough() && content.length<112) {
     const source=breakdown.tasks[index%breakdown.tasks.length];
     const allocatedSoFar=content.reduce((sum,task)=>sum+adaptive.baseEstimate(task),0);
     const sessionsLeft=Math.max(1,count-content.length);
     const base=Math.min(90,Math.max(5,Math.ceil(Math.max(5,target-allocatedSoFar)/sessionsLeft/5)*5));
     content.push(adaptive.personalizeTask(state.user,{title:source.title+(index>=breakdown.tasks.length?' - continued practice':''),description:source.description,estimatedMinutes:base,priority:goal.priority,difficulty:source.difficulty,goalId}));index++;
    }
   }
  }
  if(!days.length && (existing.length || target>0)) warnings.push(`${goal.title}: no legal study days in this window. Check its start date, deadline and cadence.`);
  if(remaining===null) warnings.push(`${goal.title}: whole-goal workload is unknown; this is a weekly commitment estimate, not a guarantee of deadline completion.`);
  if(content.length<count) warnings.push(`${goal.title}: cadence needs more sessions than its available work.`);
  const keys=days.map(d=>dates.formatDateString(d));
  content.forEach((task,index)=>jobs.push({goal,task:{...task,_id:task._id ? String(task._id):undefined,planId:task.planId ? String(task.planId):undefined},targetMinutes:target,allowedDates:keys,distinctDay:index<count}));
  strategies.push({goalId,title:goal.title,category:goal.category,priority:goal.priority,horizon:goal.horizon,complexity:allocation.complexity,urgency:allocation.urgency.label,weight:Number(allocation.weight.toFixed(2)),requiredSessions:count,sessions:content.length,minutes:target,before:existing.length,provider,reason:allocation.reason,workTypes:allocation.workTypes});
 }
 if(jobs.length>500) fail('This portfolio has too much unfinished work for one preview. Pause goals or narrow the review.',400);
 const result=scheduleMasterTasks({jobs,protectedTasks,profile,start,end,todayMinutes:options.todayMinutes});
 for (const strategy of strategies) { const scheduled=result.tasks.filter(t=>String(t.goalId)===strategy.goalId);strategy.after=scheduled.length;strategy.sessions=scheduled.length;strategy.minutes=scheduled.reduce((sum,task)=>sum+adaptive.getEffectiveEstimatedMinutes(task),0); }
 const validation=validatePlanning({...allocationPlan,duplicates,result,profile});
 if(!validation.passed) {result.feasible=false;result.reality='Needs Review';}
 for(const duplicate of duplicates) warnings.push(`${duplicate.titles.join(' and ')}: ${duplicate.message}`);
 // A requested commitment with no legal dates is not silently considered feasible.
 if(warnings.some(w=>w.includes('no legal study days'))) {result.feasible=false;result.reality='Not Feasible';}
 const data={...result,start:dates.formatDateString(start),end:dates.formatDateString(end),strategies,warnings,duplicates,validation,allocation:{totalCapacityMinutes:allocationPlan.totalCapacity,totalPlannableMinutes:allocationPlan.totalPlannableMinutes,protectedMinutes:allocationPlan.protectedMinutes},selectedIds:[...selectedIds],
  movedCount:result.tasks.filter(t=>t._id && dates.formatDateString(state.tasks.find(old=>String(old._id)===t._id).scheduledDate)!==dates.formatDateString(t.scheduledDate)).length,
  tradeOffs:['Reduce flexible weekly commitments','Lower goal frequency','Extend a deadline','Pause a goal','Increase availability'],deadlineChanges:0,targetPlanId:targetPlan ? String(targetPlan._id):null};
 const preview=await Preview.create({userId,fingerprint:fingerprint(state),data});
 return {...data,previewId:preview._id};
};
const recover = async (userId,previewId) => {
 const preview=await Preview.findOne({_id:previewId,userId});
 if(!preview?.journal) { await User.updateOne({_id:userId,'planningProfile.applyingPreviewId':previewId},{$set:{'planningProfile.applyingPreviewId':null}});return; }
 const j=preview.journal;
 for(const old of j.tasks) await Task.replaceOne({_id:old._id,userId,portfolioWriteId:previewId},old,{timestamps:false});
 await Task.deleteMany({_id:{$in:j.newTaskIds},userId,portfolioWriteId:previewId});
 await Plan.deleteMany({_id:{$in:j.newPlanIds},userId});
 for(const old of j.plans) await Plan.replaceOne({_id:old._id,userId},old,{timestamps:false});
 await User.updateOne({_id:userId,'planningProfile.applyingPreviewId':previewId},{$set:{'planningProfile.applyingPreviewId':null}});
 await Preview.updateOne({_id:previewId,userId},{$set:{journal:null,expiresAt:new Date(Date.now()+3600000)}});
};
const applyPreview = async (userId,previewId) => {
 if(!mongoose.isValidObjectId(previewId)) fail('Invalid preview.',400);
 const preview=await Preview.findOne({_id:previewId,userId});
 if(!preview || preview.appliedAt || preview.expiresAt<new Date()) fail('This preview expired or was already applied. Build a fresh preview.');
 if(!preview.data.feasible) fail('Resolve the capacity or cadence conflicts before applying.');
 const state=await snapshot(userId);
 if(fingerprint(state)!==preview.fingerprint) fail('Your goals, focus progress or availability changed. Build a fresh preview.');
 const changes=preview.data.tasks, oldTasks=state.tasks.filter(t=>preview.data.selectedIds.includes(String(t._id)));
 const planMap=new Map(), newPlans=[];
 for(const task of changes) if(!task.planId) {
  let plan=state.plans.find(p=>String(p.goalId)===String(task.goalId));
  if(!plan) plan=newPlans.find(p=>String(p.goalId)===String(task.goalId));
  if(!plan) {const goal=state.goals.find(g=>String(g._id)===String(task.goalId));plan={_id:new mongoose.Types.ObjectId(),userId,goalId:goal._id,title:goal.title,category:goal.category,startDate:goal.startDate || dates.getStartOfDay(preview.data.start),deadline:goal.deadline || dates.getStartOfDay(preview.data.end),availableMinutesPerDay:state.user.planningProfile.maximumDailyMinutes,status:'active'};newPlans.push(plan);}
  planMap.set(String(task.goalId),plan._id);
 }
 const prepared=changes.map(t=>({...t,_id:t._id || new mongoose.Types.ObjectId(),planId:t.planId || planMap.get(String(t.goalId))}));
 const existingPlanIds=[...new Set(prepared.map(t=>String(t.planId)))];
 const boundsByPlan=new Map([...state.plans,...newPlans].map(plan=>[String(plan._id),plan]));
 for(const task of prepared){const plan=boundsByPlan.get(String(task.planId));if(!plan) fail('Scheduling invariant violation: plan boundary is unavailable.');dates.assertDateWithinRange(task.scheduledDate,plan.startDate,plan.deadline);}
 const oldPlans=state.plans.filter(p=>existingPlanIds.includes(String(p._id))).map(p=>p.toObject());
 const journal={tasks:oldTasks.map(t=>t.toObject()),plans:oldPlans,newTaskIds:prepared.filter(t=>!state.tasks.some(old=>String(old._id)===String(t._id))).map(t=>t._id),newPlanIds:newPlans.map(p=>p._id)};
 const lock=await User.updateOne({_id:userId,'planningProfile.applyingPreviewId':null,'planningProfile.scheduleRevision':state.user.planningProfile.scheduleRevision || 0},{$set:{'planningProfile.applyingPreviewId':preview._id,'planningProfile.applyingSince':new Date()}});
 if(!lock.modifiedCount) fail('Another schedule update is in progress. Retry shortly.');
 try {
  await Preview.updateOne({_id:preview._id},{$set:{journal},$unset:{expiresAt:1}});
  if(newPlans.length) await Plan.insertMany(newPlans);
  const keptIds=new Set(prepared.map(t=>String(t._id)));
  await Task.updateMany({_id:{$in:oldTasks.filter(t=>!keptIds.has(String(t._id))).map(t=>t._id)},userId},{$set:{scheduleState:'held',portfolioWriteId:preview._id}});
  for(const t of prepared) {
   const old=state.tasks.find(v=>String(v._id)===String(t._id));
   const goalId=t.goalId==='quick-plan'?null:t.goalId;
   const fields={userId,planId:t.planId,goalId,title:t.title,description:t.description || '',estimatedMinutes:t.baseEstimatedMinutes || t.estimatedMinutes,
    baseEstimatedMinutes:t.baseEstimatedMinutes,adaptiveEstimatedMinutes:t.adaptiveEstimatedMinutes,estimationSource:t.estimationSource,
    priority:t.priority || 'medium',difficulty:t.difficulty || 'medium',scheduledDate:dates.getStartOfDay(t.scheduledDate),scheduledStartMinute:t.scheduledStartMinute,scheduledEndMinute:t.scheduledEndMinute,
    status:old?'rescheduled':'pending',wasRescheduled:!!old,scheduleState:'scheduled',portfolioWriteId:preview._id};
   if(old) {const updated=await Task.updateOne({_id:old._id,userId,status:old.status,updatedAt:old.updatedAt},{$set:fields});if(!updated.modifiedCount) fail('A task changed during review. Please retry.');}
   else await Task.create({_id:t._id,...fields});
  }
  for(const old of oldPlans) {
   const planTasks=await Task.find({userId,planId:old._id});
   const last=planTasks.reduce((max,t)=>t.scheduledDate>max?t.scheduledDate:max,old.deadline);
   await Plan.updateOne({_id:old._id,userId},{$set:{deadline:last,estimatedTotalMinutes:planTasks.reduce((s,t)=>s+adaptive.getEffectiveEstimatedMinutes(t),0)}});
  }
  await Preview.updateOne({_id:preview._id},{$set:{appliedAt:new Date(),expiresAt:new Date(Date.now()+30*86400000)}});
  await User.updateOne({_id:userId,'planningProfile.applyingPreviewId':preview._id},{$set:{'planningProfile.enabled':true,'planningProfile.lastAppliedAt':new Date(),'planningProfile.applyingPreviewId':null,'goalOnboarding.status':'completed','goalOnboarding.completedAt':new Date()},$inc:{'planningProfile.scheduleRevision':1}});
  return {success:true,message:'Your shared schedule is ready.',tasks:await Task.find({_id:{$in:prepared.map(t=>t._id)},userId})};
 } catch(error) {await recover(userId,preview._id);throw error;}
};
module.exports={snapshot,fingerprint,summarize,buildPreview,applyPreview,recover,legalDays,cadenceDays,cadenceCount};


