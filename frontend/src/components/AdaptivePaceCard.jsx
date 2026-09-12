import { formatDuration } from '../utils/duration';
export default function AdaptivePaceCard({ pace }) {
  if (!pace) return null;
  const target = pace.minSamples || 3;
  const remaining = Math.max(0, target - pace.sampleCount);
  const adjustment = pace.paceAdjustmentPercent || 0;
  return <section className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm dark:border-orange-500/20 dark:bg-slate-900 md:p-6" aria-labelledby="adaptive-heading">
    <h3 id="adaptive-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100 md:text-2xl">Adaptive Study Pace</h3>
    <p className="mt-2 text-base text-slate-600 dark:text-slate-300">{!pace.enabled ? 'Personalization is off. New plans use the original estimates; your focus history is preserved.' : !pace.active ? 'Learning your study pace...' : adjustment > 0 ? `Your plans now account for about ${adjustment}% additional study time.` : adjustment < 0 ? `Your plans now allow about ${Math.abs(adjustment)}% less time, based on your completed focus sessions.` : 'Your study pace is close to the initial estimates.'}</p>
    {!pace.active && pace.enabled && <div className="mt-4">
      <p className="mb-2 text-sm text-slate-700 dark:text-slate-300">{Math.min(pace.sampleCount, target)} / {target} focused tasks completed</p>
      <div role="progressbar" aria-label="Learning your pace" aria-valuenow={Math.min(pace.sampleCount, target)} aria-valuemin={0} aria-valuemax={target} className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300" style={{ width: `${Math.min(100, pace.sampleCount / target * 100)}%` }} />
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Complete {remaining} more focused {remaining === 1 ? 'task' : 'tasks'} with recorded time to begin personalizing durations. Unusually short or long sessions are excluded.</p>
    </div>}
    <dl className="mt-5 grid grid-cols-2 gap-5 lg:grid-cols-4">
      {[
        ['Original Estimated Time', formatDuration(pace.estimatedMinutes || 0)],
        ['Actual Focus Time', formatDuration(pace.actualMinutes || 0)],
        ['Estimate Accuracy', pace.sampleCount ? `${pace.averageEstimateAccuracy}%` : 'Learning'],
        ['Personal Pace Adjustment', pace.active ? `${adjustment > 0 ? '+' : ''}${adjustment}%` : 'Not applied']
      ].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-600 dark:text-slate-400">{label}</dt><dd className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100 md:text-3xl">{value}</dd></div>)}
    </dl>
    <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Based on {pace.sampleCount} valid completed focus tasks. Accuracy compares planned duration with recorded focus time.</p>
  </section>;
}

