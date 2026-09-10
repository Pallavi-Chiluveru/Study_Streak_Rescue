import React from 'react';

/**
 * LightningBackground Component
 * Renders subtle ambient energy glows, moving gradient lines, and lightning accents.
 */
const LightningBackground = ({ intensity = 'subtle', variant = 'default', className = '' }) => {
  const opacityMap = {
    subtle: 'opacity-20',
    medium: 'opacity-40',
    strong: 'opacity-70'
  };

  const selectedOpacity = opacityMap[intensity] || opacityMap.subtle;

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden z-0 ${className}`}>
      {/* Background Gradient Blurs */}
      <div
        className={`absolute -top-40 -left-40 w-96 h-96 bg-orange-500/15 rounded-full blur-[120px] ${selectedOpacity} animate-pulse-glow`}
      />
      <div
        className={`absolute top-1/3 -right-40 w-96 h-96 bg-amber-400/12 rounded-full blur-[130px] ${selectedOpacity} animate-pulse-glow`}
        style={{ animationDelay: '1s' }}
      />
      <div
        className={`absolute -bottom-40 left-1/4 w-[30rem] h-[30rem] bg-orange-400/10 rounded-full blur-[140px] ${selectedOpacity} animate-pulse-glow`}
        style={{ animationDelay: '2s' }}
      />

      {/* Lightning energy line accents */}
      {intensity !== 'subtle' && (
        <>
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orange-400/40 to-transparent animate-energy-flow" />
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent animate-energy-flow" />
        </>
      )}

      {/* Strong variant extra electric streaks (hero/rescue) */}
      {variant === 'strong' && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/10 via-slate-950/50 to-slate-950/80" />
      )}
    </div>
  );
};

export default LightningBackground;
