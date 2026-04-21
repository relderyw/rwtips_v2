import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { HistoryMatch } from '../types';
import {
  runLeagueBacktest, runPlayerBacktest, generatePredictionSignals,
  BacktestResult, PlayerBacktestResult, PredictionSignal,
  getLeagueInfo, ALLOWED_LEAGUES, STRATEGY_THEMES, normalize
} from '../services/analyzer';
import { fetchPlayers } from '../services/api';

// =========================================================
// CONSTANTS
// =========================================================
const MARKETS = [
  { id: 'over_0.5_ht', label: 'Over 0.5 HT', icon: 'fa-bolt', color: '#f59e0b' },
  { id: 'over_1.5_ht', label: 'Over 1.5 HT', icon: 'fa-fire', color: '#f97316' },
  { id: 'over_2.5_ht', label: 'Over 2.5 HT', icon: 'fa-fire-flame-curved', color: '#ef4444' },
  { id: 'btts_ht', label: 'BTTS HT', icon: 'fa-arrows-rotate', color: '#ec4899' },
  { id: 'over_1.5_ft', label: 'Over 1.5 FT', icon: 'fa-chart-line', color: '#6366f1' },
  { id: 'over_2.5_ft', label: 'Over 2.5 FT', icon: 'fa-chart-line', color: '#8b5cf6' },
  { id: 'over_3.5_ft', label: 'Over 3.5 FT', icon: 'fa-rocket', color: '#a855f7' },
  { id: 'over_4.5_ft', label: 'Over 4.5 FT', icon: 'fa-rocket', color: '#d946ef' },
  { id: 'btts_ft', label: 'BTTS FT', icon: 'fa-arrows-left-right', color: '#06b6d4' },
  { id: 'home_win', label: 'Casa Vence', icon: 'fa-house-circle-check', color: '#10b981' },
  { id: 'away_win', label: 'Fora Vence', icon: 'fa-plane-arrival', color: '#14b8a6' },
];

const STRATEGIES = [
  { id: 'all', label: 'TODAS', icon: 'fa-globe' },
  { id: 'ht_pro', label: 'HT PRO', icon: 'fa-crosshairs' },
  { id: 'ft_pro', label: 'FT PRO', icon: 'fa-fire-flame-simple' },
  { id: 'btts_pro_ht', label: 'BTTS HT', icon: 'fa-arrows-rotate' },
  { id: 'btts_pro_ft', label: 'BTTS FT', icon: 'fa-arrows-rotate' },
  { id: 'casa_pro', label: 'CASA DOM', icon: 'fa-house-circle-check' },
  { id: 'fora_pro', label: 'FORA DOM', icon: 'fa-plane-arrival' },
  { id: 'top_clash', label: 'ELITE CLASH', icon: 'fa-crown' },
];

// =========================================================
// MINI COMPONENTS
// =========================================================
const DotStreak: React.FC<{ results: ('G' | 'R')[]; size?: 'sm' | 'md' }> = ({ results, size = 'sm' }) => (
  <div className="flex items-center gap-1">
    {results.slice(0, 10).map((r, i) => (
      <div
        key={i}
        className={`rounded-full border flex items-center justify-center font-black ${size === 'md' ? 'w-6 h-6 text-[9px]' : 'w-4 h-4 text-[8px]'} ${r === 'G' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-rose-500/20 border-rose-500/50 text-rose-400'}`}
      >
        {r}
      </div>
    ))}
  </div>
);

const TrendBadge: React.FC<{ trend: 'heating' | 'cooling' | 'stable' }> = ({ trend }) => {
  const map = {
    heating: { label: 'Aquecendo 🔥', cls: 'bg-orange-500/15 border-orange-500/30 text-orange-400' },
    cooling: { label: 'Resfriando ❄️', cls: 'bg-blue-500/15 border-blue-500/30 text-blue-400' },
    stable: { label: 'Estável ➡️', cls: 'bg-zinc-700/50 border-zinc-600/30 text-zinc-400' },
  };
  const m = map[trend];
  return <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${m.cls}`}>{m.label}</span>;
};

const SignalBadge: React.FC<{ signal: PredictionSignal['signal'] }> = ({ signal }) => {
  const map: Record<string, { label: string; cls: string }> = {
    strong_buy: { label: '⚡ FORTE COMPRA', cls: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' },
    buy: { label: '✅ COMPRA', cls: 'bg-lime-500/20 border-lime-500/40 text-lime-300' },
    neutral: { label: '〰️ NEUTRO', cls: 'bg-zinc-700/40 border-zinc-600/30 text-zinc-400' },
    avoid: { label: '🚫 EVITAR', cls: 'bg-rose-500/20 border-rose-500/40 text-rose-400' },
  };
  const m = map[signal];
  return <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${m.cls}`}>{m.label}</span>;
};

