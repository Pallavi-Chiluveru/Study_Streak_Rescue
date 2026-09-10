import React, { useState, useEffect } from 'react';
import { Award, Zap, Flame, ShieldCheck, Trophy, CheckCircle2, Lock } from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import ElectricCard from '../components/ui/ElectricCard';

const AchievementsPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await API.get('/analytics');
        setStats(res.data.overview);
      } catch (error) {
        console.error('Fetch stats error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const tasksCompleted = stats?.tasksCompleted || 0;
  const streakDays = user?.streak || 0;
  const plansRescued = stats?.rescuedPlans || 0;

  const achievementsList = [
    {
      id: 'first_spark',
      title: 'First Spark ⚡',
      desc: 'Complete your very first task.',
      icon: Zap,
      xp: 50,
      unlocked: tasksCompleted >= 1
    },
    {
      id: 'on_fire',
      title: 'On Fire 🔥',
      desc: 'Maintain a 3-day study streak.',
      icon: Flame,
      xp: 150,
      unlocked: streakDays >= 3
    },
    {
      id: 'comeback',
      title: 'Comeback Master ⚡',
      desc: 'Rescue your first plan using ⚡ Rescue My Plan.',
      icon: ShieldCheck,
      xp: 200,
      unlocked: plansRescued >= 1
    },
    {
      id: 'consistent',
      title: 'Consistent 🏆',
      desc: 'Maintain a 7-day study streak.',
      icon: Trophy,
      xp: 300,
      unlocked: streakDays >= 7
    },
    {
      id: 'momentum_master',
      title: 'Momentum Master 💯',
      desc: 'Complete 50 tasks across all plans.',
      icon: Award,
      xp: 500,
      unlocked: tasksCompleted >= 50
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-extrabold text-white">Gamified Achievements</h2>
        <p className="text-xs text-slate-400">Unlock electric badges and boost your momentum XP.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {achievementsList.map((ach) => {
          const Icon = ach.icon;
          return (
            <ElectricCard
              key={ach.id}
              glowing={ach.unlocked}
              className={`space-y-4 ${
                ach.unlocked
                  ? 'border-orange-500/50 bg-slate-900/90 shadow-orange-950/40'
                  : 'opacity-60 bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                    ach.unlocked
                      ? 'bg-gradient-to-tr from-orange-600 to-orange-400 border-orange-400 text-white shadow-lg shadow-orange-900/50 animate-border-flow'
                      : 'bg-slate-900 border-slate-800 text-slate-600'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${ach.unlocked ? 'animate-lightning' : ''}`} />
                </div>
                <span
                  className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                    ach.unlocked
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  {ach.unlocked ? 'UNLOCKED ✅' : 'LOCKED 🔒'}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-1">{ach.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{ach.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Reward:</span>
                <span className="font-bold text-orange-400">+{ach.xp} XP</span>
              </div>
            </ElectricCard>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsPage;
