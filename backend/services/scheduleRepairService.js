const Plan = require('../models/Plan');
const Task = require('../models/Task');
const { formatDateKey, getStartOfDay } = require('../utils/dateUtils');

const repairStartDateBounds = async ({ apply = false } = {}) => {
  const plans = await Plan.find({ status: { $in: ['active','at_risk','rescue_needed'] } }).select('_id startDate deadline');
  let inspected=0, repairable=0, repaired=0;
  for(const plan of plans){
    const tasks=await Task.find({planId:plan._id,status:{$in:['pending','active','missed','rescheduled']}});
    const startKey=formatDateKey(plan.startDate), deadlineKey=formatDateKey(plan.deadline);
    for(const task of tasks){
      inspected++;
      const semanticKey=formatDateKey(task.scheduledDate);
      const repairedKey=semanticKey<startKey?startKey:semanticKey>deadlineKey?deadlineKey:semanticKey;
      const storageKey=task.scheduledDate.toISOString().slice(0,10);
      if(storageKey===repairedKey) continue;
      repairable++;
      if(apply){
        await Task.updateOne({_id:task._id,status:task.status},{$set:{scheduledDate:getStartOfDay(repairedKey),status:task.status==='missed'&&repairedKey>=formatDateKey(new Date())?'pending':task.status}});
        repaired++;
      }
    }
  }
  return {inspected,repairable,repaired,dryRun:!apply};
};
module.exports={repairStartDateBounds};