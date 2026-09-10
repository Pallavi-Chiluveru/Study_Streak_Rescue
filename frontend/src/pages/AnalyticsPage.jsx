import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { BarChart3, CheckCircle2, AlertTriangle, Clock, Flame, ShieldCheck, Zap, RefreshCw } from 'lucide-react';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import ElectricCard from '../components/ui/ElectricCard';

const AnalyticsPage = () => {
  const { addToast } = useToast();
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
        <h2 className="text-2xl font-extrabold text-white">Performance Analytics</h2>
        <p className="text-xs text-slate-400">Track your consistency, focus sessions, and plan recovery history.</p>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <ElectricCard>
          <div className="text-[11px] font-semibold uppercase text-slate-400 mb-1">Tasks Completed</div>
          <div className="text-2xl font-extrabold text-emerald-400">{overview.tasksCompleted || 0}</div>
        </ElectricCard>

        <ElectricCard>
          <div className="text-[11px] font-semibold uppercase text-slate-400 mb-1">Tasks Missed</div>
          <div className="text-2xl font-extrabold text-red-400">{overview.tasksMissed || 0}</div>
        </ElectricCard>

        <ElectricCard>
          <div className="text-[11px] font-semibold uppercase text-slate-400 mb-1">Total Focus Time</div>
          <div className="text-2xl font-extrabold text-orange-300">{overview.focusHours || 0}h</div>
        </ElectricCard>

        <ElectricCard>
          <div className="text-[11px] font-semibold uppercase text-slate-400 mb-1">Current Streak</div>
          <div className="text-2xl font-extrabold text-orange-400">{overview.currentStreak || 0}d</div>
        </ElectricCard>

        <ElectricCard>
          <div className="text-[11px] font-semibold uppercase text-slate-400 mb-1">Completion %</div>
          <div className="text-2xl font-extrabold text-orange-400">{overview.overallPlanCompletion || 0}%</div>
        </ElectricCard>

        <ElectricCard>
          <div className="text-[11px] font-semibold uppercase text-slate-400 mb-1">Plans Rescued ⚡</div>
          <div className="text-2xl font-extrabold text-yellow-300">{overview.rescuedPlans || 0}</div>
        </ElectricCard>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Task Completion Chart */}
        <ElectricCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-400" />
              Weekly Task Completion
            </h3>
            <span className="text-xs font-mono text-slate-500">Last 7 Days</span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Bar dataKey="completed" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ElectricCard>

        {/* Plan Progress & Health Scores Chart */}
        <ElectricCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-400 animate-lightning" />
              Plan Health & Completion %
            </h3>
            <span className="text-xs font-mono text-slate-500">All Active Plans</span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planProgressData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
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
