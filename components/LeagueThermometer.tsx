
import React from 'react';
import { LeagueStats } from '../types';
import { getLeagueInfo } from '../services/analyzer';

interface LeagueThermometerProps {
  stats: LeagueStats;
  onViewGames?: (stats: LeagueStats) => void;
}

export const LeagueThermometer: React.FC<LeagueThermometerProps> = ({ stats, onViewGames }) => {
  const info = getLeagueInfo(stats.leagueName);

  const getStatusInfo = () => {
    switch (stats.temperature) {
      case 'hot': return { label: 'MERCADO HOT', color: '#F87171', bg: '#F87171', icon: 'fa-fire' };
      case 'ht_pro': return { label: 'HT PRO SNIPER', color: '#39D353', bg: '#39D353', icon: 'fa-crosshairs' };
      case 'ft_pro': return { label: 'FT PRO ENGINE', color: '#39D353', bg: '#39D353', icon: 'fa-gears' };
      case 'warm': return { label: 'EM ALTA', color: '#39D353', bg: '#39D353', icon: 'fa-arrow-trend-up' };
      case 'cold': return { label: 'EM QUEDA', color: '#8888A0', bg: '#8888A0', icon: 'fa-arrow-trend-down' };
      default: return { label: 'ESTÁVEL', color: '#44445A', bg: '#44445A', icon: 'fa-scale-balanced' };
    }
  };

  const status = getStatusInfo();

  const getTempIcon = () => {
    return <i className={`fa-solid ${status.icon} ${stats.temperature === 'hot' ? 'animate-pulse' : ''}`} style={{ color: status.color }}></i>;
  };

  const MetricItem = ({ label, val, isBad }: { label: string, val: number, isBad?: boolean }) => {
    const mainColor = val >= 70 ? (isBad ? '#F87171' : '#34D399') : val >= 50 ? '#39D353' : (isBad ? '#34D399' : '#F87171');
    const softColor = mainColor + '60';

    return (
      <div className="flex flex-col gap-1.5 mb-2.5">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#8888A0' }}>
            {label}
          </span>
          <span className="font-mono-numbers font-semibold text-[11px]" style={{ color: mainColor }}>
            {val.toFixed(0)}%
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: '#161620' }}>
          <div
            className="h-full transition-all duration-1000"
            style={{ width: `${val}%`, background: mainColor }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl p-4 transition-all duration-300 relative overflow-hidden flex flex-col h-full"
      style={{ background: '#0D0D12', border: '1px solid #1E1E28', borderLeft: `3px solid ${info.color}60` }}>
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 p-1.5" style={{ background: '#13131A', border: '1px solid #1E1E28' }}>
          {info.image ? (
            <img src={info.image} alt={info.name} className="w-full h-full object-contain" />
          ) : (
            <span className="text-sm">{getTempIcon()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-semibold truncate leading-tight mb-0.5" style={{ color: '#F0F0F4' }}>{info.name}</h4>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: status.color }}>
              {status.label}
            </span>
            {(stats.temperature === 'hot' || stats.temperature.includes('_pro')) && (
              <div className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: status.bg }}></div>
            )}
          </div>
        </div>
        <button
          onClick={() => onViewGames?.(stats)}
          className="w-7 h-7 rounded-lg transition-all flex items-center justify-center"
          style={{ background: '#13131A', border: '1px solid #1E1E28', color: '#8888A0' }}
          title="Ver histórico"
        >
          <i className="fa-solid fa-list text-[10px]"></i>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mt-auto">
        <div className="p-3 rounded-xl" style={{ background: '#13131A', border: '1px solid #1E1E28' }}>
          <h5 className="text-[8px] font-semibold uppercase tracking-widest mb-3 pb-2 text-center" style={{ color: '#44445A', borderBottom: '1px solid #1E1E28' }}>HT</h5>
          <MetricItem label="+0.5 HT" val={stats.metrics.ht05} />
          <MetricItem label="+1.5 HT" val={stats.metrics.ht15} />
          <MetricItem label="BTTS HT" val={stats.metrics.htBtts} />
        </div>
        <div className="p-3 rounded-xl" style={{ background: '#13131A', border: '1px solid #1E1E28' }}>
          <h5 className="text-[8px] font-semibold uppercase tracking-widest mb-3 pb-2 text-center" style={{ color: '#44445A', borderBottom: '1px solid #1E1E28' }}>FT</h5>
          <MetricItem label="+1.5 FT" val={stats.metrics.ft15} />
          <MetricItem label="+2.5 FT" val={stats.metrics.ft25} />
          <MetricItem label="BTTS FT" val={stats.metrics.ftBtts} />
        </div>
      </div>
    </div>
  );
};
