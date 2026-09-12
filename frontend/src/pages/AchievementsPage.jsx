import React, { useEffect, useState } from 'react';
import { Award, CalendarDays, CheckCircle2, Clock, Flame, ShieldCheck, Trophy, Zap } from 'lucide-react';
import API from '../services/api';
import ElectricCard from '../components/ui/ElectricCard';

const icons = { Award, CalendarDays, CheckCircle2, Clock, Flame, ShieldCheck, Trophy, Zap };
const categories = ['All', 'Progress', 'Streaks', 'Focus', 'Rescue', 'Plans', 'Early Completion'];

const ProgressBar = ({ current, target }) => (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all" style={{ width: `${Math.min(100, (current / target) * 100)}%` }} />
    </div>
);

const ChallengeCard = ({ challenge, weekly = false }) => {
    const Icon = icons[challenge.icon] || Zap;
    return (
        <ElectricCard className={`space-y-3 ${challenge.completed ? 'border-emerald-200 dark:border-emerald-500/40' : weekly ? 'border-amber-200 dark:border-amber-500/30' : 'border-orange-200 dark:border-orange-500/30'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300"><Icon className="h-5 w-5" /></div>
                    <div><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{challenge.title}</h3><p className="text-sm text-slate-600 dark:text-slate-400">{challenge.description}</p></div>
                </div>
                {challenge.completed && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />}
            </div>
            <div className="flex items-center justify-between text-sm font-semibold"><span className="text-slate-600 dark:text-slate-300">{challenge.current} / {challenge.target}</span><span className="text-orange-600 dark:text-orange-400">+{challenge.rewardXP} XP</span></div>
            <ProgressBar current={challenge.current} target={challenge.target} />
        </ElectricCard>
    );
};

const AchievementsPage = () => {
    const [data, setData] = useState(null);
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        API.get('/gamification').then((response) => setData(response.data)).catch((error) => console.error('Fetch gamification error:', error));
    }, []);

    if (!data) return <div className="py-20 text-center text-slate-600 dark:text-slate-400">Loading progression...</div>;

    const visibleAchievements = data.achievements.filter((achievement) => filter === 'All' || achievement.category === filter);
    const unlockedCount = data.achievements.filter((achievement) => achievement.unlocked).length;
    const nextLevelXP = data.level.maxXP === Infinity ? data.xp : data.level.maxXP;

    return (
        <div className="space-y-8 pb-12">
            <div><h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Gamified Achievements</h2><p className="text-base text-slate-600 dark:text-slate-400">Unlock electric badges and boost your momentum XP.</p></div>
            <ElectricCard className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-500/10 dark:to-slate-900">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">Current rank</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">Level {data.level.level} — {data.level.name}</h1><p className="mt-2 text-base text-slate-600 dark:text-slate-300">{data.xp} XP {data.level.maxXP !== Infinity && ` / ${nextLevelXP} XP`}</p></div><div className="w-full max-w-xs"><ProgressBar current={data.xp - data.level.minXP} target={data.level.maxXP === Infinity ? 1 : data.level.maxXP - data.level.minXP} /></div></div>
            </ElectricCard>
            <section><h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">Today's Challenges</h2><div className="grid gap-4 md:grid-cols-3">{data.dailyChallenges.map((challenge) => <ChallengeCard key={challenge.challengeId} challenge={challenge} />)}</div></section>
            <section><h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">This Week</h2><div className="grid gap-4 md:grid-cols-3">{data.weeklyChallenges.map((challenge) => <ChallengeCard key={challenge.challengeId} challenge={challenge} weekly />)}</div></section>
            <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Achievements <span className="text-base font-medium text-slate-500">{unlockedCount} / {data.achievements.length} Unlocked</span></h2><div className="flex flex-wrap gap-2">{categories.map((category) => <button key={category} onClick={() => setFilter(category)} className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${filter === category ? 'border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>{category}</button>)}</div></div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{visibleAchievements.map((achievement) => { const Icon = icons[achievement.metric === 'longestStreak' ? 'Flame' : achievement.category === 'Rescue' ? 'ShieldCheck' : achievement.category === 'Focus' ? 'Clock' : 'Award']; return <ElectricCard key={achievement.id} className={`space-y-4 ${achievement.unlocked ? 'border-orange-300 bg-gradient-to-br from-white to-orange-50/40 dark:border-orange-500/40 dark:from-slate-900 dark:to-orange-500/10' : ''}`}><div className="flex items-start justify-between gap-3"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${achievement.unlocked ? 'border-orange-200 bg-orange-50 text-orange-500' : 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-900'}`}><Icon className="h-6 w-6" /></div><span className={`rounded-full border px-3 py-1 text-sm font-semibold ${achievement.unlocked ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300' : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'}`}>{achievement.unlocked ? 'UNLOCKED' : 'LOCKED'}</span></div><div><h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 md:text-lg">{achievement.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{achievement.description}</p><p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{achievement.progress} / {achievement.target}</p><ProgressBar current={achievement.progress} target={achievement.target} /></div><div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm dark:border-slate-800"><span className="text-slate-600 dark:text-slate-400">Reward</span><span className="font-bold text-orange-600 dark:text-orange-400">+{achievement.rewardXP} XP</span></div></ElectricCard>; })}</div>
            </section>
        </div>
    );
};

export default AchievementsPage;
