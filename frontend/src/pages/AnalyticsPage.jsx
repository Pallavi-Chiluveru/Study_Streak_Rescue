import AdaptivePaceCard from '../components/AdaptivePaceCard';
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BarChart3, CheckCircle2, AlertTriangle, Clock, Flame, ShieldCheck, Zap, RefreshCw } from 'lucide-react';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import ElectricCard from '../components/ui/ElectricCard';
import { useTheme } from '../context/ThemeContext';

const AnalyticsPage = () => {
  const { addToast } = useToast();
  const { isDark } = useTheme();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await API.get('/analytics');
        setAnalytics(res.data);
      } catch (error) {
        console.error('Fetch analytics error:', error);
        addToast('Failed to load analytics', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Zap className="w-10 h-10 text-orange-400 animate-lightning mx-auto mb-3" />
        <p className="font-mono text-xs">Loading analytics data...</p>
      </div>
    );
  }

  const overview = analytics?.overview || {};
  const weeklyData = analytics?.weeklyData || [];
  const planProgressData = analytics?.planProgressData || [];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Performance Analytics</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">Track your consistency, focus sessions, and plan recovery history.</p>
      </div>

      <AdaptivePaceCard pace={analytics?.learningPace} />
      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <ElectricCard>
          <div className="text-[11px] font-semibold uppercase text-slate-700 dark:text-slate-400 mb-1">Tasks Completed</div>
          <div className="text-2xl font-extrabold text-emerald-400">{overview.tasksCompleted || 0}</div>
        </ElectricCard>

        <ElectricCard>
          <div className="text-[11px] font-semibold uppercase text-slate-700 dark:text-slate-400 mb-1">Tasks Missed</div>
          <div className="text-2xl font-extrabold text-red-400">{overview.tasksMissed || 0}</div>
        </ElectricCard>

        <ElectricCard>
          <div className="text-[11px] font-semibold uppercase text-slate-700 dark:text-slate-400 mb-1">Total Focus Time</div>
          <div className="text-2xl font-extrabold text-orange-300">{overview.focusHours || 0}h</div>
        </ElectricCard>

        <ElectricCard>
          <div className="text-[11px] font-semibold uppercase text-slate-700 dark:text-slate-400 mb-1">Current Streak</div>
          <div className="text-2xl font-extrabold text-orange-400">{overview.currentStreak || 0}d</div>
        </ElectricCard>

        <ElectricCard>
          <div className="text-[11px] font-semibold uppercase text-slate-700 dark:text-slate-400 mb-1">Completion %</div>
          <div className="text-2xl font-extrabold text-orange-400">{overview.overallPlanCompletion || 0}%</div>
        </ElectricCard>

        <ElectricCard>
          <div className="text-[11px] font-semibold uppercase text-slate-700 dark:text-slate-400 mb-1">Plans Rescued ⚡</div>
          <div className="text-2xl font-extrabold text-yellow-300">{overview.rescuedPlans || 0}</div>
        </ElectricCard>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Task Completion Chart */}
        <ElectricCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-400" />
              Weekly Task Completion
            </h3>
            <span className="text-xs font-mono text-slate-500">Last 7 Days</span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid stroke={isDark ? '#334155' : '#CBD5E1'} strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke={isDark ? '#94a3b8' : '#475569'} fontSize={12} tickLine={false} />
                <YAxis stroke={isDark ? '#94a3b8' : '#475569'} fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#334155' : '#CBD5E1', borderRadius: '12px' }}
                  itemStyle={{ color: isDark ? '#38bdf8' : '#0f172a' }}
                  labelStyle={{ color: isDark ? '#cbd5e1' : '#0f172a' }}
                />
                <Bar dataKey="completed" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ElectricCard>

        {/* Plan Progress & Health Scores Chart */}
        <ElectricCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-400 animate-lightning" />
              Plan Health & Completion %
            </h3>
            <span className="text-xs font-mono text-slate-500">All Active Plans</span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planProgressData}>
                <CartesianGrid stroke={isDark ? '#334155' : '#CBD5E1'} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#475569'} fontSize={11} tickLine={false} />
                <YAxis stroke={isDark ? '#94a3b8' : '#475569'} fontSize={12} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#334155' : '#CBD5E1', borderRadius: '12px' }}
                  labelStyle={{ color: isDark ? '#cbd5e1' : '#0f172a' }}
                />
                <Bar dataKey="progress" fill="#06b6d4" name="Progress %" radius={[4, 4, 0, 0]} />
                <Bar dataKey="health" fill="#10b981" name="Health Score" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ElectricCard>
      </div>
    </div>
  );
};

export default AnalyticsPage;
