import React, { createContext, useState, useContext } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Zap, CheckCircle2, AlertTriangle, XCircle, Info, X, Trophy } from 'lucide-react';
import { impactIconEntrance, shakeZoomImpact } from '../lib/motion';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const reducedMotion = useReducedMotion();
  const mobileImpact = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
  const removeToast = id => setToasts(prev => prev.filter(toast => toast.id !== id));
  const addToast = (message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), duration);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-3 px-4">
        {toasts.map(toast => {
          const isMajor = toast.type === 'major';
          return <motion.div
            key={toast.id}
            {...(isMajor ? shakeZoomImpact({ mobile: mobileImpact, reducedMotion }) : {})}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-md ${isMajor || toast.type === 'rescue' || toast.type === 'electric'
              ? 'border-orange-500/50 bg-white text-orange-700 shadow-orange-900/30 dark:bg-slate-900/90 dark:text-orange-200'
              : toast.type === 'success' ? 'border-emerald-500/50 bg-white text-emerald-700 shadow-emerald-900/30 dark:bg-slate-900/90 dark:text-emerald-200'
              : toast.type === 'warning' ? 'border-amber-500/50 bg-white text-amber-700 shadow-amber-900/30 dark:bg-slate-900/90 dark:text-amber-200'
              : toast.type === 'error' ? 'border-red-500/50 bg-white text-red-700 shadow-red-900/30 dark:bg-slate-900/90 dark:text-red-200'
              : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200'}`}
            role={isMajor ? 'status' : undefined}
          >
            <div className="flex items-center gap-3">
              {isMajor ? <motion.span {...impactIconEntrance(reducedMotion)}><Trophy className="h-5 w-5 text-orange-500" /></motion.span>
                : toast.type === 'rescue' || toast.type === 'electric' ? <Zap className="h-5 w-5 text-orange-500" />
                : toast.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                : toast.type === 'warning' ? <AlertTriangle className="h-5 w-5 text-amber-400" />
                : toast.type === 'error' ? <XCircle className="h-5 w-5 text-red-400" />
                : <Info className="h-5 w-5 text-orange-500" />}
              <span className="text-base font-medium leading-6">{toast.message}</span>
            </div>
            <button onClick={() => removeToast(toast.id)} aria-label="Dismiss notification" className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-4 w-4" /></button>
          </motion.div>;
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);