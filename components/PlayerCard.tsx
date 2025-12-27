
import React from 'react';
import { PlayerStats } from '../types';

interface PlayerCardProps {
  stats: PlayerStats;
  isHome?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ stats, isHome }) => {
  const formColors: Record<string, string> = {
    'W': 'bg-green-500',
    'D': 'bg-yellow-500',
    'L': 'bg-red-500'
  };

  const getDynamicColor = (value: number, opacity: number = 1) => {
    const hue = Math.min(Math.max(value * 1.2, 0), 120);
    return `hsla(${hue}, 80%, 45%, ${opacity})`;
  };

  const MetricBar = ({ label, value }: { label: string, value: number }) => {
    const mainColor = getDynamicColor(value, 1);
    const softColor = getDynamicColor(value, 0.6);
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[12px] uppercase font-black tracking-tight">
          <span className="text-white/40">{label}</span>
          <span style={{ color: mainColor }} className="font-mono-numbers">{value.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-black/40 rounded-full h-2.5 border border-white/5 shadow-inner overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-1000" 
            style={{ 
              width: `${value}%`, 
              background: `linear-gradient(90deg, ${softColor}, ${mainColor})`,
              boxShadow: `0 0 10px ${getDynamicColor(value, 0.2)}`
            }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className={`glass-card p-6 rounded-[2.5rem] flex flex-col gap-6 border ${isHome ? 'border-l-4 border-l-blue-500/50' : 'border-r-4 border-r-indigo-500/50'}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-white uppercase tracking-tight">{stats.name}</h3>
        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">SAMPLE: {stats.matchesPlayed}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 text-center">
          <p className="text-[10px] uppercase text-white/30 font-black tracking-widest mb-1">Win Rate</p>
          <p className="text-2xl font-black text-blue-400 font-mono-numbers">{stats.winRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 text-center">
          <p className="text-[10px] uppercase text-white/30 font-black tracking-widest mb-1">Avg Goals</p>
          <p className="text-2xl font-black text-emerald-400 font-mono-numbers">{stats.avgGoalsScoredFT.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-5">
        <MetricBar label="HT Over 0.5" value={stats.htOver05Rate} />
        <MetricBar label="FT Over 2.5" value={stats.ftOver25Rate} />
        <MetricBar label="Ambas Marcam" value={stats.ftBttsRate} />
      </div>

      <div className="pt-4 flex gap-2 justify-center border-t border-white/5">
        {stats.last5.map((result, i) => (
          <div 
            key={i} 
            className={`${formColors[result]} w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black text-white shadow-lg transition-transform hover:scale-110 cursor-default`}
          >
            {result}
          </div>
        ))}
      </div>
    </div>
  );
};
