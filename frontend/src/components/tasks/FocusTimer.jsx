import React, { useState, useEffect } from 'react';
import { Play, Pause, CheckCircle2, X, Zap } from 'lucide-react';
import ElectricButton from '../ui/ElectricButton';

const FocusTimer = ({ task, isOpen, onClose, onCompleteTask }) => {
  const totalSeconds = (task?.estimatedMinutes || 45) * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (task) {
      setSecondsLeft((task.estimatedMinutes || 45) * 60);
      setIsActive(true);
    }
  }, [task]);

  useEffect(() => {
    let interval = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);

  if (!isOpen || !task) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference - (circumference * progress) / 100;

  const handleFinish = () => {
    const elapsedMinutes = Math.max(1, Math.round((totalSeconds - secondsLeft) / 60));
    if (onCompleteTask) {
      onCompleteTask(task, elapsedMinutes);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900/90 border border-orange-500/40 rounded-3xl p-8 shadow-2xl shadow-orange-950/50 text-center animate-border-flow">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full border border-slate-800 bg-slate-950/60"
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
          <p className="text-xs text-slate-400 mt-1">Target duration: {task.estimatedMinutes} mins</p>
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
              {isActive ? '⚡ Deep Focus' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Timer Control Buttons */}
        <div className="flex items-center justify-center gap-4">
          <ElectricButton
            variant={isActive ? 'secondary' : 'primary'}
            size="lg"
            onClick={() => setIsActive(!isActive)}
          >
            {isActive ? <Pause className="w-5 h-5 text-amber-400" /> : <Play className="w-5 h-5 text-emerald-400" />}
            <span>{isActive ? 'Pause' : 'Resume'}</span>
          </ElectricButton>

          <ElectricButton
            variant="success"
            size="lg"
            onClick={handleFinish}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Complete Session</span>
          </ElectricButton>
        </div>
      </div>
    </div>
  );
};

export default FocusTimer;
