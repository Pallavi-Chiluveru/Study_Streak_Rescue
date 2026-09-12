import React, { useState } from 'react';
import { Flame, Zap, Plus } from 'lucide-react';
import { useAuth } from '../../context/authContext.js';
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
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)] backdrop-blur-md transition-colors duration-300 dark:border-slate-800/80 dark:bg-slate-950/80 dark:shadow-none">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
          Good Day, {user?.name ? user.name.split(' ')[0] : 'Learner'} 👋
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 md:text-base">Let's keep your study momentum alive.</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Streak Badge */}
        <div className="hidden h-10 items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 text-sm font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300 md:h-11 sm:flex">
          <Flame className="w-4 h-4 text-orange-500 dark:text-orange-400 fill-orange-400 animate-bounce" />
          <span>{user?.streak || 0} Day Streak</span>
        </div>

        {/* Quick XP Badge */}
        <div className="hidden h-10 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 md:h-11 sm:flex">
          <Zap className="w-4 h-4 text-orange-500 animate-lightning" />
          <span>{user?.xp || 0} XP</span>
        </div>

        {/* Create Plan Button */}
        <ElectricButton
          variant="primary"
          size="md"
          onClick={() => navigate('/plans/new')}
          icon={Plus}
          className="h-10 text-sm md:h-11 md:text-base"
        >
          New Plan
        </ElectricButton>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative">
            <NotificationButton
              isOpen={activeMenu === 'notifications'}
              onToggle={() => setActiveMenu((menu) => menu === 'notifications' ? null : 'notifications')}
            />
            {activeMenu === 'notifications' && <NotificationDropdown onClose={() => setActiveMenu(null)} />}
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
