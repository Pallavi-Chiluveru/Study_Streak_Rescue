const test = require('node:test');
const assert = require('node:assert/strict');
const { scheduleMasterTasks } = require('../services/schedulingService');
const baseProfile={weeklyAvailability:[120,120,120,120,120,120,120],maximumDailyMinutes:120,preferredStudyPeriod:'evening',utilizationPreference:'balanced',restDays:[],fixedBlocks:[]};
const goal=(id,extra={})=>({_id:id,title:id,priority:'medium',importance:'important',minimumWeeklyMinutes:0,...extra});
const job=(g,date,minutes=45)=>({goal:g,task:{title:g.title+' work',estimatedMinutes:minutes},targetMinutes:90,allowedDates:[date],distinctDay:false});
test('master allocator rejects overload and never collides sessions',()=>{
 const start=new Date(2030,0,7),key='2030-01-07',g=goal('a');
 const r=scheduleMasterTasks({jobs:[job(g,key,60),job(g,key,60)],profile:baseProfile,start,end:start});
 assert.equal(r.feasible,false);assert.equal(r.tasks.length,1);assert.equal(r.unscheduled.length,1);
 const spans=r.days[0].sessions.map(x=>[x.scheduledStartMinute,x.scheduledEndMinute]);
 assert.equal(spans.length,1);
});
test('fixed blocks, rest days and adaptive duration constrain capacity',()=>{
 const start=new Date(2030,0,7),key='2030-01-07';
 const profile={...baseProfile,weeklyAvailability:[180,0,0,0,0,0,0],maximumDailyMinutes:180,fixedBlocks:[{daysOfWeek:[1],startMinute:360,endMinute:1380,label:'work'}]};
 const r=scheduleMasterTasks({jobs:[job(goal('a'),key,45)],profile,start,end:start});
 assert.equal(r.tasks.length,0);assert.equal(r.feasible,false);
 const adaptiveJob={goal:goal('b'),task:{title:'adaptive',estimatedMinutes:60,adaptiveEstimatedMinutes:110},targetMinutes:110,allowedDates:[key]};
 const r2=scheduleMasterTasks({jobs:[adaptiveJob],profile:baseProfile,start,end:start});
 assert.equal(r2.tasks.length,0);assert.equal(r2.shortageMinutes,8);
});
test('fresh capacity inputs switch feasibility in both directions',()=>{
 const start=new Date(2030,0,7),key='2030-01-07',g=goal('capacity');
 const jobs=[job(g,key,60),job(g,key,60)];
 const low={...baseProfile,weeklyAvailability:[60,0,0,0,0,0,0],maximumDailyMinutes:60};
 const high={...baseProfile,weeklyAvailability:[180,0,0,0,0,0,0],maximumDailyMinutes:180,utilizationPreference:'maximum'};
 const notFeasible=scheduleMasterTasks({jobs,profile:low,start,end:start});
 const feasible=scheduleMasterTasks({jobs,profile:high,start,end:start});
 assert.equal(notFeasible.feasible,false);
 assert.equal(feasible.feasible,true);
 assert.ok(feasible.availableMinutes>notFeasible.availableMinutes);
 assert.equal(scheduleMasterTasks({jobs,profile:low,start,end:start}).feasible,false);
});

