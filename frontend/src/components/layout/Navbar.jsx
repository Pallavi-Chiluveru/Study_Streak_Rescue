import React, { useState } from 'react';
import { Flame, Zap, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ElectricButton from '../ui/ElectricButton';
import ThemeToggle from '../ui/ThemeToggle';
import NotificationButton from './NotificationButton';
import NotificationDropdown from './NotificationDropdown';
import ProfileMenu from './ProfileMenu';

const Navbar = ({ onOpenMobileMenu }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState(null);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950/80 shadow-[0_1px_3px_rgba(15,23,42,0.08)] dark:shadow-none backdrop-blur-md transition-colors duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          Good Day, {user?.name ? user.name.split(' ')[0] : 'Learner'} 👋
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">Let's keep your study momentum alive.</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Streak Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-semibold">
          <Flame className="w-4 h-4 text-orange-500 dark:text-orange-400 fill-orange-400 animate-bounce" />
          <span>{user?.streak || 0} Day Streak</span>
        </div>

        {/* Quick XP Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold">
          <Zap className="w-4 h-4 text-orange-500 animate-lightning" />
          <span>{user?.xp || 0} XP</span>
        </div>

        {/* Create Plan Button */}
        <ElectricButton
          variant="primary"
          size="sm"
          onClick={() => navigate('/plans/new')}
          icon={Plus}
        >
          New Plan
        </ElectricButton>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative">
            <NotificationButton
              isOpen={activeMenu === 'notifications'}
              onToggle={() => setActiveMenu((menu) => menu === 'notifications' ? null : 'notifications')}
            />
            {activeMenu === 'notifications' && <NotificationDropdown />}
          </div>
          <ThemeToggle className="h-10 w-10 p-0" />
          <ProfileMenu
            isOpen={activeMenu === 'profile'}
            onToggle={() => setActiveMenu((menu) => menu === 'profile' ? null : 'profile')}
            onClose={() => setActiveMenu(null)}
          />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
