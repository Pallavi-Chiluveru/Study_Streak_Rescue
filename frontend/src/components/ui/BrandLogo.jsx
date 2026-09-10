import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import darkModeLogo from '../../assets/darkmodelogo.png';
import whiteModeLogo from '../../assets/whitemodelogo.png';

const BrandLogo = ({ compact = false, link = true, className = '' }) => {
  const { theme } = useTheme();
  const logo = theme === 'dark' ? darkModeLogo : whiteModeLogo;
  const content = (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src={logo}
        alt="Study Streak Rescue logo"
        className={`${compact ? 'h-9 w-9' : 'h-10 w-10'} rounded-xl object-cover shadow-lg shadow-orange-500/20`}
      />
      {!compact && (
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
