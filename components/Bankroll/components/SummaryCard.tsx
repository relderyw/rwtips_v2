
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export function SummaryCard({ title, value, icon: Icon, subtext, trend, color = "emerald" }: SummaryCardProps) {
  const getColorClasses = () => {
    switch (color) {
      case 'rose':
        return {
          icon: 'bg-rose-500/10 text-rose-500',
          border: 'border-rose-500/20',
          glow: 'shadow-rose-500/10'
        };
      case 'amber':
        return {
          icon: 'bg-amber-500/10 text-amber-500',
          border: 'border-amber-500/20',
          glow: 'shadow-amber-500/10'
        };
      case 'indigo':
        return {
          icon: 'bg-indigo-500/10 text-indigo-500',
          border: 'border-indigo-500/20',
          glow: 'shadow-indigo-500/10'
        };
      default: // emerald
        return {
          icon: 'bg-emerald-500/10 text-emerald-500',
          border: 'border-emerald-500/20',
          glow: 'shadow-emerald-500/10'
        };
    }
  };

  const colors = getColorClasses();

  return (
    <div className={`bg-[#0a0a0c] p-4 rounded-2xl border ${colors.border} relative overflow-hidden group hover:bg-white/[0.02] transition-colors`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${colors.icon} transition-transform group-hover:scale-110 shadow-lg ${colors.glow}`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        {trend && (
          <div className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
            trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : 
            trend === 'down' ? 'bg-rose-500/10 text-rose-500' :
            'bg-white/5 text-white/40'
          }`}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '-'}
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em] mb-1">{title}</h3>
        <p className="text-xl font-black text-white italic tracking-tight">{value}</p>
        {subtext && (
          <p className="text-[9px] font-bold text-white/20 mt-1.5">{subtext}</p>
        )}
      </div>
    </div>
  );
}
