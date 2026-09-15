const { planGoalAllocations } = require('./goalAllocationService');

const MAX_OPTIMIZATION_PASSES = 10;
const utilizationPercent = profile => profile.utilizationPreference === 'light' ? 75 : profile.utilizationPreference === 'maximum' ? 100 : 85;

const allocationChanges = plan => plan.allocations.flatMap(item => {
  const changes=[];
  if(item.desiredSessions!==item.sessions) changes.push({goalId:item.goalId,title:item.title,field:'sessionsPerWeek',before:item.desiredSessions,after:item.sessions,reason:item.deferred?'Temporarily deferred after protecting urgent and essential goals.':'Reduced flexible cadence after rebalancing within available days.'});
  if(item.desiredMinutes!==item.minutes) changes.push({goalId:item.goalId,title:item.title,field:'weeklyMinutes',before:item.desiredMinutes,after:item.minutes,reason:'Adjusted the current week while preserving the saved goal preference.'});
  if(item.sessions&&item.desiredSessions===item.sessions&&item.desiredMinutes!==item.minutes) changes.push({goalId:item.goalId,title:item.title,field:'sessionMinutes',before:Math.round(item.desiredMinutes/item.desiredSessions),after:item.sessionMinutes,reason:'Used a shorter safe session length for this week.'});
  return changes;
});

const optimizePortfolio = input => {
  const originalProfile=input.profile;
  let effectiveProfile={...originalProfile};
  let plan=planGoalAllocations({...input,profile:effectiveProfile});
  let passes=1;
  let adjustments=allocationChanges(plan);
  let bufferAdjusted=false;
  if(!plan.minimumFeasible&&originalProfile.utilizationPreference==='balanced'&&passes<MAX_OPTIMIZATION_PASSES){
    effectiveProfile={...originalProfile,optimizationUtilization:0.9};
    plan=planGoalAllocations({...input,profile:effectiveProfile});
    passes++;bufferAdjusted=true;
    adjustments.push({field:'bufferPercent',before:15,after:10,reason:'Reduced the temporary planning buffer within the safe 90% utilization limit.'});
  }
  return {plan,effectiveProfile,passes,maxPasses:MAX_OPTIMIZATION_PASSES,wasAdjusted:adjustments.length>0,adjustments,bufferAdjusted,
    originalBufferPercent:100-utilizationPercent(originalProfile),effectiveBufferPercent:bufferAdjusted?10:100-utilizationPercent(originalProfile),
    status:plan.minimumFeasible?(adjustments.length?'ADJUSTED_FEASIBLE':'FEASIBLE'):'NOT_FEASIBLE'};
};

module.exports={MAX_OPTIMIZATION_PASSES,optimizePortfolio,allocationChanges};