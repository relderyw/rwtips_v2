import React, { useMemo, useState } from 'react';
import { RouletteTable, getNumberColor } from '../../services/rouletteApi';

interface Props {
  table: RouletteTable;
}

/* ────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const colorStyles = {
  red:   { bg: 'bg-red-600',           ring: 'ring-red-500/60',   glow: '0 0 14px rgba(220,38,38,0.7)',   text: 'text-red-400',   bar: '#dc2626' },
  black: { bg: 'bg-zinc-800',          ring: 'ring-zinc-500/40',  glow: '0 0 10px rgba(0,0,0,0.9)',       text: 'text-zinc-400',  bar: '#3f3f46' },
  green: { bg: 'bg-emerald-600',       ring: 'ring-emerald-400/60', glow: '0 0 14px rgba(16,185,129,0.7)', text: 'text-emerald-400', bar: '#10b981' },
};

function NumberBall({
  num, newest = false, size = 'md', onClick
}: {
  num: string; newest?: boolean; size?: 'sm' | 'md' | 'lg'; onClick?: () => void;
}) {
  const color = getNumberColor(num);
  const cs = colorStyles[color];
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-[10px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-[11px]';

  return (
    <button
      onClick={onClick}
      title={onClick ? 'Ver histórico completo' : undefined}
      className={`shrink-0 ${sizeClass} rounded-full ${cs.bg} flex items-center justify-center font-bold tabular-nums transition-all duration-200
        ${newest ? `ring-2 ring-offset-2 ring-offset-[#0c0c10] ${cs.ring} scale-110 z-10` : 'hover:scale-105 hover:brightness-125'}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
      style={{ boxShadow: newest ? cs.glow : undefined }}
    >
      <span className="text-white leading-none">{num}</span>
    </button>
  );
}

/* ────────────────────────────────────────────────────────────
   History Modal
───────────────────────────────────────────────────────────── */
function HistoryModal({ table, onClose }: { table: RouletteTable; onClose: () => void }) {
  const results = table.lastResults;

  const stats = useMemo(() => {
    let red = 0, black = 0, green = 0;
    results.forEach(n => {
      const c = getNumberColor(n);
      if (c === 'red') red++;
      else if (c === 'black') black++;
      else green++;
    });
    const total = red + black + green;
    return { red, black, green, total, redPct: total ? (red / total) * 100 : 0, blackPct: total ? (black / total) * 100 : 0, greenPct: total ? (green / total) * 100 : 0 };
  }, [results]);

  // Frequency map
  const freq = useMemo(() => {
    const map: Record<string, number> = {};
    results.forEach(n => { map[n] = (map[n] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [results]);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl"
        style={{ background: 'linear-gradient(145deg, #111118 0%, #0a0a0f 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top glow bar */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C8A96E]/60 to-transparent" />

        {/* Header */}
        <div className="flex items-center gap-4 p-6 pb-4 border-b border-white/[0.06]">
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
            <img src={table.image} alt={table.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white truncate">{table.name}</h3>
            <p className="text-xs text-[#8888A0] mt-0.5">
              {results.length} números no histórico • Dealer: {table.dealerName || 'Auto'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-[#8888A0] hover:text-white transition-all text-sm"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 p-6 pb-4">
          {[
            { label: 'Vermelhos', value: stats.red, pct: stats.redPct, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
            { label: 'Pretos', value: stats.black, pct: stats.blackPct, color: 'text-zinc-300', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
            { label: 'Verdes', value: stats.green, pct: stats.greenPct, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-4 text-center`}>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-[#8888A0] font-medium mt-1">{s.label}</div>
              <div className={`text-xs font-bold ${s.color} mt-1`}>{s.pct.toFixed(1)}%</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="px-6 mb-5">
          <div className="w-full h-2 flex rounded-full overflow-hidden gap-0.5">
            <div className="h-full rounded-l-full bg-red-600 transition-all" style={{ width: `${stats.redPct}%` }} />
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${stats.greenPct}%` }} />
            <div className="h-full rounded-r-full bg-zinc-700 transition-all" style={{ width: `${stats.blackPct}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] text-red-400 font-medium">Vermelho {stats.redPct.toFixed(0)}%</span>
            <span className="text-[9px] text-emerald-400 font-medium">Verde {stats.greenPct.toFixed(0)}%</span>
            <span className="text-[9px] text-zinc-400 font-medium">Preto {stats.blackPct.toFixed(0)}%</span>
          </div>
        </div>

        {/* Most frequent */}
        {freq.length > 0 && (
          <div className="px-6 mb-5">
            <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#44445A] mb-2">Números mais frequentes</div>
            <div className="flex gap-3 flex-wrap">
              {freq.map(([n, count]) => (
                <div key={n} className="flex flex-col items-center gap-1">
                  <NumberBall num={n} size="lg" />
                  <span className="text-[9px] text-[#8888A0] font-bold">{count}×</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full grid */}
        <div className="px-6 pb-6">
          <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#44445A] mb-3">
            Histórico completo ({results.length} sorteios)
          </div>
          <div className="flex flex-wrap gap-2">
            {results.map((num, i) => (
              <div key={`hist-${i}`} className="relative">
                <NumberBall num={num} size="md" newest={i === 0} />
                {i === 0 && (
                  <span className="absolute -top-2 -right-1 text-[7px] bg-[#C8A96E] text-black font-black px-1 rounded-full">1º</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Main Card
───────────────────────────────────────────────────────────── */
export const RouletteTableCard: React.FC<Props> = ({ table }) => {
  const [showHistory, setShowHistory] = useState(false);

  const stats = useMemo(() => {
    let red = 0, black = 0, green = 0;
    table.lastResults.forEach(n => {
      const c = getNumberColor(n);
      if (c === 'red') red++;
      else if (c === 'black') black++;
      else green++;
    });
    const total = red + black + green;
    return {
      red: total ? (red / total) * 100 : 0,
      black: total ? (black / total) * 100 : 0,
      green: total ? (green / total) * 100 : 0,
    };
  }, [table.lastResults]);

  const latestNum = table.lastResults[0];
  const latestColor = latestNum ? getNumberColor(latestNum) : null;
  const accentGlow = latestColor === 'red' ? 'rgba(220,38,38,0.15)' : latestColor === 'green' ? 'rgba(16,185,129,0.15)' : 'rgba(63,63,70,0.15)';

  return (
    <>
      {showHistory && <HistoryModal table={table} onClose={() => setShowHistory(false)} />}

      <div
        className="group relative rounded-3xl overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-1"
        style={{
          background: 'linear-gradient(145deg, rgba(20,20,28,0.95) 0%, rgba(10,10,15,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: `0 4px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top right, ${accentGlow} 0%, transparent 70%)` }}
        />

        {/* Top accent line */}
        <div
          className="absolute top-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: 'linear-gradient(90deg, transparent, #C8A96E50, transparent)' }}
        />

        {/* Card inner */}
        <div className="relative z-10 p-5 flex flex-col gap-4">

          {/* Header */}
          <div className="flex items-center gap-3">
            {/* Image */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                <img src={table.image} alt={table.name} className="w-full h-full object-cover" />
              </div>
              {/* Online dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0a0a0f] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-[13px] font-bold text-white leading-tight truncate">{table.name}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <i className="fa-solid fa-user-tie text-[9px] text-[#C8A96E]/70" />
                <span className="text-[10px] text-[#8888A0] font-medium truncate">{table.dealerName || 'Auto'}</span>
              </div>
            </div>

            {/* Players badge */}
            <div className="shrink-0 flex flex-col items-end gap-1">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <i className="fa-solid fa-users text-[8px] text-[#8888A0]" />
                <span className="text-[11px] font-black text-white tabular-nums">{table.seatsTaken}</span>
              </div>
            </div>
          </div>

          {/* Color distribution bar */}
          <div className="space-y-2">
            <div className="w-full h-1.5 flex rounded-full overflow-hidden gap-px">
              <div className="h-full bg-red-600 rounded-l-full transition-all duration-700" style={{ width: `${stats.red}%` }} />
              <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${stats.green}%` }} />
              <div className="h-full bg-zinc-700 rounded-r-full transition-all duration-700" style={{ width: `${stats.black}%` }} />
            </div>
            <div className="flex justify-between">
              <span className="text-[9px] font-semibold text-red-400">{stats.red.toFixed(0)}%</span>
              <span className="text-[9px] font-semibold text-emerald-400">{stats.green.toFixed(0)}%</span>
              <span className="text-[9px] font-semibold text-zinc-400">{stats.black.toFixed(0)}%</span>
            </div>
          </div>

          {/* Numbers section */}
          <div
            className="rounded-2xl p-3 space-y-2.5"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[8px] uppercase tracking-[0.22em] font-bold text-[#44445A]">Últimos Números</span>
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-1 text-[8px] font-bold text-[#C8A96E]/70 hover:text-[#C8A96E] transition-colors uppercase tracking-wider"
              >
                <i className="fa-solid fa-clock-rotate-left text-[7px]" />
                Ver histórico
              </button>
            </div>

            <div className="flex gap-1.5 overflow-x-hidden">
              {table.lastResults.slice(0, 8).map((num, i) => (
                <NumberBall
                  key={`${num}-${i}`}
                  num={num}
                  newest={i === 0}
                  onClick={() => setShowHistory(true)}
                />
              ))}
              {table.lastResults.length > 8 && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="shrink-0 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-bold text-[#8888A0] hover:text-white hover:bg-white/10 transition-all"
                >
                  +{table.lastResults.length - 8}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
