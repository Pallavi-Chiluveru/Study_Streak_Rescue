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
 assert.match(plan.optimizationMessage,/AI reduced/);
 assert.match(placement.reason,/High-priority, medium-term intensive recurring practice/);
});

test('manual frequency is preserved while AI recommended frequency remains dynamic',()=>{
 const goals=[goal('manual',{cadence:{type:'times_per_week',timesPerWeek:2},priority:'low'}),goal('placement',{category:'Interview Preparation',priority:'high'})];
 const plan=planGoalAllocations({goals,profile,start,end,legalDaysByGoal:legal});
 assert.equal(plan.allocations.find(item=>item.goalId==='manual').sessions,2);
 assert.notEqual(plan.allocations.find(item=>item.goalId==='placement').sessions,2);
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