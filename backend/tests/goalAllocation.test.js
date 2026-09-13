const test = require('node:test');
const assert = require('node:assert/strict');
const { findSemanticDuplicates, planGoalAllocations, validatePlanning } = require('../services/goalAllocationService');
const dates = require('../utils/dateUtils');

const profile={weeklyAvailability:[75,75,75,75,75,75,75],maximumDailyMinutes:75,preferredSessionMinutes:45,preferredStudyPeriod:'evening',utilizationPreference:'balanced',restDays:[],fixedBlocks:[]};
const start=new Date(2030,0,7), end=dates.addCalendarDays(start,6);
const legal=new Map([['placement',dates.getDateRange(start,end)],['semester',dates.getDateRange(start,end)],['manual',dates.getDateRange(start,end)]]);
const goal=(id,extra)=>({_id:id,title:id,category:'Skill Development',priority:'medium',currentProgress:0,cadence:{type:'ai_recommended'},minimumWeeklyMinutes:0,...extra});

test('weighted allocation independently plans placement and semester goals within buffered capacity',()=>{
 const goals=[
  goal('placement',{title:'Placement preparation for job interviews',category:'Interview Preparation',priority:'high',horizon:'medium'}),
  goal('semester',{title:'Score high marks in semester',category:'Semester / Academics',priority:'high',horizon:'short'})
 ];
 const plan=planGoalAllocations({goals,profile,start,end,legalDaysByGoal:legal});
 const placement=plan.allocations.find(item=>item.goalId==='placement'), semester=plan.allocations.find(item=>item.goalId==='semester');
 assert.ok(placement.weight>semester.weight);
 assert.ok(placement.minutes>semester.minutes);
 assert.ok(placement.sessions>semester.sessions);
 assert.notEqual(`${placement.sessions}:${placement.minutes}`,`${semester.sessions}:${semester.minutes}`);
 assert.ok(plan.originalDesiredMinutes>plan.plannedAllocationMinutes);
 assert.ok(plan.reductions.length>0);
 assert.ok(plan.allocations.reduce((sum,item)=>sum+item.minutes,0)<=plan.totalPlannableMinutes);
 assert.match(plan.optimizationMessage,/AI replanned/);
 assert.match(placement.reason,/Allocated .*Interview Preparation goal/);
});

test('manual frequency is preserved while AI recommended frequency remains dynamic',()=>{
 const goals=[goal('manual',{cadence:{type:'times_per_week',timesPerWeek:2},priority:'low'})];
 const plan=planGoalAllocations({goals,profile,start,end,legalDaysByGoal:legal});
 assert.equal(plan.allocations[0].sessions,2);
});

test('semantic duplicate detection blocks an otherwise valid planning review',()=>{
 const goals=[goal('a',{title:'Placement Interview Preparation',category:'Interview Preparation'}),goal('b',{title:'Placement preparation for job interviews',category:'Interview Preparation'})];
 const duplicates=findSemanticDuplicates(goals);
 assert.equal(duplicates.length,1);
 assert.match(duplicates[0].message,/merge/i);
 const allocation=planGoalAllocations({goals,profile,start,end,legalDaysByGoal:new Map([['a',dates.getDateRange(start,end)],['b',dates.getDateRange(start,end)]])});
 const result={plannedMinutes:allocation.allocations.reduce((sum,item)=>sum+item.minutes,0),days:[]};
 const validation=validatePlanning({...allocation,duplicates,result,profile});
 assert.equal(validation.passed,false);
 assert.equal(validation.checks.find(check=>check.key==='unique_goals').passed,false);
});
test('minimum-plan infeasibility is reserved for genuinely impossible constraints',()=>{
 const tiny={...profile,weeklyAvailability:[5,0,0,0,0,0,0],maximumDailyMinutes:5};
 const goals=[
  goal('placement',{category:'Interview Preparation',priority:'high',deadline:'2030-01-08'}),
  goal('semester',{category:'Semester / Academics',priority:'high',deadline:'2030-01-08'})
 ];
 const plan=planGoalAllocations({goals,profile:tiny,start,end,legalDaysByGoal:legal});
 assert.equal(plan.minimumFeasible,false);
 assert.ok(plan.plannedAllocationMinutes>plan.totalPlannableMinutes);
});
test('remaining workload differentiates otherwise similar goals',()=>{
 const ample={...profile,weeklyAvailability:[120,120,120,120,120,120,120],maximumDailyMinutes:120};
 const goals=[goal('placement',{title:'Large syllabus',totalEstimatedMinutes:900}),goal('semester',{title:'Small revision',totalEstimatedMinutes:90})];
 const plan=planGoalAllocations({goals,profile:ample,start,end,legalDaysByGoal:legal});
 const large=plan.allocations.find(item=>item.goalId==='placement'), small=plan.allocations.find(item=>item.goalId==='semester');
 assert.ok(large.requiredWeeklyMinutes>small.requiredWeeklyMinutes);
 assert.ok(large.minutes>small.minutes);
 assert.match(large.reason,/900 minutes of estimated work remaining/);
});

test('replanning defers a lower-priority non-urgent goal before sacrificing an essential goal',()=>{
 const constrained={...profile,weeklyAvailability:[30,30,30,30,30,30,30],maximumDailyMinutes:30};
 const goals=[goal('placement',{title:'Urgent interview',category:'Interview Preparation',priority:'high'}),goal('manual',{title:'Optional reading',priority:'low'})];
 const plan=planGoalAllocations({goals,profile:constrained,start,end,legalDaysByGoal:legal});
 assert.equal(plan.minimumFeasible,true);
 assert.equal(plan.allocations.find(item=>item.goalId==='manual').deferred,true);
 assert.ok(plan.allocations.find(item=>item.goalId==='placement').sessions>=3);
 assert.match(plan.allocations.find(item=>item.goalId==='manual').reason,/Deferred for this week/);
 const validation=validatePlanning({...plan,duplicates:[],profile:constrained,result:{plannedMinutes:plan.plannedAllocationMinutes,days:[]}});
 assert.equal(validation.passed,true);
 assert.ok(validation.checks.some(check=>check.status==='adjusted'));
});

test('an urgent essential deadline fails final validation when remaining work cannot fit',()=>{
 const urgent=goal('placement',{title:'Exam tomorrow',priority:'high',deadline:'2030-01-08',totalEstimatedMinutes:1000});
 const plan=planGoalAllocations({goals:[urgent],profile,start,end,legalDaysByGoal:legal});
 const tasks=Array.from({length:plan.allocations[0].sessions},()=>({goalId:'placement'}));
 const validation=validatePlanning({...plan,duplicates:[],profile,result:{plannedMinutes:plan.plannedAllocationMinutes,days:[],tasks}});
 assert.equal(validation.passed,false);
 assert.equal(validation.checks.find(check=>check.key==='deadline').status,'failed');
});
test('rounding does not leave differently weighted AI goals generically identical',()=>{
 const goals=[goal('placement',{priority:'high',currentProgress:90}),goal('semester',{priority:'medium',currentProgress:0})];
 const plan=planGoalAllocations({goals,profile:{...profile,weeklyAvailability:[300,300,300,300,300,300,300],maximumDailyMinutes:300},start,end,legalDaysByGoal:legal});
 const [a,b]=plan.allocations;
 assert.ok(a.sessions!==b.sessions||a.minutes!==b.minutes||a.identicalJustified);
 const validation=validatePlanning({...plan,duplicates:[],profile,result:{plannedMinutes:plan.plannedAllocationMinutes,days:[]}});
 assert.notEqual(validation.checks.find(check=>check.key==='personalized_allocations').status,'failed');
});