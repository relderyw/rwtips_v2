
import React from 'react';
import { LeagueStats } from '../types';
import { getLeagueInfo } from '../services/analyzer';

interface LeagueThermometerProps {
  stats: LeagueStats;
  onViewGames?: (stats: LeagueStats) => void;
}

export const LeagueThermometer: React.FC<LeagueThermometerProps> = ({ stats, onViewGames }) => {
  const info = getLeagueInfo(stats.leagueName);

  const getDynamicColor = (value: number, opacity: number = 1, isBad?: boolean) => {
    let healthFactor;
    if (isBad) {
      healthFactor = Math.max(0, 100 - (value * 4)); 
    } else {
      healthFactor = value;
    }
    const hue = Math.min(Math.max(healthFactor * 1.2, 0), 120);
    return `hsla(${hue}, 80%, 45%, ${opacity})`;
  };

  const getTempIcon = () => {
    switch(stats.temperature) {
      case 'hot': return <i className="fa-solid fa-fire text-orange-500 animate-pulse"></i>;
      case 'warm': return <i className="fa-solid fa-sun text-yellow-500"></i>;
      case 'cold': return <i className="fa-solid fa-snowflake text-blue-400"></i>;
    }
  };

  const MetricItem = ({ label, val, isBad }: { label: string, val: number, isBad?: boolean }) => {
    const mainColor = getDynamicColor(val, 1, isBad);
    const softColor = getDynamicColor(val, 0.6, isBad);

    return (
      <div className="flex flex-col gap-1.5 mb-3 group">
        <div className="flex justify-between items-center px-0.5">
          <span className="text-[9px] font-black text-white/30 uppercase tracking-widest group-hover:text-white/50 transition-colors">
            {label}
          </span>
          <span className="font-mono-numbers font-black text-[12px]" style={{ color: mainColor }}>
            {val.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-white/[0.02] rounded-full overflow-hidden border border-white/[0.03] shadow-inner">
          <div 
            className="h-full progress-bar-fill transition-all duration-1000" 
            style={{ 
              width: `${val}%`, 
              background: `linear-gradient(90deg, ${softColor}, ${mainColor})`,
              boxShadow: `0 0 8px ${getDynamicColor(val, 0.2, isBad)}`
            }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-[#0c0c0e]/80 border rounded-[2rem] p-6 transition-all duration-300 card-glow hover:border-emerald-500/20 relative overflow-hidden h-full`} style={{ borderColor: `${info.color}15` }}>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-black border border-white/10 p-2 shadow-2xl transition-transform hover:scale-110 shrink-0">
           {info.image ? (
             <img src={info.image} alt={info.name} className="w-full h-full object-contain brightness-110" />
           ) : (
             <span className="text-xl" style={{ color: info.color }}>{getTempIcon()}</span>
           )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[16px] font-black text-white uppercase tracking-tighter truncate leading-tight mb-0.5">{info.name}</h4>
          <div className="flex items-center gap-2">
            <span className={`text-[8px] font-black uppercase tracking-[0.3em] ${stats.temperature === 'hot' ? 'text-orange-500' : 'text-white/20'}`}>
                {stats.temperature === 'hot' ? 'MERCADO EM ALTA' : 'ESTABILIDADE'}
            </span>
            {stats.temperature === 'hot' && <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping"></div>}
          </div>
        </div>
        <button 
          onClick={() => onViewGames?.(stats)}
          className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl hover:bg-emerald-500 hover:text-black transition-all active:scale-95 group flex items-center justify-center"
          title="Ver histórico desta liga"
        >
          <i className="fa-solid fa-database text-xs group-hover:scale-110 transition-transform"></i>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 pt-6 border-t border-white/[0.05]">
        <div className="space-y-1">
            <h5 className="text-[10px] font-black text-indigo-400 uppercase mb-5 tracking-[0.4em] text-center italic border-b border-indigo-500/10 pb-2">DADOS HT</h5>
            <MetricItem label="+0.5 HT" val={stats.metrics.ht05} />
            <MetricItem label="+1.5 HT" val={stats.metrics.ht15} />
            <MetricItem label="BTTS HT" val={stats.metrics.htBtts} />
            <MetricItem label="UNDER HT" val={stats.metrics.ht0x0} isBad />
        </div>
        <div className="space-y-1">
            <h5 className="text-[10px] font-black text-emerald-400 uppercase mb-5 tracking-[0.4em] text-center italic border-b border-emerald-500/10 pb-2">DADOS FT</h5>
            <MetricItem label="+1.5 FT" val={stats.metrics.ft15} />
            <MetricItem label="+2.5 FT" val={stats.metrics.ft25} />
            <MetricItem label="BTTS FT" val={stats.metrics.ftBtts} />
            <MetricItem label="UNDER FT" val={stats.metrics.ft0x0} isBad />
        </div>
      </div>
    </div>
  );
};
