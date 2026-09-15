const test=require('node:test');
const assert=require('node:assert/strict');
const dates=require('../utils/dateUtils');
const {MAX_OPTIMIZATION_PASSES,optimizePortfolio}=require('../services/portfolioOptimizationService');
const start=new Date(2030,0,7),end=dates.addCalendarDays(start,6);
const daily={_id:'daily',title:'Daily DSA',category:'Coding / DSA',priority:'high',importance:'essential',horizon:'medium',currentProgress:0,weeklyMinutes:315,minimumWeeklyMinutes:0,cadence:{type:'daily',timesPerWeek:7}};
test('bounded optimizer temporarily reduces balanced buffer from 15% to 10% only when needed',()=>{
 const profile={weeklyAvailability:[17,17,17,17,17,17,17],maximumDailyMinutes:17,preferredSessionMinutes:45,preferredStudyPeriod:'evening',utilizationPreference:'balanced',restDays:[],fixedBlocks:[]};
 const result=optimizePortfolio({goals:[daily],profile,start,end,legalDaysByGoal:new Map([['daily',dates.getDateRange(start,end)]])});
 assert.equal(result.plan.minimumFeasible,true);
 assert.equal(result.bufferAdjusted,true);
 assert.equal(result.status,'ADJUSTED_FEASIBLE');
 assert.ok(result.passes<=MAX_OPTIMIZATION_PASSES);
 assert.equal(result.effectiveProfile.optimizationUtilization,0.9);
 assert.equal(profile.optimizationUtilization,undefined);
 assert.deepEqual(result.adjustments.find(change=>change.field==='bufferPercent'),{field:'bufferPercent',before:15,after:10,reason:'Reduced the temporary planning buffer within the safe 90% utilization limit.'});
});
test('optimizer reports impossible critical work without violating hard availability',()=>{
 const profile={weeklyAvailability:[10,10,10,10,10,10,10],maximumDailyMinutes:10,preferredSessionMinutes:45,preferredStudyPeriod:'evening',utilizationPreference:'maximum',restDays:[],fixedBlocks:[]};
 const result=optimizePortfolio({goals:[daily],profile,start,end,legalDaysByGoal:new Map([['daily',dates.getDateRange(start,end)]])});
 assert.equal(result.plan.minimumFeasible,false);
 assert.equal(result.status,'NOT_FEASIBLE');
 assert.equal(result.effectiveProfile.maximumDailyMinutes,10);
 assert.ok(result.passes<=MAX_OPTIMIZATION_PASSES);
});
test('maximumDailyMinutes changes capped weekend capacity in both directions',()=>{
 const goal={...daily,priority:'medium',importance:'important',cadence:{type:'flexible',timesPerWeek:1},weeklyMinutes:45};
 const base={weeklyAvailability:[120,120,120,120,120,480,480],preferredSessionMinutes:45,preferredStudyPeriod:'evening',utilizationPreference:'balanced',restDays:[],fixedBlocks:[]};
 const at360=optimizePortfolio({goals:[goal],profile:{...base,maximumDailyMinutes:360},start,end,legalDaysByGoal:new Map([['daily',dates.getDateRange(start,end)]])});
 const at280=optimizePortfolio({goals:[goal],profile:{...base,maximumDailyMinutes:280},start,end,legalDaysByGoal:new Map([['daily',dates.getDateRange(start,end)]])});
 assert.equal(at360.plan.totalCapacity,1122);
 assert.equal(at280.plan.totalCapacity,986);
 assert.ok(at360.plan.totalCapacity>at280.plan.totalCapacity);
});
