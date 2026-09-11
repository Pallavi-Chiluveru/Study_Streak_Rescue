import React from 'react';

const NotificationDropdown = () => {
    return (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-2 font-semibold text-slate-900 dark:border-slate-800 dark:text-white">
                <span>Notifications</span>
                <span className="font-mono text-[10px] text-orange-500">Live AI Engine</span>
            </div>
            <div className="space-y-2">
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-2.5 text-orange-800 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">
                    <p className="font-semibold text-orange-600 dark:text-orange-300">⚡ Adaptive Scheduling Ready</p>
                    <p className="mt-0.5 text-[11px] opacity-80">If you ever miss a task, click Rescue My Plan to recover instantly.</p>
                </div>
            </div>
        </div>
    );
};

export default NotificationDropdown;