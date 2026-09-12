import React from 'react';
import ElectricCard from '../components/ui/ElectricCard';
import { useAuth } from '../context/authContext.js';

const ProfilePage = () => {
    const { user } = useAuth();
    const createdAt = user?.createdAt || user?.created_at;

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Profile</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Your Study Streak Rescue account details.</p>
            </div>
            <ElectricCard className="max-w-2xl space-y-5">
                <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-2xl font-bold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name || 'Learner'}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{user?.email || 'No email available'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 sm:grid-cols-4">
                    <div><p className="text-xs text-slate-500">Role</p><p className="font-semibold text-slate-900 dark:text-slate-100">{user?.role || 'Student'}</p></div>
                    <div><p className="text-xs text-slate-500">XP</p><p className="font-semibold text-orange-600">{user?.xp || 0}</p></div>
                    <div><p className="text-xs text-slate-500">Streak</p><p className="font-semibold text-slate-900 dark:text-slate-100">{user?.streak || 0} days</p></div>
                    <div><p className="text-xs text-slate-500">Joined</p><p className="font-semibold text-slate-900 dark:text-slate-100">{createdAt ? new Date(createdAt).toLocaleDateString() : 'Not available'}</p></div>
                </div>
            </ElectricCard>
        </div>
    );
};

export default ProfilePage;