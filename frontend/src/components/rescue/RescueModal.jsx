import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Zap, ShieldCheck, RefreshCw, Calendar, Clock, CheckCircle2, ArrowLeft, ArrowRight, X } from 'lucide-react';
import ElectricButton from '../ui/ElectricButton';
import API from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import darkModeLogo from '../../assets/darkmodelogo.png';
import whiteModeLogo from '../../assets/whitemodelogo.png';
import { energySweep, impactIconEntrance, impactReveal, shakeZoomImpact } from '../../lib/motion';

const RescueModal = ({ plan, tasks = [], isOpen, onClose, onRescueComplete }) => {
  const [step, setStep] = useState(1); // 1: Overview, 2: Select Time, 3: Animate, 4: Success
  const [selectedHours, setSelectedHours] = useState(plan?.availableMinutesPerDay ? Math.round(plan.availableMinutesPerDay / 60) : 2);
  const [customMinutes, setCustomMinutes] = useState('');
  const [animatingMessage, setAnimatingMessage] = useState('Protecting completed tasks...');
  const [rescueResult, setRescueResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { theme } = useTheme();
  const logo = theme === 'dark' ? darkModeLogo : whiteModeLogo;
  const reducedMotion = useReducedMotion();
  const mobileImpact = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;

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
    <div className="modal-surface fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/35 p-4 backdrop-blur-[2px] animate-fade-in dark:bg-black/60">
      <div className="relative w-[92%] max-w-2xl rounded-3xl border border-orange-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)] dark:border-orange-500/30 dark:bg-slate-900 dark:shadow-2xl dark:shadow-red-950/40 sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <X className="h-5 w-5" />
        </button>

        {/* STEP 1: Overview of Slipping Schedule */}
        {step === 1 && (
          <div>
            <div className="mb-5 flex items-center gap-4 pr-12">
              <img src={logo} alt="Study Streak Rescue" className="h-14 w-14 shrink-0 rounded-2xl object-contain shadow-lg shadow-orange-500/20" />
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Let's Fix Your Plan</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Intelligent automatic catch-up scheduling</p>
              </div>
            </div>

            <p className="mb-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              Study Streak Rescue protects your completed tasks and redistributes remaining work across your remaining deadline.
            </p>

            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</div>
                <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">Completed</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-500/20 dark:bg-amber-500/10">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{remainingCount}</div>
                <div className="text-[11px] font-medium text-amber-800 dark:text-amber-300">Remaining</div>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-500/20 dark:bg-red-500/10">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{missedCount}</div>
                <div className="text-[11px] font-medium text-red-700 dark:text-red-300">Missed</div>
              </div>
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center dark:border-orange-500/20 dark:bg-orange-500/10">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{daysRemaining}</div>
                <div className="text-[11px] font-medium text-orange-800 dark:text-orange-300">Days Left</div>
              </div>
            </div>

            {typeof plan.healthScore === 'number' && (
              <p className="mb-5 text-sm font-semibold text-red-600 dark:text-red-400">
                Current Plan Health: {plan.healthScore}% <span className="font-normal text-slate-600 dark:text-slate-400">— Rescue Recommended</span>
              </p>
            )}

            <div className="flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={onClose} className="inline-flex h-11 min-w-[100px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                <X className="h-4 w-4 shrink-0" />
                Cancel
              </button>
              <ElectricButton variant="primary" size="md" icon={Zap} onClick={() => setStep(2)} className="h-11 min-w-[170px] rounded-xl px-5 shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/25 whitespace-nowrap">
                Continue Rescue
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
                  className={`p-4 rounded-2xl border text-center transition-all ${selectedHours === hrs && !customMinutes
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

            <div className="flex flex-col items-stretch justify-between gap-3 pt-2 sm:flex-row sm:items-center">
              <ElectricButton variant="secondary" size="md" icon={ArrowLeft} onClick={() => setStep(1)} className="h-11 px-4 text-sm">
                Back
              </ElectricButton>
              <ElectricButton variant="rescueCompact" size="md" icon={Zap} onClick={handleStartRescueAnimation} className="h-11 min-w-[210px] rounded-xl px-5 text-sm font-semibold shadow-md shadow-orange-500/20 transition-all duration-200 hover:shadow-orange-500/30">
                Rebuild My Schedule
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
          <motion.section
            {...shakeZoomImpact({ mobile: mobileImpact, reducedMotion })}
            className="relative overflow-hidden rounded-3xl border border-orange-400/40 bg-gradient-to-br from-orange-500/10 via-transparent to-amber-400/10 px-4 py-6 text-center shadow-[0_0_34px_rgba(249,115,22,0.20)] sm:px-6"
            aria-live="polite"
          >
            <motion.div {...energySweep(reducedMotion)} aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-amber-200/40 to-transparent blur-sm" />
            <motion.div {...impactIconEntrance(reducedMotion)} className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-orange-300 bg-orange-500/15 shadow-xl shadow-orange-500/20">
              <CheckCircle2 className="h-9 w-9 text-orange-500" aria-hidden="true" />
            </motion.div>
            <h2 className="mb-1 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">PLAN RESCUED</h2>
            <p className="mb-1 text-base font-semibold text-orange-600 dark:text-orange-300">{rescueResult?.rescheduledCount || remainingCount} tasks redistributed</p>
            <p className="mx-auto mb-6 max-w-md text-sm text-slate-600 dark:text-slate-300">Your updated schedule now fits your available study time.</p>
            <motion.div {...impactReveal(reducedMotion)} className="mb-6 grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-3.5 dark:border-slate-700 dark:bg-slate-900/80"><div className="text-xs text-slate-500">Rescheduled</div><div className="text-xl font-bold text-slate-950 dark:text-white">{rescueResult?.rescheduledCount || remainingCount} Tasks</div></div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-3.5 dark:border-slate-700 dark:bg-slate-900/80"><div className="text-xs text-slate-500">Days Left</div><div className="text-xl font-bold text-orange-500">{rescueResult?.daysRemaining || daysRemaining} Days</div></div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-3.5 dark:border-slate-700 dark:bg-slate-900/80"><div className="text-xs text-slate-500">Daily Target</div><div className="text-xl font-bold text-orange-500">{Math.round((rescueResult?.dailyTargetMinutes || selectedHours * 60) / 60)}h / day</div></div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-3.5 dark:border-slate-700 dark:bg-slate-900/80"><div className="text-xs text-slate-500">New Health</div><div className="text-xl font-bold text-emerald-500">{rescueResult?.newHealthScore || 86}%</div></div>
            </motion.div>
            <ElectricButton variant="primary" size="lg" icon={ArrowRight} fullWidth onClick={onClose}>View Updated Schedule</ElectricButton>
          </motion.section>
        )}
      </div>
    </div>
  );
};

export default RescueModal;
