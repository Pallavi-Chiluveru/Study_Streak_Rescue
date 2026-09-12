const { evaluateAllUsers } = require('./notificationEvaluationService');
let running = false;
let timer;
const run = async () => {
  if (running) return;
  running = true;
  try { await evaluateAllUsers(); }
  catch { console.error('Scheduled notification evaluation failed.'); }
  finally { running = false; }
};
const startNotificationScheduler = () => {
  if (timer) return timer;
  setTimeout(run, 30000).unref();
  timer = setInterval(run, 60 * 60 * 1000);
  timer.unref();
  return timer;
};
module.exports = { run, startNotificationScheduler };