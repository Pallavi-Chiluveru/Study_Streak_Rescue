import React from 'react';
import { useAuth } from '../../context/authContext.js';

const ProfileAvatar = () => {
    const { user } = useAuth();
    const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

    return (
        <div
            role="img"
            aria-label="Open profile"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 font-bold text-orange-700 transition-colors hover:border-orange-300 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:border-orange-500/50"
        >
            {initial}
        </div>
    );
};

export default ProfileAvatar;