import React from 'react';
import { Bell } from 'lucide-react';

const NotificationButton = ({ isOpen, onToggle }) => {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={isOpen ? 'Close notifications' : 'Open notifications'}
            aria-expanded={isOpen}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:border-orange-300 hover:text-orange-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-orange-500/30 dark:hover:text-orange-400"
        >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-400 animate-ping" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500" />
        </button>
    );
};

export default NotificationButton;