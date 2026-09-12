import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Bell, CalendarDays, CheckCheck, CircleCheck, Clock3, Flame, Target, Trophy, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { warningShakeZoomImpact } from '../../lib/motion';

const icons = {
    TODAY_SCHEDULE: CalendarDays, TASK_DUE_TODAY: Clock3, TASK_DUE_SOON: Clock3,
    TASK_MISSED: AlertTriangle, MULTIPLE_TASKS_MISSED: AlertTriangle,
    PLAN_HEALTH_WARNING: AlertTriangle, PLAN_HEALTH_CRITICAL: AlertTriangle,
    GOAL_DEADLINE_SOON: Target, GOAL_DEADLINE_TOMORROW: Target, PLAN_INFEASIBLE: AlertTriangle,
    RESCUE_SUCCESS: Zap, WEEKLY_SUMMARY: CircleCheck, ACHIEVEMENT_UNLOCKED: Trophy, STREAK_UPDATED: Flame
};
const accents = {
    low: 'text-slate-500 bg-slate-100 dark:bg-slate-800',
    medium: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10',
    high: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10',
    critical: 'text-red-600 bg-red-50 dark:bg-red-500/10'
};
const relativeTime = value => {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
};

const NotificationDropdown = ({ onClose }) => {
    const navigate = useNavigate();
    const [data, setData] = useState({ items: [], unreadCount: 0 });
    const [loading, setLoading] = useState(true);
    const [impactIds, setImpactIds] = useState(() => new Set());
    const reducedMotion = useReducedMotion();
    const mobileImpact = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
    const load = async () => {
        const response = await API.get('/notifications');
        setData(response.data);
        const eligible = response.data.items.filter(item => item.impactEligible && !item.impactClaimedAt);
        const claimed = await Promise.all(eligible.map(async item => {
            const result = await API.patch('/notifications/' + item._id + '/claim-impact');
            return result.data.play ? item._id : null;
        }));
        setImpactIds(new Set(claimed.filter(Boolean)));
        setLoading(false);
    };
    useEffect(() => { load().catch(() => setLoading(false)); }, []);

    const markRead = async item => {
        if (!item.readAt) {
            await API.patch('/notifications/' + item._id + '/read');
            setData(current => ({ ...current, unreadCount: Math.max(0, current.unreadCount - 1), items: current.items.map(entry => entry._id === item._id ? { ...entry, readAt: new Date().toISOString() } : entry) }));
            window.dispatchEvent(new Event('notifications-updated'));
        }
    };
    const markAll = async () => {
        await API.patch('/notifications/read-all');
        setData(current => ({ unreadCount: 0, items: current.items.map(item => ({ ...item, readAt: item.readAt || new Date().toISOString() })) }));
        window.dispatchEvent(new Event('notifications-updated'));
    };
    const act = async item => {
        await markRead(item);
        if (item.actionMethod === 'start_early' && item.relatedTaskId) {
            await API.patch('/tasks/' + item.relatedTaskId + '/start-early');
        }
        if (item.actionUrl) navigate(item.actionUrl);
        onClose?.();
    };

    return (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><Bell className="h-4 w-4 text-orange-500" />Notifications</div>
                {data.unreadCount > 0 && <button type="button" onClick={markAll} className="text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400">Mark all as read</button>}
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-2">
                {loading ? <p className="p-5 text-center text-slate-500">Checking your plans...</p> : data.items.length === 0 ? (
                    <div className="p-6 text-center"><CircleCheck className="mx-auto h-7 w-7 text-emerald-500" /><p className="mt-2 font-semibold text-slate-800 dark:text-slate-200">You're all caught up</p><p className="mt-1 text-xs text-slate-500">New study alerts will appear here.</p></div>
                ) : data.items.map(item => {
                    const Icon = icons[item.type] || Bell;
                    const playImpact = impactIds.has(item._id);
                    return <motion.article key={item._id} {...(playImpact ? warningShakeZoomImpact({ mobile: mobileImpact, reducedMotion }) : {})} className={'relative rounded-xl p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/70 ' + (!item.readAt ? 'bg-orange-50/50 dark:bg-orange-500/5' : '')}>
                        {!item.readAt && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-orange-500" aria-label="Unread" />}
                        <div className="flex gap-3">
                            <div className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ' + (accents[item.severity] || accents.low)}><Icon className="h-4 w-4" /></div>
                            <div className="min-w-0 flex-1 pr-2">
                                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
                                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">{item.message}</p>
                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                    <time className="text-[11px] text-slate-500">{relativeTime(item.createdAt)}</time>
                                    {item.actionLabel && <button type="button" onClick={() => act(item)} className="text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400">{item.actionLabel}</button>}
                                    {!item.actionLabel && !item.readAt && <button type="button" onClick={() => markRead(item)} className="inline-flex items-center gap-1 text-xs text-slate-500"><CheckCheck className="h-3.5 w-3.5" />Read</button>}
                                </div>
                            </div>
                        </div>
                    </motion.article>;
                })}
            </div>
        </div>
    );
};
export default NotificationDropdown;