import React from 'react';
import { Plus, Zap } from 'lucide-react';
import ElectricButton from './ElectricButton';

const EmptyState = ({
  icon: Icon = Zap,
  title = "No Plans Yet",
  description = "Ready to start your momentum? Let's create your self-healing plan.",
  actionLabel = "Create Your First Plan",
  onAction,
  className = ""
}) => {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-[0_4px_16px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center mb-4 animate-float shadow-lg shadow-orange-900/10">
        <Icon className="w-8 h-8 text-orange-500 animate-lightning" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mb-6 max-w-md text-base text-slate-600 dark:text-slate-400">{description}</p>
      {onAction && actionLabel && (
        <ElectricButton variant="primary" icon={Plus} onClick={onAction}>
          {actionLabel}
        </ElectricButton>
      )}
    </div>
  );
};

export default EmptyState;
