import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import darkModeLogo from '../../assets/darkmodelogo.png';
import whiteModeLogo from '../../assets/whitemodelogo.png';

const BrandLogo = ({ compact = false, link = true, className = '' }) => {
  const { theme } = useTheme();
  const logo = theme === 'dark' ? darkModeLogo : whiteModeLogo;
  const content = (
    <span className={`${compact ? 'inline-flex flex-col items-center' : 'inline-flex items-center gap-3'} ${className}`}>
      {compact ? (
        <span className="flex h-24 w-24 items-center justify-center rounded-2xl border border-orange-200 bg-white shadow-[0_4px_14px_rgba(249,115,22,0.12)] dark:border-orange-500/20 dark:bg-slate-900 dark:shadow-none">
          <img src={logo} alt="Study Streak Rescue logo" className="h-20 w-20 object-contain" />
        </span>
      ) : (
        <img src={logo} alt="Study Streak Rescue logo" className="h-10 w-10 rounded-xl object-contain shadow-lg shadow-orange-500/20" />
      )}
      {compact ? (
        <span className="mt-3 text-center">
          <span className="block text-xl font-extrabold leading-tight text-slate-900 dark:text-white">
            Study <span className="text-orange-500 dark:text-orange-400">Streak</span>
          </span>
          <span className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold tracking-[0.22em] text-slate-700 dark:text-slate-200">
            <span className="h-[2px] w-5 rounded-full bg-orange-400" />
            <span>Rescue</span>
            <span className="h-[2px] w-5 rounded-full bg-orange-400" />
          </span>
        </span>
      ) : (
        <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-xl">
          Study Streak <span className="electric-text-gradient">Rescue</span>
        </span>
      )}
    </span>
  );

  return link ? (
    <Link to="/" aria-label="Study Streak Rescue home">
      {content}
    </Link>
  ) : content;
};

export default BrandLogo;
