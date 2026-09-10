import React, { createContext, useState, useContext } from 'react';
import { Zap, CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full px-4 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0 backdrop-blur-md ${
              t.type === 'rescue' || t.type === 'electric'
                ? 'bg-white dark:bg-slate-900/90 border-orange-500/50 text-orange-700 dark:text-orange-200 shadow-orange-900/30 animate-electric-pulse'
                : t.type === 'success'
                ? 'bg-white dark:bg-slate-900/90 border-emerald-500/50 text-emerald-700 dark:text-emerald-200 shadow-emerald-900/30'
                : t.type === 'warning'
                ? 'bg-white dark:bg-slate-900/90 border-amber-500/50 text-amber-700 dark:text-amber-200 shadow-amber-900/30'
                : t.type === 'error'
                ? 'bg-white dark:bg-slate-900/90 border-red-500/50 text-red-700 dark:text-red-200 shadow-red-900/30'
                : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {t.type === 'rescue' || t.type === 'electric' ? (
                <Zap className="w-5 h-5 text-orange-500 animate-lightning" />
              ) : t.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : t.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : t.type === 'error' ? (
                <XCircle className="w-5 h-5 text-red-400" />
              ) : (
                <Info className="w-5 h-5 text-orange-500" />
              )}
              <span className="text-sm font-medium">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
