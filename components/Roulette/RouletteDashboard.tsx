import React, { useState, useEffect, useRef } from 'react';
import { fetchRoulettes, RouletteTable, buildSuperbetUrl } from '../../services/rouletteApi';
import { RouletteTableCard } from './RouletteTableCard';
import { analyzeRouletteTable, StrategyOpportunity } from './utils/rouletteStrategies';
import { sendRouletteAlert } from '../../services/telegramRoulette';

// ─── Trend Memory ─────────────────────────────────────────────────────────────
// Tracks which tables have a confirmed trend across ≥2 update cycles.
// A trend must appear in at least 2 consecutive polls before being
// considered "confirmed" (to avoid false-positives from short bursts).
interface TrendEntry {
  opportunity: StrategyOpportunity;
  firstSeenAt: number;   // timestamp of first detection
  confirmedAt?: number;  // timestamp of confirmation (≥2nd consecutive cycle)
  alertSent: boolean;    // whether Telegram alert was already sent
}

type TrendMemory = Map<string, TrendEntry>; // key: `${tableId}:${opportunityName}`

export const RouletteDashboard: React.FC = () => {
  const [tables, setTables] = useState<RouletteTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [tick, setTick] = useState(0); // countdown tick

  // Trend memory — persists across renders via ref so it survives re-renders
  const trendMemoryRef = useRef<TrendMemory>(new Map());
  // Confirmed table IDs for badge display in cards
  const [confirmedTableIds, setConfirmedTableIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let interval: any;
    let mounted = true;

    const loadData = async () => {
      try {
        const data = await fetchRoulettes();
        if (!mounted) return;

        const sorted = data.sort((a, b) => b.seatsTaken - a.seatsTaken);
        setTables(sorted);
        setLastUpdate(new Date());
        setIsLoading(false);
        setTick(10);

        // ── Trend confirmation logic ──────────────────────────────────────
        const memory = trendMemoryRef.current;
        const now = Date.now();
        const newConfirmed = new Set<string>();

        // Keys seen in this cycle
        const seenKeys = new Set<string>();

        for (const table of sorted) {
          const analysis = analyzeRouletteTable(table);

          for (const opp of analysis.opportunities) {
            const key = `${table.id}:${opp.name}`;
            seenKeys.add(key);

            const existing = memory.get(key);

            if (!existing) {
              // First time seen — record but don't confirm yet
              memory.set(key, {
                opportunity: opp,
                firstSeenAt: now,
                alertSent: false,
              });
            } else {
              // Already tracked — check if this is the 2nd+ consecutive cycle
              if (!existing.confirmedAt) {
                // Confirm it now (2nd consecutive detection)
                existing.confirmedAt = now;
                existing.opportunity = opp; // update with latest data
                memory.set(key, existing);

                // Send Telegram alert on confirmation (once)
                if (!existing.alertSent) {
                  existing.alertSent = true;
                  const url = buildSuperbetUrl(table);
                  sendRouletteAlert(table, opp, url).catch(console.error);
                }
              } else {
                // Already confirmed — keep updating opportunity data
                existing.opportunity = opp;
                memory.set(key, existing);
              }

              newConfirmed.add(table.id);
            }
          }
        }

        // Remove stale entries (opportunities that disappeared this cycle)
        for (const [key] of memory) {
          if (!seenKeys.has(key)) {
            memory.delete(key);
          }
        }

        setConfirmedTableIds(newConfirmed);
        // ── End trend logic ────────────────────────────────────────────────

      } catch (e) {
        console.error('Failed to load roulettes', e);
      }
    };

    loadData();
    interval = setInterval(loadData, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Countdown tick
  useEffect(() => {
    const t = setInterval(() => setTick(p => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const filteredTables = tables.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.dealerName && t.dealerName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-8">
        {/* Roulette spinner SVG */}
        <div className="relative w-20 h-20">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              background: 'conic-gradient(from 0deg, #39D353, transparent 60%, #39D353)',
              padding: '2px',
            }}
          >
            <div className="w-full h-full rounded-full" style={{ background: '#0a0a0f' }} />
          </div>
          <div className="absolute inset-3 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(57, 211, 83,0.08)', border: '1px solid rgba(57, 211, 83,0.2)' }}>
            <i className="fa-solid fa-dharmachakra text-[#39D353] text-lg" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-[#39D353]/80 animate-pulse">
            Conectando ao Casino ao Vivo
          </p>
          <p className="text-[10px] text-[#44445A]">Aguardando dados da Evolution Gaming…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-600 space-y-7">

      {/* ─── Top Bar ─── */}
      <div
        className="rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-5"
        style={{
          background: 'linear-gradient(135deg, rgba(20,20,28,0.95) 0%, rgba(10,10,15,0.97) 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-4 shrink-0">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(57, 211, 83,0.12)', border: '1px solid rgba(57, 211, 83,0.25)' }}
          >
            <i className="fa-solid fa-dharmachakra text-[#39D353] animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight leading-tight">
              Roletas <span style={{ color: '#39D353' }}>ONTIME</span>
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {/* Superbet logo badge */}
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ background: 'rgba(255,200,0,0.12)', color: '#FFD700', border: '1px solid rgba(255,200,0,0.25)' }}
              >
                Superbet
              </span>
              <p className="text-[10px] text-[#55556A] font-medium">Evolution Gaming • {tables.length} mesas ao vivo</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-96">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[#44445A] text-xs pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por mesa ou dealer…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full py-3 pl-11 pr-4 text-sm font-medium outline-none transition-all text-[#F0F0F4] placeholder:text-[#33334A]"
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '0.875rem',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(57, 211, 83,0.4)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
          />
        </div>

        {/* Live badge + countdown */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-black text-emerald-400 tracking-wider uppercase">Ao Vivo</span>
              <span className="text-[8px] text-[#44445A] font-medium mt-0.5">
                {lastUpdate.toLocaleTimeString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Countdown ring */}
          <div className="relative w-9 h-9" title={`Atualiza em ${tick}s`}>
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="14" fill="none"
                stroke="#39D353" strokeWidth="2.5"
                strokeDasharray={`${(tick / 10) * 88} 88`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s linear' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-[#39D353]">{tick}</span>
          </div>
        </div>
      </div>

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Mesas ativas', value: tables.length, icon: 'fa-table', color: '#39D353', glow: 'rgba(57, 211, 83,0.15)' },
          { label: 'Jogadores online', value: tables.reduce((s, t) => s + t.seatsTaken, 0).toLocaleString(), icon: 'fa-users', color: '#10b981', glow: 'rgba(16,185,129,0.15)' },
          { label: 'Tendências confirmadas', value: confirmedTableIds.size, icon: 'fa-fire', color: '#f59e0b', glow: 'rgba(245,158,11,0.15)' },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{
              background: `linear-gradient(135deg, ${stat.glow} 0%, rgba(10,10,15,0.9) 100%)`,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${stat.glow}`, border: `1px solid ${stat.color}30` }}
            >
              <i className={`fa-solid ${stat.icon} text-xs`} style={{ color: stat.color }} />
            </div>
            <div>
              <div className="text-lg font-black text-white leading-tight">{stat.value}</div>
              <div className="text-[9px] text-[#44445A] font-medium uppercase tracking-wider">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Grid ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredTables.map(table => (
          <RouletteTableCard
            key={table.id}
            table={table}
            isConfirmed={confirmedTableIds.has(table.id)}
            superbetUrl={buildSuperbetUrl(table)}
          />
        ))}
        {filteredTables.length === 0 && (
          <div className="col-span-full py-24 text-center">
            <i className="fa-solid fa-magnifying-glass text-3xl text-[#22223A] mb-4 block" />
            <p className="text-[#44445A] text-sm font-medium">Nenhuma mesa encontrada com esses critérios.</p>
          </div>
        )}
      </div>
    </div>
  );
};
