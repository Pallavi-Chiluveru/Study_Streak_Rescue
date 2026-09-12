import { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCircle2, X, Zap } from 'lucide-react';
import ElectricButton from '../ui/ElectricButton';
import API from '../../services/api';
import { getEffectiveEstimatedMinutes } from '../../utils/taskEstimates';
import { elapsedFocusMs, pauseFocusClock, resumeFocusClock } from '../../utils/focusClock';

const FocusTimer = ({ task, isOpen, onClose, onCompleteTask }) => {
  const totalSeconds = getEffectiveEstimatedMinutes(task) * 60;
  const clock = useRef({ accumulated: task?.focusAccumulatedMs || 0, since: null });
  const [elapsed, setElapsed] = useState((task?.focusAccumulatedMs || 0) / 1000);
  const [isActive, setIsActive] = useState(!!task?.focusRunningSince);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!isOpen || !task) return;
    if (task.focusRunningSince && clock.current.since === null) clock.current.since = performance.now();
    const tick = () => setElapsed(elapsedFocusMs(clock.current, performance.now()) / 1000);
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [isOpen, task]);
  useEffect(() => {
    if (!isOpen || !task || !isActive || busy) return;
    let cancelled = false;
    let pending = false;
    const interval = setInterval(async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await API.patch(`/tasks/${task._id}/heartbeat`);
        if (!cancelled) {
          clock.current = { accumulated: response.data.focusAccumulatedMs || 0, since: performance.now() };
          setError('');
        }
      } catch {
        if (!cancelled) setError('Focus connection interrupted. Reconnect to keep recording time.');
      } finally { pending = false; }
    }, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isOpen, task, isActive, busy]);
  if (!isOpen || !task) return null;
  const overtime = elapsed >= totalSeconds;
  const displaySeconds = Math.floor(Math.abs(totalSeconds - elapsed));
  const formattedTime = `${overtime ? '+' : ''}${String(Math.floor(displaySeconds / 60)).padStart(2, '0')}:${String(displaySeconds % 60).padStart(2, '0')}`;
  const progress = Math.min(100, elapsed / totalSeconds * 100);
  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference - circumference * progress / 100;
  const checkpoint = async () => {
    const response = await API.patch(`/tasks/${task._id}/pause`);
    clock.current = pauseFocusClock(clock.current, performance.now());
    clock.current.accumulated = response.data.focusAccumulatedMs || 0;
    setElapsed(clock.current.accumulated / 1000); setIsActive(false);
  };
  const act = async action => {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); }
    catch (failure) { setError(failure.response?.data?.message || 'Unable to save focus time. Please try again.'); }
    finally { setBusy(false); }
  };
  const toggle = () => act(async () => {
    if (isActive) await checkpoint();
    else {
      const response = await API.patch(`/tasks/${task._id}/start`);
      clock.current = resumeFocusClock({ accumulated: response.data.focusAccumulatedMs || 0, since: null }, performance.now());
      setIsActive(true);
    }
  });
  const close = () => act(async () => { await checkpoint(); onClose(); });
  const handleFinish = () => act(async () => {
    await checkpoint();
    const success = await onCompleteTask(task, true);
    if (success) onClose();
    else setError('Task could not be completed. Your focus time is saved; please retry.');
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900/90 border border-orange-500/40 rounded-3xl p-8 shadow-2xl shadow-orange-950/50 text-center animate-border-flow">
        {/* Close Button */}
        <button
          onClick={close}
          disabled={busy}
          aria-label="Close focus timer"
          className="absolute right-5 top-5 rounded-full border border-slate-700 bg-slate-950/60 p-2 text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Task Title Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-semibold mb-2">
            <Zap className="w-3.5 h-3.5 text-orange-400 animate-lightning" />
            Focus Session Mode
          </div>
          <h3 className="text-xl font-extrabold text-white">{task.title}</h3>
          <p className="mt-1 text-sm text-slate-300">Target duration: {getEffectiveEstimatedMinutes(task)} mins</p>
        </div>

        {/* Circular Progress Timer */}
        <div className="relative w-64 h-64 mx-auto mb-8 flex items-center justify-center">
          <svg className="w-64 h-64 transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="110"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-800"
              fill="transparent"
            />
            <circle
              cx="128"
              cy="128"
              r="110"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="text-orange-400 transition-all duration-1000 ease-linear shadow-lg"
              fill="transparent"
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-5xl font-mono font-extrabold tracking-tight text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]">
              {formattedTime}
            </span>
            <span className="text-xs uppercase font-mono tracking-widest text-orange-400 mt-2">
              {isActive ? (overtime ? 'Extra focus time' : 'Deep Focus') : 'Paused'}
            </span>
          </div>
        </div>

        <p role="alert" className="mb-3 text-sm text-red-400">{error}</p>
        {/* Timer Control Buttons */}
        <div className="flex items-center justify-center gap-4">
          <ElectricButton
            variant={isActive ? 'secondary' : 'primary'}
            size="md"
            icon={isActive ? Pause : Play}
            onClick={toggle}
            disabled={busy}
          >
            {isActive ? 'Pause' : 'Resume'}
          </ElectricButton>

          <ElectricButton
            variant="success"
            size="md"
            icon={CheckCircle2}
            onClick={handleFinish}
            disabled={busy}
          >
            Complete Session
          </ElectricButton>
        </div>
      </div>
    </div>
  );
};

export default FocusTimer;
