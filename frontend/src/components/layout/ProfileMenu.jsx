import React, { useEffect, useRef } from 'react';
import { LogOut, Settings, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authContext.js';

const ProfileMenu = ({ isOpen, onToggle, onClose }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const menuRef = useRef(null);
    const initial = user?.name?.charAt(0)?.toUpperCase() || 'U';
    const role = user?.role || 'Student';

    useEffect(() => {
        if (!isOpen) return undefined;

        const handlePointerDown = (event) => {
            if (!menuRef.current?.contains(event.target)) {
                onClose();
            }
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    const navigateTo = (path) => {
        onClose();
        navigate(path);
    };

    const handleLogout = () => {
        logout();
        onClose();
        navigate('/login');
    };

    return (
        <div ref={menuRef} className="relative">
            <button
                type="button"
                onClick={onToggle}
                aria-label="Open profile menu"
                aria-expanded={isOpen}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-white font-bold text-orange-700 transition-colors hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 dark:border-orange-500/30 dark:bg-slate-900 dark:text-orange-400 dark:hover:bg-orange-500/10 md:h-11 md:w-11"
            >
                {initial}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-2 text-sm shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <div className="px-3 py-2.5">
                        <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{user?.name || 'Learner'}</p>
                        <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user?.email || 'No email available'}</p>
                        <span className="mt-2 inline-flex rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
                            {role}
                        </span>
                    </div>

                    <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                    <button type="button" onClick={() => navigateTo('/profile')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-700 dark:text-slate-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-400">
                        <UserRound className="h-4 w-4" />
                        Profile
                    </button>
                    <button type="button" onClick={() => navigateTo('/settings')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-700 dark:text-slate-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-400">
                        <Settings className="h-4 w-4" />
                        Settings
                    </button>
                    <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                    <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProfileMenu;