import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import API from '../../services/api';

const NotificationButton = ({ isOpen, onToggle }) => {
    const [unreadCount, setUnreadCount] = useState(0);
    useEffect(() => {
        let active = true;
        const refresh = () => API.get('/notifications', { params: { limit: 1 } })
            .then(response => { if (active) setUnreadCount(response.data.unreadCount || 0); })
            .catch(() => {});
        refresh();
        const timer = setInterval(refresh, 30 * 60 * 1000);
        window.addEventListener('notifications-updated', refresh);
        return () => {
            active = false;
            clearInterval(timer);
            window.removeEventListener('notifications-updated', refresh);
        };
    }, []);

    return (
        <button type="button" onClick={onToggle} aria-label={isOpen ? 'Close notifications' : 'Open notifications'}
            aria-expanded={isOpen}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:border-orange-300 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-orange-500/30 dark:hover:text-orange-400 md:h-11 md:w-11">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </button>
    );
};
export default NotificationButton;