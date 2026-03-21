import React from 'react';

export const LeagueGauge = ({ value }: { value: number }) => {
  const radius = 40;
  const strokeWidth = 8;
  const normalizedValue = Math.max(0, Math.min(100, value));
  
  // Angle for the needle (-90 to 90)
  const angle = -90 + (normalizedValue / 100) * 180;

  return (
    <div className="relative flex flex-col items-center justify-center w-20 h-12 mt-1 -mb-1">
      <svg viewBox="-5 -5 110 65" className="w-full h-full overflow-visible drop-shadow-2xl">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        
        {/* Background track */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Colored Arc */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Needle */}
        <g transform={`rotate(${angle} 50 50)`} className="transition-transform duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-[50px_50px]">
          {/* Shadow */}
          <line x1="50" y1="50" x2="50" y2="10" stroke="rgba(0,0,0,0.5)" strokeWidth="3" strokeLinecap="round" transform="translate(1, 2)" />
          {/* Main Needle */}
          <line x1="50" y1="50" x2="50" y2="10" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          {/* Center Pin */}
          <circle cx="50" cy="50" r="5" fill="#111111" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="2" fill="#ef4444" />
        </g>
      </svg>
    </div>
  );
};
