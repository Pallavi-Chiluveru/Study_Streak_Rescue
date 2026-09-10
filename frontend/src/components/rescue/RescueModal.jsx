import React, { useState } from 'react';
import { Zap, ShieldCheck, RefreshCw, Calendar, Clock, CheckCircle2, ArrowRight, X } from 'lucide-react';
import ElectricButton from '../ui/ElectricButton';
import API from '../../services/api';
import { useToast } from '../../context/ToastContext';

const RescueModal = ({ plan, tasks = [], isOpen, onClose, onRescueComplete }) => {
  const [step, setStep] = useState(1); // 1: Overview, 2: Select Time, 3: Animate, 4: Success
  const [selectedHours, setSelectedHours] = useState(plan?.availableMinutesPerDay ? Math.round(plan.availableMinutesPerDay / 60) : 2);
  const [customMinutes, setCustomMinutes] = useState('');
  const [animatingMessage, setAnimatingMessage] = useState('Protecting completed tasks...');
  const [rescueResult, setRescueResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  if (!isOpen || !plan) return null;

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const missedCount = tasks.filter(t => t.status === 'missed').length;
  const remainingCount = tasks.filter(t => t.status !== 'completed').length;

  // Calculate days remaining
  const now = new Date();
  const deadline = new Date(plan.deadline);
  const diffTime = deadline.getTime() - now.getTime();
  const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const handleStartRescueAnimation = async () => {
    setStep(3);
    setLoading(true);

    const availableMinutes = customMinutes ? parseInt(customMinutes) * 60 : selectedHours * 60;

    const messages = [
      'Protecting completed tasks...',
      'Collecting unfinished work...',
      'Checking remaining time...',
      'Prioritizing important topics...',
      'Rebalancing your schedule...',
      'Rebuilding your timeline...'
    ];

    // Sequence messages with electric animation
    for (let i = 0; i < messages.length; i++) {
      setAnimatingMessage(messages[i]);
      await new Promise(r => setTimeout(r, 600));
    }

    try {
      const res = await API.post(`/plans/${plan._id}/rescue`, {
        updatedAvailableMinutesPerDay: availableMinutes
      });

      setRescueResult(res.data);
      setStep(4);
      addToast('⚡ Plan rescued! You are back on track.', 'rescue');
      if (onRescueComplete) onRescueComplete(res.data);
    } catch (error) {
      console.error('Rescue Error:', error);
      addToast(error.response?.data?.message || 'Rescue operation failed', 'error');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-red-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-950/40">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full border border-slate-800 bg-slate-950/60"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: Overview of Slipping Schedule */}
        {step === 1 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center shadow-lg shadow-red-900/50 animate-rescue-pulse">
                <Zap className="w-6 h-6 text-white animate-lightning" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white">Let's Fix Your Plan</h3>
                <p className="text-xs text-slate-400">Intelligent automatic catch-up scheduling</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-6">
              Don't panic. Study Streak Rescue protects your completed tasks and redistributes remaining work across your remaining deadline.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-center">
                <div className="text-xl font-bold text-emerald-400">{completedCount}</div>
                <div className="text-[11px] text-slate-400 font-medium">Completed</div>
              </div>
              <div className="p-3 rounded-xl bg-orange-950/30 border border-orange-500/30 text-center">
                <div className="text-xl font-bold text-orange-300">{remainingCount}</div>
                <div className="text-[11px] text-slate-400 font-medium">Remaining</div>
              </div>
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-center animate-pulse">
                <div className="text-xl font-bold text-red-400">{missedCount}</div>
                <div className="text-[11px] text-red-300 font-medium">Missed</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
                <div className="text-xl font-bold text-orange-400">{daysRemaining}</div>
                <div className="text-[11px] text-slate-400 font-medium">Days Left</div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <ElectricButton variant="secondary" onClick={onClose}>
                Cancel
              </ElectricButton>
              <ElectricButton variant="rescue" onClick={() => setStep(2)}>
                Continue Rescue <ArrowRight className="w-4 h-4 ml-1" />
              </ElectricButton>
            </div>
          </div>
        )}

        {/* STEP 2: Ask for Realistic Time Commitment */}
        {step === 2 && (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold mb-2">
                <Clock className="w-3.5 h-3.5" />
                Capacity Re-alignment
              </div>
              <h3 className="text-xl font-extrabold text-white">How much time can you give daily?</h3>
              <p className="text-xs text-slate-400 mt-1">Be realistic so your new schedule is achievable without burnout.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[1, 2, 3, 4].map((hrs) => (
                <button
                  key={hrs}
                  onClick={() => {
                    setSelectedHours(hrs);
                    setCustomMinutes('');
                  }}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    selectedHours === hrs && !customMinutes
                      ? 'bg-gradient-to-br from-orange-600/30 to-amber-600/20 border-orange-400 text-white shadow-lg shadow-orange-950/50 scale-105'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <div className="text-2xl font-bold text-white">{hrs}h</div>
                  <div className="text-[11px] text-slate-400 font-medium">per day</div>
                </button>
              ))}
            </div>

            <div className="mb-8">
              <label className="block text-xs font-medium text-slate-400 mb-2">Or Enter Custom Hours Per Day:</label>
              <input
                type="number"
                min="0.5"
                max="12"
                placeholder="e.g. 2.5"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-orange-400 text-sm"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <ElectricButton variant="secondary" onClick={() => setStep(1)}>
                Back
              </ElectricButton>
              <ElectricButton variant="rescue" onClick={handleStartRescueAnimation}>
                ⚡ Rebuild My Schedule
              </ElectricButton>
            </div>
          </div>
        )}

        {/* STEP 3: Animated Electric Rescheduling State */}
        {step === 3 && (
          <div className="py-8 text-center">
            <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-red-600 via-orange-500 to-orange-600 animate-spin blur-md opacity-70" />
              <div className="relative w-24 h-24 rounded-full bg-slate-950 border-2 border-orange-400 flex items-center justify-center shadow-2xl">
                <Zap className="w-12 h-12 text-yellow-300 animate-lightning" />
              </div>
            </div>

            <h3 className="text-2xl font-black text-white tracking-wide mb-2 animate-pulse">
              ⚡ RESCUING YOUR PLAN
            </h3>
            <p className="text-sm text-orange-300 font-mono font-medium tracking-wide">
              {animatingMessage}
            </p>
          </div>
        )}

        {/* STEP 4: Rescue Success Screen */}
        {step === 4 && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 mx-auto flex items-center justify-center mb-4 shadow-xl shadow-emerald-950/50 animate-bounce">
              <Zap className="w-8 h-8 text-yellow-300 fill-yellow-300" />
            </div>

            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-1">
              ⚡ PLAN RESCUED
            </h2>
            <p className="text-sm text-emerald-400 font-medium mb-6">
              You're back on track! Unfinished tasks are redistributed.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-left">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">Rescheduled</div>
                <div className="text-xl font-bold text-white">{rescueResult?.rescheduledCount || remainingCount} Tasks</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">Days Left</div>
                <div className="text-xl font-bold text-orange-400">{rescueResult?.daysRemaining || daysRemaining} Days</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">Daily Target</div>
                <div className="text-xl font-bold text-orange-300">
                  {Math.round((rescueResult?.dailyTargetMinutes || selectedHours * 60) / 60)}h / day
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">New Health</div>
                <div className="text-xl font-bold text-emerald-400">{rescueResult?.newHealthScore || 86}%</div>
              </div>
            </div>

            <ElectricButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={onClose}
            >
              View New Schedule ⚡
            </ElectricButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default RescueModal;