const ConfidenceBadge: React.FC<{ conf: 'high' | 'medium' | 'low'; score?: number }> = ({ conf, score }) => {
  const map = {
    high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-zinc-700/40 text-zinc-500 border-zinc-600/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase ${map[conf]}`}>
      {conf === 'high' ? '🔒 Alta' : conf === 'medium' ? '⚠️ Média' : '📉 Baixa'}
      {score !== undefined && ` (${score})`}
    </span>
  );
};

// =========================================================
// MAIN COMPONENT
// =========================================================
interface FifaAnalyticsDashboardProps {
  history: HistoryMatch[];
}

export const FifaAnalyticsDashboard: React.FC<FifaAnalyticsDashboardProps> = ({ history }) => {
  // ─── BACKTEST STATE ───
  const [btMode, setBtMode] = useState<'league' | 'player' | 'signals'>('signals');
  const [btLeague, setBtLeague] = useState('all');
  const [btStrategy, setBtStrategy] = useState('all');
  const [btPlayerName, setBtPlayerName] = useState('');
  const [btMarket, setBtMarket] = useState('over_2.5_ft');
  const [btSampleSize, setBtSampleSize] = useState(15);
  const [btLeagueResult, setBtLeagueResult] = useState<BacktestResult | null>(null);
  const [btPlayerResult, setBtPlayerResult] = useState<PlayerBacktestResult | null>(null);
  const [btSignals, setBtSignals] = useState<PredictionSignal[]>([]);
  const [btRunning, setBtRunning] = useState(false);
  const [signalMarket, setSignalMarket] = useState('over_2.5_ft');
  const [signalMinGames, setSignalMinGames] = useState(5);

  // ─── AUTOCOMPLETE STATE ───
  const [playerSuggestions, setPlayerSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const playerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (btPlayerName.length >= 2) {
        setLoadingSuggestions(true);
        fetchPlayers(btPlayerName).then(s => {
          setPlayerSuggestions(s);
          setLoadingSuggestions(false);
        });
      } else {
        setPlayerSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [btPlayerName]);

  // Available leagues from history
  const availableLeagues = useMemo(() => {
    const set = new Set<string>();
    history.forEach(g => {
      const info = getLeagueInfo(g.league_name || '');
      if (ALLOWED_LEAGUES.includes(info.name)) set.add(info.name);
    });
    return Array.from(set).sort();
  }, [history]);

  // === BACKTEST RUNNERS ===
  const runLeague = useCallback(async () => {
    setBtRunning(true);
    await new Promise(r => setTimeout(r, 50));
    const result = runLeagueBacktest(history, btLeague, btStrategy, btSampleSize);
    setBtLeagueResult(result);
    setBtRunning(false);
  }, [history, btLeague, btStrategy, btSampleSize]);

  const runPlayer = useCallback(async () => {
    if (!btPlayerName.trim()) return;
    setBtRunning(true);
    await new Promise(r => setTimeout(r, 50));
    const result = runPlayerBacktest(history, btPlayerName.trim(), btMarket, btSampleSize);
    setBtPlayerResult(result);
    setBtRunning(false);
  }, [history, btPlayerName, btMarket, btSampleSize]);

  const runSignals = useCallback(async () => {
    setBtRunning(true);
    setBtSignals([]);
    await new Promise(r => setTimeout(r, 50));
    const result = generatePredictionSignals(history, signalMarket, signalMinGames, 25);
    setBtSignals(result);
    setBtRunning(false);
  }, [history, signalMarket, signalMinGames]);

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── BACKTEST ENGINE ── */}
      <div className="animate-in fade-in duration-500 space-y-6">
          {/* Mode selector */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'signals', label: '🎯 Sinais Preditivos', desc: 'Ranking de players por mercado', color: 'emerald' },
              { id: 'player', label: '👤 Por Player', desc: 'Backtest de um jogador específico', color: 'cyan' },
              { id: 'league', label: '🏆 Por Liga & Estratégia', desc: 'Performance histórica por liga', color: 'violet' },
            ].map(m => (
              <button key={m.id} onClick={() => setBtMode(m.id as any)}
                className={`p-4 rounded-2xl border text-left transition-all duration-300 ${btMode === m.id
                  ? m.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : m.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                      : 'bg-violet-500/10 border-violet-500/40 shadow-lg shadow-violet-500/10'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}>
                <div className="text-sm font-black text-white mb-1">{m.label}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{m.desc}</div>
              </button>
            ))}
          </div>

          {/* ─── SIGNALS MODE ─── */}
          {btMode === 'signals' && (
            <div className="space-y-4">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-wrap items-end gap-6">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">Mercado Alvo</div>
                  <select value={signalMarket} onChange={e => setSignalMarket(e.target.value)}
                    className="bg-black/60 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50 appearance-none cursor-pointer min-w-[200px]">
                    {MARKETS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">Mín. Jogos p/ Player</div>
                  <div className="flex gap-2">
                    {[5, 8, 10, 15].map(n => (
                      <button key={n} onClick={() => setSignalMinGames(n)}
                        className={`w-12 h-10 rounded-xl font-black text-sm transition-all ${signalMinGames === n ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>{n}</button>
                    ))}
                  </div>
                </div>
                <button onClick={runSignals} disabled={btRunning || history.length < 20}
                  className="ml-auto px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-black rounded-xl uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                  <i className="fa-solid fa-bolt"></i> {btRunning ? 'Calculando...' : 'GERAR SINAIS'}
                </button>
              </div>

              {btRunning && (
                <div className="py-16 text-center">
                  <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[1em]">Processando histórico...</p>
                </div>
              )}

              {!btRunning && btSignals.length === 0 && (
                <div className="py-24 text-center opacity-20">
                  <i className="fa-solid fa-bolt text-5xl mb-4"></i>
                  <p className="text-[10px] font-black uppercase tracking-[1.5em]">Clique em "Gerar Sinais" para iniciar</p>
                </div>
              )}

              {btSignals.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">
                      {btSignals.length} Sinais Ativos — {MARKETS.find(m => m.id === signalMarket)?.label}
                    </h3>
                    <span className="text-[9px] text-emerald-500 font-black uppercase">Ordenado por probabilidade × confiança</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {btSignals.map((sig, i) => (
                      <div key={i}
                        className={`relative p-4 rounded-2xl border transition-all overflow-hidden ${sig.signal === 'strong_buy' ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-white/[0.02] border-white/5'}`}>
                        {sig.signal === 'strong_buy' && (
                          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
                        )}

                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] bg-white/5 border border-white/10 rounded px-2 py-0.5 text-white/40 font-black uppercase">#{i + 1}</span>
                              <span className="text-[9px] text-zinc-500 uppercase font-black">{sig.league}</span>
                            </div>
                            <div className="text-base font-black text-white leading-tight">{sig.player}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-3xl font-black text-emerald-400 leading-none">{sig.probability.toFixed(0)}%</div>
                            <div className="text-[8px] text-zinc-600 uppercase mt-0.5">probabilidade</div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <SignalBadge signal={sig.signal} />
                          <TrendBadge trend={sig.trend} />
                          {sig.streak >= 2 && (
                            <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black ${sig.streakType === 'G' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                              {sig.streak}× {sig.streakType === 'G' ? '🟢' : '🔴'} seguidos
                            </span>
                          )}
                        </div>

                        <DotStreak results={sig.lastN} />

                        {sig.reasoning.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {sig.reasoning.map((r, ri) => (
                              <div key={ri} className="flex items-center gap-1.5 text-[9px] text-zinc-500">
                                <i className="fa-solid fa-check text-emerald-500/60 text-[8px]"></i> {r}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Confidence bar */}
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-[8px] text-zinc-600 uppercase font-black w-16">Confiança</span>
                          <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${sig.confidence}%` }} />
                          </div>
                          <span className="text-[9px] font-black text-zinc-400">{sig.confidence}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── PLAYER MODE ─── */}
          {btMode === 'player' && (
            <div className="space-y-4">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-wrap items-end gap-6">
                <div className="flex-1 min-w-[200px] relative">
                  <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">Nome do Player</div>
                  <input
                      ref={playerInputRef}
                      type="text"
                      value={btPlayerName}
                      onChange={e => { setBtPlayerName(e.target.value); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="Ex: NEYMARJR, RONALDO..."
                      className="w-full bg-black/60 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-600" />
                  
                  {showSuggestions && (playerSuggestions.length > 0 || loadingSuggestions) && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto overflow-x-hidden">
                        {loadingSuggestions ? (
                          <div className="px-4 py-3 text-xs text-zinc-500">Buscando jogadores...</div>
                        ) : (
                          playerSuggestions.map((name, i) => (
                            <button
                              key={i}
                              onMouseDown={(e) => {
                                e.preventDefault(); // Impede o onBlur de fechar antes do clique
                                setBtPlayerName(name);
                                setPlayerSuggestions([]);
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-800 transition-all text-white/80 border-b border-white/5 last:border-0 truncate"
                            >
                              {name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">Mercado</div>
                  <select value={btMarket} onChange={e => setBtMarket(e.target.value)}
                    className="bg-black/60 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 appearance-none cursor-pointer min-w-[180px]">
                    {MARKETS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">Amostra</div>
                  <div className="flex gap-2">
                    {[10, 15, 20].map(n => (
                      <button key={n} onClick={() => setBtSampleSize(n)}
                        className={`w-12 h-10 rounded-xl font-black text-sm transition-all ${btSampleSize === n ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>{n}</button>
                    ))}
                  </div>
                </div>
                <button onClick={runPlayer} disabled={btRunning || !btPlayerName.trim()}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-black font-black rounded-xl uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg flex items-center gap-2">
                  <i className="fa-solid fa-magnifying-glass-chart"></i> ANALISAR
                </button>
              </div>

              {btRunning && <div className="py-16 text-center"><div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div><p className="text-[10px] font-black text-white/20 uppercase tracking-[1em]">Calculando...</p></div>}

              {!btRunning && !btPlayerResult && (
                <div className="py-24 text-center opacity-20">
                  <i className="fa-solid fa-user-magnifying-glass text-5xl mb-4"></i>
                  <p className="text-[10px] font-black uppercase tracking-[1.5em]">Insira um player e clique em Analisar</p>
                </div>
              )}

              {btPlayerResult && !btRunning && (
                <div className="space-y-4">
                  {/* Summary Card */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">{btPlayerResult.displayMarket}</div>
                        <div className="text-2xl font-black text-white">{btPlayerResult.player}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-5xl font-black text-emerald-400 leading-none">{btPlayerResult.predictedProbability.toFixed(0)}%</div>
                        <div className="text-[10px] text-zinc-500 uppercase mt-1">Probabilidade Próx. Jogo</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {[
                        { label: 'Jogos Analisados', value: btPlayerResult.totalGames, color: 'text-white' },
                        { label: 'Taxa Histórica', value: `${btPlayerResult.winRate.toFixed(0)}%`, color: btPlayerResult.winRate >= 70 ? 'text-emerald-400' : btPlayerResult.winRate >= 50 ? 'text-amber-400' : 'text-rose-400' },
                        { label: 'Greens / Reds', value: `${btPlayerResult.greens} / ${btPlayerResult.reds}`, color: 'text-white' },
                        { label: 'Sequência Atual', value: `${btPlayerResult.currentStreak}× ${btPlayerResult.streakType}`, color: btPlayerResult.streakType === 'G' ? 'text-emerald-400' : btPlayerResult.streakType === 'R' ? 'text-rose-400' : 'text-zinc-500' },
                      ].map((item, i) => (
                        <div key={i} className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                          <div className="text-[9px] text-zinc-500 uppercase font-black mb-1">{item.label}</div>
                          <div className={`text-lg font-black ${item.color}`}>{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <TrendBadge trend={btPlayerResult.trend} />
                      <ConfidenceBadge conf={btPlayerResult.confidence} />
                    </div>

                    <div>
                      <div className="text-[9px] text-zinc-500 uppercase font-black mb-2">Sequência (Mais Recente → Mais Antigo)</div>
                      <DotStreak results={btPlayerResult.lastN} size="md" />
                    </div>

                    {/* Win rate bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-[9px] font-black mb-1">
                        <span className="text-emerald-400">{btPlayerResult.greens} GREENS</span>
                        <span className="text-rose-400">{btPlayerResult.reds} REDS</span>
                      </div>
                      <div className="h-2 bg-zinc-900 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${btPlayerResult.winRate}%` }} />
                        <div className="h-full bg-rose-500 rounded-r-full" style={{ width: `${100 - btPlayerResult.winRate}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Recent Games Table */}
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Histórico de Jogos — {btPlayerResult.displayMarket}</span>
                      <span className="text-[10px] font-black text-emerald-500/60">{btPlayerResult.totalGames} jogos</span>
                    </div>
                    <div className="divide-y divide-white/[0.03]">
                      {btPlayerResult.recentGames.slice(0, 15).map((g, i) => (
                        <div key={i} className={`px-5 py-3 flex items-center gap-4 hover:bg-white/[0.02] transition-all ${g.result === 'G' ? 'border-l-2 border-emerald-500' : 'border-l-2 border-rose-500'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${g.result === 'G' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{g.result}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-white/90 truncate">{g.homePlayer} <span className="text-zinc-600">×</span> {g.awayPlayer}</div>
                            <div className="text-[9px] text-zinc-600">{g.date}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black text-white">{g.score}</div>
                            <div className="text-[9px] text-zinc-600">HT {g.htScore}</div>
                          </div>
                          <div className="text-right shrink-0 w-12">
                            <div className={`text-sm font-black ${g.result === 'G' ? 'text-emerald-400' : 'text-zinc-600'}`}>{g.value}</div>
                            <div className="text-[8px] text-zinc-600 uppercase">gols</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── LEAGUE MODE ─── */}
          {btMode === 'league' && (
            <div className="space-y-4">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-wrap items-end gap-6">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">Liga</div>
                  <select value={btLeague} onChange={e => setBtLeague(e.target.value)}
                    className="bg-black/60 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 appearance-none cursor-pointer min-w-[200px]">
                    <option value="all">🌐 Todas as Ligas</option>
                    {availableLeagues.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">Estratégia</div>
                  <div className="flex flex-wrap gap-2">
                    {STRATEGIES.map(s => (
                      <button key={s.id} onClick={() => setBtStrategy(s.id)}
                        className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${btStrategy === s.id ? 'bg-violet-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                        <i className={`fa-solid ${s.icon} mr-1`}></i>{s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">Amostra</div>
                  <div className="flex gap-2">
                    {[10, 15, 20, 30].map(n => (
                      <button key={n} onClick={() => setBtSampleSize(n)}
                        className={`w-12 h-10 rounded-xl font-black text-sm transition-all ${btSampleSize === n ? 'bg-violet-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>{n}</button>
                    ))}
                  </div>
                </div>
                <button onClick={runLeague} disabled={btRunning || history.length < 20}
                  className="px-8 py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white font-black rounded-xl uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg flex items-center gap-2">
                  <i className="fa-solid fa-play"></i> {btRunning ? 'Calculando...' : 'RODAR BACKTEST'}
                </button>
              </div>

              {btRunning && <div className="py-16 text-center"><div className="w-10 h-10 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto mb-4"></div><p className="text-[10px] font-black text-white/20 uppercase tracking-[1em]">Simulando histórico...</p></div>}

              {!btRunning && !btLeagueResult && (
                <div className="py-24 text-center opacity-20">
                  <i className="fa-solid fa-trophy text-5xl mb-4"></i>
                  <p className="text-[10px] font-black uppercase tracking-[1.5em]">Configure e rode o backtest</p>
                </div>
              )}

              {btLeagueResult && !btRunning && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Ativações', value: btLeagueResult.activations, color: 'text-white', sub: 'Total de sinais' },
                      { label: 'Win Rate', value: `${btLeagueResult.winRate.toFixed(1)}%`, color: btLeagueResult.winRate >= 65 ? 'text-emerald-400' : btLeagueResult.winRate >= 50 ? 'text-amber-400' : 'text-rose-400', sub: `${btLeagueResult.greens}G / ${btLeagueResult.reds}R` },
                      { label: 'ROI Estimado', value: `${btLeagueResult.roi > 0 ? '+' : ''}${btLeagueResult.roi.toFixed(1)}%`, color: btLeagueResult.roi > 0 ? 'text-emerald-400' : 'text-rose-400', sub: 'Odd 1.80 base' },
                      { label: 'Conf. Média', value: `${btLeagueResult.avgConfidence.toFixed(0)}`, color: btLeagueResult.avgConfidence >= 80 ? 'text-emerald-400' : 'text-amber-400', sub: 'Score 0-100' },
                    ].map((item, i) => (
                      <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-center">
                        <div className="text-[9px] text-zinc-500 uppercase font-black mb-2">{item.label}</div>
                        <div className={`text-3xl font-black leading-none ${item.color}`}>{item.value}</div>
                        <div className="text-[9px] text-zinc-600 mt-1">{item.sub}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 px-2">
                    <TrendBadge trend={btLeagueResult.trend} />
                    <span className="text-[10px] text-zinc-500">{btLeagueResult.league} · Estratégia: {STRATEGY_THEMES[btLeagueResult.strategy]?.label || btLeagueResult.strategy.toUpperCase()}</span>
                  </div>

                  {/* Timeline */}
                  {btLeagueResult.timeline.length > 0 && (
                    <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden">
                      <div className="px-5 py-3 border-b border-white/5">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Timeline de Resultados</span>
                      </div>
                      <div className="p-4 flex flex-wrap gap-2">
                        {btLeagueResult.timeline.map((entry, i) => (
                          <div key={i} title={`${entry.homePlayer} × ${entry.awayPlayer} — ${entry.score} — ${entry.date}`}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-[9px] font-black cursor-help border transition-all hover:scale-110 ${entry.result === 'G' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/20 border-rose-500/40 text-rose-400'}`}>
                            {entry.result}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
};
