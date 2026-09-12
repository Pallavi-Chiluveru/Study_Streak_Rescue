import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import ElectricButton from './ElectricButton';

const ConfirmModal = ({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onCancel}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <p className="mb-6 text-base leading-7 text-slate-600 dark:text-slate-300">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <ElectricButton variant="secondary" size="md" icon={X} onClick={onCancel}>
            {cancelLabel}
          </ElectricButton>
          <ElectricButton variant={variant} size="md" icon={CheckCircle2} onClick={onConfirm}>
            {confirmLabel}
          </ElectricButton>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
