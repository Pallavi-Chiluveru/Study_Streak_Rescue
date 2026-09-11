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
    <div className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-[0_4px_14px_rgba(15,23,42,0.06)] ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center mb-4 animate-float shadow-lg shadow-orange-900/10">
        <Icon className="w-8 h-8 text-orange-500 animate-lightning" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">{description}</p>
      {onAction && actionLabel && (
        <ElectricButton variant="primary" icon={Plus} onClick={onAction}>
          {actionLabel}
        </ElectricButton>
      )}
    </div>
  );
};

export default EmptyState;
