import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HistoryMatch } from '../types';
import {
  runLeagueBacktest, runPlayerBacktest, generatePredictionSignals,
  BacktestResult, PlayerBacktestResult, PredictionSignal,
  getLeagueInfo, ALLOWED_LEAGUES, normalize, STRATEGY_THEMES, generateStrategyReport
} from '../services/analyzer';
import { fetchConfronto, fetchPlayers } from '../services/api';

// =========================================================
// TYPES
// =========================================================
interface H2HStats {
  player1: string; player2: string; wins_p1: number; wins_p2: number; draws: number;
  wins_p1_pct: number; wins_p2_pct: number; draws_pct: number;
  outcome_dots: any[]; player1_recent_dots: any[]; player2_recent_dots: any[];
  matches: any[]; btts_pct: number; avg_goals: number;
}

interface ParsedMatch {
  ftHome: number; ftAway: number; htHome: number; htAway: number; btts: boolean; htBtts: boolean;
}

// =========================================================
// HELPERS (identical to H2HSearch logic)
// =========================================================
const parseDotsToMatches = (dots: any[], playerName: string): ParsedMatch[] => {
  if (!dots) return [];
  return dots.map(dot => {
    const toolStr = dot.tooltip || '', htStr = dot.half_time || '';
    const parts = toolStr.split(/\s*-\s*|\s*[xX]\s*/).map((p: string) => p.trim());
    if (parts.length < 2) return { ftHome: 0, ftAway: 0, htHome: 0, htAway: 0, btts: false, htBtts: false };
    const extractScore = (s: string) => { const nums = s.match(/\d+/g); return nums ? parseInt(nums[nums.length - 1]) : 0; };
    const sideA = parts[0], sideB = parts[parts.length - 1];
    const scoreA = extractScore(sideA), scoreB = extractScore(sideB);
    const pNameNorm = playerName.toLowerCase().trim();
    const isPlayerA = sideA.toLowerCase().includes(pNameNorm) || pNameNorm.includes(sideA.toLowerCase());
    const ftHome = isPlayerA ? scoreA : scoreB;
    const ftAway = isPlayerA ? scoreB : scoreA;
    const htNums = (htStr.match(/\d+/g) || [0, 0]).map(Number);
    let htHome = isPlayerA ? htNums[0] : htNums[1];
    let htAway = isPlayerA ? htNums[1] : htNums[0];
    if (htHome > ftHome || htAway > ftAway) { const sw = htAway; htAway = htHome; htHome = sw; }
    return { ftHome, ftAway, htHome, htAway, btts: ftHome > 0 && ftAway > 0, htBtts: htHome > 0 && htAway > 0 };
  });
};

const calculateMetrics = (matches: ParsedMatch[]) => {
  const total = matches.length;
  if (total === 0) return { ht_05: 0, ht_15: 0, ht_25: 0, ht_btts: 0, ft_15: 0, ft_25: 0, ft_35: 0, ft_45: 0, ft_55: 0, ft_btts: 0, avgGoals: '0.0', avgGoalsHT: '0.0', avgScored: '0.0', avgConceded: '0.0', avgScoredHT: '0.0', avgConcededHT: '0.0', winPct: 0, drawPct: 0, lossPct: 0, wins: 0, draws: 0, losses: 0 };
  const count = (fn: (m: ParsedMatch) => boolean) => matches.filter(fn).length;
  const sum = (fn: (m: ParsedMatch) => number) => matches.reduce((s, m) => s + fn(m), 0);
  return {
    ht_05: (count(m => (m.htHome + m.htAway) > 0.5) / total) * 100,
    ht_15: (count(m => (m.htHome + m.htAway) > 1.5) / total) * 100,
    ht_25: (count(m => (m.htHome + m.htAway) > 2.5) / total) * 100,
    ht_btts: (count(m => m.htBtts) / total) * 100,
    ft_15: (count(m => (m.ftHome + m.ftAway) > 1.5) / total) * 100,
    ft_25: (count(m => (m.ftHome + m.ftAway) > 2.5) / total) * 100,
    ft_35: (count(m => (m.ftHome + m.ftAway) > 3.5) / total) * 100,
    ft_45: (count(m => (m.ftHome + m.ftAway) > 4.5) / total) * 100,
    ft_55: (count(m => (m.ftHome + m.ftAway) > 5.5) / total) * 100,
    ft_btts: (count(m => m.btts) / total) * 100,
    avgGoals: (sum(m => m.ftHome + m.ftAway) / total).toFixed(1),
    avgGoalsHT: (sum(m => m.htHome + m.htAway) / total).toFixed(1),
    avgScored: (sum(m => m.ftHome) / total).toFixed(1),
    avgConceded: (sum(m => m.ftAway) / total).toFixed(1),
    avgScoredHT: (sum(m => m.htHome) / total).toFixed(1),
    avgConcededHT: (sum(m => m.htAway) / total).toFixed(1),
    wins: count(m => m.ftHome > m.ftAway),
    draws: count(m => m.ftHome === m.ftAway),
    losses: count(m => m.ftHome < m.ftAway),
    winPct: (count(m => m.ftHome > m.ftAway) / total) * 100,
    drawPct: (count(m => m.ftHome === m.ftAway) / total) * 100,
    lossPct: (count(m => m.ftHome < m.ftAway) / total) * 100,
  };
};

const getBarColor = (v: number) => v >= 80 ? '#10b981' : v >= 40 ? '#f59e0b' : '#f97316';

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
  const [subTab, setSubTab] = useState<'h2h' | 'backtest' | 'report'>('backtest');

  // ─── H2H SCOUT STATE ───
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [h2hLoading, setH2hLoading] = useState(false);
  const [h2hData, setH2hData] = useState<H2HStats | null>(null);
  const [h2hError, setH2hError] = useState('');
  const [h2hGameCount, setH2hGameCount] = useState(5);
  const [h2hStats, setH2hStats] = useState<any>(null);
  const [sugg1, setSugg1] = useState<string[]>([]);
  const [sugg2, setSugg2] = useState<string[]>([]);
  const [showSugg1, setShowSugg1] = useState(false);
  const [showSugg2, setShowSugg2] = useState(false);
  const [loadingSugg1, setLoadingSugg1] = useState(false);
  const [loadingSugg2, setLoadingSugg2] = useState(false);
  const input1Ref = useRef<HTMLInputElement>(null);
  const input2Ref = useRef<HTMLInputElement>(null);

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

  // ─── REPORT STATE ───
  const [reportLimit, setReportLimit] = useState(10);

  // Available leagues from history
  const availableLeagues = useMemo(() => {
    const set = new Set<string>();
    history.forEach(g => {
      const info = getLeagueInfo(g.league_name || '');
      if (ALLOWED_LEAGUES.includes(info.name)) set.add(info.name);
    });
    return Array.from(set).sort();
  }, [history]);

  // === H2H AUTOCOMPLETE ===
  useEffect(() => {
    const t = setTimeout(() => {
      if (player1.length >= 2) { setLoadingSugg1(true); fetchPlayers(player1).then(s => { setSugg1(s); setLoadingSugg1(false); }); }
      else setSugg1([]);
    }, 300);
    return () => clearTimeout(t);
  }, [player1]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (player2.length >= 2) { setLoadingSugg2(true); fetchPlayers(player2).then(s => { setSugg2(s); setLoadingSugg2(false); }); }
      else setSugg2([]);
    }, 300);
    return () => clearTimeout(t);
  }, [player2]);

  // === H2H STATS CALCULATION ===
  useEffect(() => {
    if (!h2hData) return;
    const p1R = parseDotsToMatches(h2hData.player1_recent_dots, player1).slice(0, h2hGameCount);
    const p2R = parseDotsToMatches(h2hData.player2_recent_dots, player2).slice(0, h2hGameCount);
    const h2hM = h2hData.matches.slice(0, h2hGameCount).map((m: any) => {
      const p1Home = m.home_player.toLowerCase().includes(player1.toLowerCase());
      return {
        ftHome: p1Home ? m.home_score_ft : m.away_score_ft,
        ftAway: p1Home ? m.away_score_ft : m.home_score_ft,
        htHome: p1Home ? m.home_score_ht : m.away_score_ht,
        htAway: p1Home ? m.away_score_ht : m.home_score_ht,
        btts: m.home_score_ft > 0 && m.away_score_ft > 0,
        htBtts: m.home_score_ht > 0 && m.away_score_ht > 0,
      };
    });
    setH2hStats({ p1: calculateMetrics(p1R), p2: calculateMetrics(p2R), h2h: calculateMetrics(h2hM) });
  }, [h2hData, h2hGameCount, player1, player2]);

  const handleH2HSearch = async () => {
    if (!player1.trim() || !player2.trim()) { setH2hError('Informe os dois jogadores'); return; }
    setH2hLoading(true); setH2hError(''); setH2hData(null); setH2hStats(null);
    try {
      const result = await fetchConfronto(player1.trim(), player2.trim());
      if (result?.matches?.length > 0) setH2hData(result);
      else setH2hError('Nenhum confronto encontrado');
    } catch { setH2hError('Erro ao buscar confronto'); }
    finally { setH2hLoading(false); }
  };

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

  // Report data
  const reportData = useMemo(() => generateStrategyReport(history, reportLimit) as any[], [history, reportLimit]);
  const globalTotals = useMemo(() => {
    const totals: Record<string, any> = {};
    reportData.forEach((item: any) => {
      Object.entries(item.strategies).forEach(([key, stats]: [string, any]) => {
        if (!totals[key]) totals[key] = { total: 0, green: 0, red: 0, sumConfidence: 0 };
        totals[key].total += stats.total; totals[key].green += stats.green;
        totals[key].red += stats.red; totals[key].sumConfidence += stats.sumConfidence || 0;
      });
    });
    return totals;
  }, [reportData]);

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── SUB-TAB NAVIGATION ── */}
      <div className="flex items-center gap-2 p-1.5 bg-white/[0.02] border border-white/5 rounded-2xl w-fit mx-auto shadow-2xl">
        {[
          { id: 'h2h', label: 'H2H SCOUT', icon: 'fa-magnifying-glass-chart', color: 'text-cyan-400', active: 'bg-cyan-500 text-black' },
          { id: 'backtest', label: 'BACKTEST ENGINE', icon: 'fa-microchip', color: 'text-emerald-400', active: 'bg-emerald-500 text-black' },
          { id: 'report', label: 'RELATÓRIO', icon: 'fa-chart-pie', color: 'text-rose-400', active: 'bg-rose-500 text-white' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id as any)}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${subTab === tab.id ? tab.active + ' shadow-lg scale-105' : tab.color + '/60 hover:' + tab.color}`}
          >
            <i className={`fa-solid ${tab.icon} text-[12px]`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── H2H SCOUT ── */}
      {subTab === 'h2h' && (
        <div className="min-h-[400px] animate-in fade-in duration-500">
          {/* Search Header */}
          <div className="bg-gradient-to-br from-zinc-900/80 to-black/80 border border-white/10 rounded-2xl p-5 mb-4 backdrop-blur-xl">
            <div className="grid grid-cols-3 gap-3">
              {/* Player 1 */}
              <div className="relative">
                <input ref={input1Ref} type="text" value={player1} onChange={e => setPlayer1(e.target.value)} onFocus={() => setShowSugg1(true)}
                  placeholder="Jogador 1 (digite para buscar)"
                  className="w-full bg-black/60 border-2 border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/60 transition-all placeholder:text-zinc-600" />
                {showSugg1 && (sugg1.length > 0 || loadingSugg1) && (
                  <div className="absolute top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                    {loadingSugg1 ? <div className="px-4 py-3 text-xs text-zinc-500">Buscando...</div> :
                      sugg1.map((name, i) => (
                        <button key={i} onClick={() => { setPlayer1(name); setSugg1([]); setShowSugg1(false); input2Ref.current?.focus(); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-800 transition-all text-white/80">{name}</button>
                      ))}
                  </div>
                )}
              </div>
              {/* Player 2 */}
              <div className="relative">
                <input ref={input2Ref} type="text" value={player2} onChange={e => setPlayer2(e.target.value)} onFocus={() => setShowSugg2(true)}
                  placeholder="Jogador 2 (digite para buscar)"
                  className="w-full bg-black/60 border-2 border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/60 transition-all placeholder:text-zinc-600" />
                {showSugg2 && (sugg2.length > 0 || loadingSugg2) && (
                  <div className="absolute top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                    {loadingSugg2 ? <div className="px-4 py-3 text-xs text-zinc-500">Buscando...</div> :
                      sugg2.map((name, i) => (
                        <button key={i} onClick={() => { setPlayer2(name); setSugg2([]); setShowSugg2(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-800 transition-all text-white/80">{name}</button>
                      ))}
                  </div>
                )}
              </div>
              <button onClick={handleH2HSearch} disabled={h2hLoading}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-black py-3 rounded-xl text-sm disabled:opacity-50 transition-all uppercase tracking-widest shadow-lg">
                {h2hLoading ? '⏳ Analisando...' : '🚀 ANALISAR'}
              </button>
            </div>
            {h2hError && <p className="mt-3 text-center text-rose-400 text-sm font-bold">{h2hError}</p>}

            {/* Players header after search */}
            {h2hData && (
              <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-bold">Jogador 1</div>
                  <div className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">{player1}</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-[10px] font-black text-zinc-500 uppercase">vs</span>
                </div>
                <div className="text-center flex-1">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-bold">Jogador 2</div>
                  <div className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">{player2}</div>
                </div>
              </div>
            )}
          </div>

          {/* H2H Results */}
          {h2hData && h2hStats && (
            <div className="space-y-4">
              {/* Game count selector */}
              <div className="flex items-center gap-3 justify-center">
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Nº de Jogos:</span>
                {[5, 10, 15].map(c => (
                  <button key={c} onClick={() => setH2hGameCount(c)}
                    className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${h2hGameCount === c ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>{c}</button>
                ))}
              </div>

              {/* Win Probabilities */}
              <div className="grid grid-cols-3 gap-4 bg-black/40 border border-white/5 rounded-2xl p-5">
                {[
                  { label: `${player1} Vence`, value: h2hStats.p1.winPct, color: 'bg-cyan-500' },
                  { label: 'Empate', value: h2hStats.p1.drawPct, color: 'bg-amber-500' },
                  { label: `${player2} Vence`, value: h2hStats.p1.lossPct, color: 'bg-rose-500' },
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-white/50 uppercase truncate">{item.label}</span>
                      <span className="text-3xl font-black text-white">{item.value.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Lines */}
              <div className="grid grid-cols-2 gap-4">
                {/* HT */}
                <div className="bg-black/40 border border-amber-500/10 rounded-2xl p-4">
                  <div className="text-[10px] font-black text-amber-400 mb-3 uppercase tracking-widest text-center">Half Time Lines</div>
                  <div className="space-y-2">
                    {[{ label: 'Over 0.5 HT', value: h2hStats.p1.ht_05 }, { label: 'Over 1.5 HT', value: h2hStats.p1.ht_15 }, { label: 'Over 2.5 HT', value: h2hStats.p1.ht_25 }, { label: 'BTTS HT', value: h2hStats.p1.ht_btts }].map((line, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="text-[10px] font-bold text-zinc-400 w-20">{line.label}</div>
                        <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${line.value}%`, backgroundColor: getBarColor(line.value) }} />
                        </div>
                        <div className="text-[10px] font-black text-amber-400 w-10 text-right">{line.value.toFixed(0)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* FT */}
                <div className="bg-black/40 border border-cyan-500/10 rounded-2xl p-4">
                  <div className="text-[10px] font-black text-cyan-400 mb-3 uppercase tracking-widest text-center">Full Time Lines</div>
                  <div className="space-y-2">
                    {[{ label: 'Over 1.5 FT', value: h2hStats.p1.ft_15 }, { label: 'Over 2.5 FT', value: h2hStats.p1.ft_25 }, { label: 'Over 3.5 FT', value: h2hStats.p1.ft_35 }, { label: 'BTTS FT', value: h2hStats.p1.ft_btts }].map((line, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="text-[10px] font-bold text-zinc-400 w-20">{line.label}</div>
                        <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${line.value}%`, backgroundColor: getBarColor(line.value) }} />
                        </div>
                        <div className="text-[10px] font-black text-cyan-400 w-10 text-right">{line.value.toFixed(0)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3-col: P1 / H2H / P2 matches */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Player 1 recent */}
                <div className="bg-[#0a0a0c] border-2 border-cyan-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-3 bg-cyan-500 rounded-full" />
                    <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Histórico: {player1}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-1 bg-zinc-900/50 rounded-xl p-2 mb-3 text-center text-[9px] font-black border border-zinc-800/50">
                    <div><div className="text-zinc-500 uppercase">V%</div><div className="text-cyan-400">{h2hStats.p1.winPct.toFixed(0)}%</div></div>
                    <div><div className="text-zinc-500 uppercase">E%</div><div className="text-amber-400">{h2hStats.p1.drawPct.toFixed(0)}%</div></div>
                    <div><div className="text-zinc-500 uppercase">GoiHT</div><div className="text-white">{h2hStats.p1.avgGoalsHT}</div></div>
                    <div><div className="text-zinc-500 uppercase">GolFT</div><div className="text-white">{h2hStats.p1.avgGoals}</div></div>
                  </div>
                  <div className="space-y-1.5">
                    {h2hData.player1_recent_dots.slice(0, 5).map((dot: any, i: number) => {
                      const h = dot.home_player || '', a = dot.away_player || '';
                      const p1N = player1.toLowerCase().trim();
                      const isHome = h.toLowerCase().includes(p1N) || p1N.includes(h.toLowerCase());
                      const ftH = isHome ? dot.home_score : dot.away_score;
                      const ftA = isHome ? dot.away_score : dot.home_score;
                      const opp = isHome ? a : h;
                      const htN = (dot.half_time?.match(/\d+/g) || [0, 0]).map(Number);
                      const htH = isHome ? htN[0] : htN[1];
                      const htA = isHome ? htN[1] : htN[0];
                      const win = ftH > ftA, loss = ftH < ftA;
                      return (
                        <div key={i} className={`bg-black border rounded-xl p-2 hover:border-cyan-500/50 transition-all ${win ? 'border-emerald-900' : loss ? 'border-rose-900' : 'border-zinc-900'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-black text-cyan-400 truncate">{player1.slice(0, 14)}</div>
                              <div className="text-[8px] text-zinc-600">{dot.date_time ? new Date(dot.date_time).toLocaleDateString() : ''}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-black"><span className={ftH > ftA ? 'text-emerald-400' : 'text-white'}>{ftH}</span><span className="text-zinc-600 mx-0.5">×</span><span className={ftA > ftH ? 'text-rose-400' : 'text-white'}>{ftA}</span></div>
                              <div className="text-[8px] text-zinc-500">HT {htH}-{htA}</div>
                            </div>
                            <div className="flex-1 text-right min-w-0">
                              <div className="text-[10px] text-zinc-500 truncate">{opp.slice(0, 10)}</div>
                              <div className={`w-1.5 h-1.5 rounded-full ml-auto mt-0.5 ${win ? 'bg-emerald-500' : loss ? 'bg-rose-500' : 'bg-amber-500'}`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* H2H Direct matches */}
                <div className="bg-[#0a0a0c] border-2 border-zinc-700/40 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-3 bg-zinc-500 rounded-full" />
                    <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Confrontos Diretos</div>
                  </div>
                  <div className="grid grid-cols-4 gap-1 bg-zinc-900/50 rounded-xl p-2 mb-3 text-center text-[9px] font-black border border-zinc-800/50">
                    <div><div className="text-zinc-500 uppercase">P1 Win</div><div className="text-cyan-400">{h2hStats.h2h.winPct.toFixed(0)}%</div></div>
                    <div><div className="text-zinc-500 uppercase">Emp</div><div className="text-amber-400">{h2hStats.h2h.drawPct.toFixed(0)}%</div></div>
                    <div><div className="text-zinc-500 uppercase">P2 Win</div><div className="text-rose-400">{h2hStats.h2h.lossPct.toFixed(0)}%</div></div>
                    <div><div className="text-zinc-500 uppercase">BTTS</div><div className="text-emerald-400">{h2hStats.h2h.ft_btts.toFixed(0)}%</div></div>
                  </div>
                  <div className="space-y-1.5">
                    {h2hData.matches.slice(0, 5).map((m: any, i: number) => {
                      const p1Home = m.home_player.toLowerCase().includes(player1.toLowerCase());
                      const p1N = p1Home ? m.home_player : m.away_player;
                      const p2N = p1Home ? m.away_player : m.home_player;
                      const p1S = p1Home ? m.home_score_ft : m.away_score_ft;
                      const p2S = p1Home ? m.away_score_ft : m.home_score_ft;
                      const p1H = p1Home ? m.home_score_ht : m.away_score_ht;
                      const p2H = p1Home ? m.away_score_ht : m.home_score_ht;
                      return (
                        <div key={i} className="bg-black border border-zinc-900 rounded-xl p-2 hover:border-zinc-700 transition-all">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0"><div className={`text-[10px] font-black truncate ${p1S > p2S ? 'text-cyan-400' : 'text-zinc-500'}`}>{p1N.slice(0, 10)}</div><div className="text-[8px] text-zinc-600">{new Date(m.match_date).toLocaleDateString()}</div></div>
                            <div className="text-center"><div className="text-lg font-black"><span className={p1S > p2S ? 'text-cyan-400' : p1S < p2S ? 'text-rose-400' : 'text-white'}>{p1S}</span><span className="text-zinc-600 mx-0.5">×</span><span className={p2S > p1S ? 'text-emerald-400' : p2S < p1S ? 'text-rose-400' : 'text-white'}>{p2S}</span></div><div className="text-[8px] text-zinc-500">HT {p1H}-{p2H}</div></div>
                            <div className="flex-1 text-right min-w-0"><div className={`text-[10px] font-black truncate ${p2S > p1S ? 'text-emerald-400' : 'text-zinc-500'}`}>{p2N.slice(0, 10)}</div></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Player 2 recent */}
                <div className="bg-[#0a0a0c] border-2 border-emerald-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                    <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Histórico: {player2}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-1 bg-zinc-900/50 rounded-xl p-2 mb-3 text-center text-[9px] font-black border border-zinc-800/50">
                    <div><div className="text-zinc-500 uppercase">V%</div><div className="text-emerald-400">{h2hStats.p2.winPct.toFixed(0)}%</div></div>
                    <div><div className="text-zinc-500 uppercase">E%</div><div className="text-amber-400">{h2hStats.p2.drawPct.toFixed(0)}%</div></div>
                    <div><div className="text-zinc-500 uppercase">GolHT</div><div className="text-white">{h2hStats.p2.avgGoalsHT}</div></div>
                    <div><div className="text-zinc-500 uppercase">GolFT</div><div className="text-white">{h2hStats.p2.avgGoals}</div></div>
                  </div>
                  <div className="space-y-1.5">
                    {h2hData.player2_recent_dots.slice(0, 5).map((dot: any, i: number) => {
                      const h = dot.home_player || '', a = dot.away_player || '';
                      const p2N = player2.toLowerCase().trim();
                      const isHome = h.toLowerCase().includes(p2N) || p2N.includes(h.toLowerCase());
                      const ftH = isHome ? dot.home_score : dot.away_score;
                      const ftA = isHome ? dot.away_score : dot.home_score;
                      const opp = isHome ? a : h;
                      const htN = (dot.half_time?.match(/\d+/g) || [0, 0]).map(Number);
                      const htH = isHome ? htN[0] : htN[1];
                      const htA = isHome ? htN[1] : htN[0];
                      const win = ftH > ftA, loss = ftH < ftA;
                      return (
                        <div key={i} className={`bg-black border rounded-xl p-2 hover:border-emerald-500/50 transition-all ${win ? 'border-emerald-900' : loss ? 'border-rose-900' : 'border-zinc-900'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0"><div className="text-[10px] font-black text-emerald-400 truncate">{player2.slice(0, 14)}</div><div className="text-[8px] text-zinc-600">{dot.date_time ? new Date(dot.date_time).toLocaleDateString() : ''}</div></div>
                            <div className="text-center"><div className="text-lg font-black"><span className={ftH > ftA ? 'text-emerald-400' : 'text-white'}>{ftH}</span><span className="text-zinc-600 mx-0.5">×</span><span className={ftA > ftH ? 'text-rose-400' : 'text-white'}>{ftA}</span></div><div className="text-[8px] text-zinc-500">HT {htH}-{htA}</div></div>
                            <div className="flex-1 text-right min-w-0"><div className="text-[10px] text-zinc-500 truncate">{opp.slice(0, 10)}</div><div className={`w-1.5 h-1.5 rounded-full ml-auto mt-0.5 ${win ? 'bg-emerald-500' : loss ? 'bg-rose-500' : 'bg-amber-500'}`} /></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!h2hData && !h2hLoading && (
            <div className="py-32 text-center opacity-20">
              <i className="fa-solid fa-magnifying-glass-chart text-6xl mb-6"></i>
              <p className="text-[10px] font-black uppercase tracking-[1.5em]">Busque dois jogadores para análise H2H</p>
            </div>
          )}
        </div>
      )}

      {/* ── BACKTEST ENGINE ── */}
      {subTab === 'backtest' && (
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
                <div className="flex-1 min-w-[200px]">
                  <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">Nome do Player</div>
                  <input type="text" value={btPlayerName} onChange={e => setBtPlayerName(e.target.value)}
                    placeholder="Ex: NEYMARJR, RONALDO..."
                    className="w-full bg-black/60 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-600" />
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
      )}

      {/* ── RELATÓRIO ── */}
      {subTab === 'report' && (
        <div className="animate-in fade-in duration-500 space-y-6">
          {/* Controls */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 flex flex-wrap items-center gap-6">
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2">Últimos X jogos (por Liga)</label>
              <div className="flex items-center gap-3">
                <input type="number" min="1" max="100" value={reportLimit} onChange={e => setReportLimit(parseInt(e.target.value) || 1)}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white/80 focus:border-rose-500/50 outline-none w-24 text-center font-black" />
                <span className="text-[10px] font-bold text-white/20 uppercase italic">Amostra de backtest</span>
              </div>
            </div>
            <div className="ml-auto px-4 py-2 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex items-center gap-3">
              <i className="fa-solid fa-bolt text-rose-500 text-[10px]"></i>
              <span className="text-[10px] font-black text-rose-400/80 uppercase tracking-widest">{Object.keys(globalTotals).length} Estratégias Ativas</span>
            </div>
          </div>

          {/* Global Totals */}
          {Object.keys(globalTotals).length > 0 && (
            <div>
              <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-4 text-center">Resumo Global de Performance</h3>
              <div className="flex flex-wrap gap-3 justify-center">
                {Object.entries(globalTotals).map(([key, stats]: [string, any]) => {
                  const theme = STRATEGY_THEMES[key] || { label: key.toUpperCase(), color: '#fff', icon: 'fa-star' };
                  const winRate = stats.total > 0 ? (stats.green / stats.total) * 100 : 0;
                  const avgConf = stats.total > 0 ? (stats.sumConfidence || 0) / stats.total : 0;
                  return (
                    <div key={key} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col items-center min-w-[140px] relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-1 bg-white/5 w-full"><div className="h-full bg-rose-500/60" style={{ width: `${avgConf}%` }} /></div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 mt-1" style={{ backgroundColor: `${theme.color}15`, border: `1px solid ${theme.color}30` }}>
                        <i className={`fa-solid ${theme.icon || 'fa-star'} text-sm`} style={{ color: theme.color }}></i>
                      </div>
                      <span className="text-[9px] font-black text-white/40 uppercase mb-1 truncate w-full text-center tracking-wider">{theme.label}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white leading-none">{winRate.toFixed(0)}%</span>
                        <span className="text-[10px] font-bold text-white/20 italic">{avgConf.toFixed(0)}% cf</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black rounded-md">{stats.green}G</span>
                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[9px] font-black rounded-md">{stats.red}R</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Report Table */}
          {reportData.length === 0 ? (
            <div className="py-20 text-center opacity-20">
              <i className="fa-solid fa-chart-pie text-5xl mb-4"></i>
              <p className="text-xs font-black uppercase tracking-widest">Aguardando dados históricos suficientes...</p>
            </div>
          ) : (
            <div className="bg-white/[0.01] border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-8 py-5 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Data / Liga</th>
                      <th className="px-8 py-5 text-[10px] font-black text-white/20 uppercase tracking-[0.2em] text-center">Assertividade</th>
                      <th className="px-8 py-5 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Estratégias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {reportData.map((item: any, idx: number) => {
                      const dayStrategies = Object.values(item.strategies) as any[];
                      const dayTotal = dayStrategies.reduce((a, s) => a + s.total, 0);
                      const dayGreen = dayStrategies.reduce((a, s) => a + s.green, 0);
                      const dayRed = dayStrategies.reduce((a, s) => a + s.red, 0);
                      const dayWinRate = dayTotal > 0 ? (dayGreen / dayTotal) * 100 : 0;
                      const lInfo = getLeagueInfo(item.league);
                      return (
                        <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: `${lInfo.color}15`, border: `1px solid ${lInfo.color}30` }}>
                                {lInfo.image ? <img src={lInfo.image} alt="" className="w-full h-full object-cover" /> : <i className="fa-solid fa-trophy text-[10px]" style={{ color: lInfo.color }}></i>}
                              </div>
                              <div>
                                <div className="text-xs font-black text-white/90 uppercase">{item.date}</div>
                                <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{item.league}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-white">{dayWinRate.toFixed(0)}%</span>
                                <span className="text-[9px] font-black text-emerald-500">{dayGreen}G</span>
                                <span className="text-[9px] font-black text-white/10">|</span>
                                <span className="text-[9px] font-black text-rose-500">{dayRed}R</span>
                              </div>
                              <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-rose-500" style={{ width: `${dayWinRate}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(item.strategies).map(([sKey, sStats]: [string, any]) => {
                                const theme = STRATEGY_THEMES[sKey] || { label: sKey.toUpperCase(), color: '#fff', icon: 'fa-star' };
                                const sConf = sStats.total > 0 ? (sStats.sumConfidence || 0) / sStats.total : 0;
                                return (
                                  <div key={sKey} className="flex flex-col gap-1 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/5 min-w-[100px]">
                                    <div className="flex items-center gap-1.5">
                                      <i className={`fa-solid ${theme.icon || 'fa-star'} text-[8px]`} style={{ color: theme.color }}></i>
                                      <span className="text-[8px] font-black text-white/80 uppercase truncate max-w-[70px]">{theme.label}</span>
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                                      <span className="text-[9px] font-black text-emerald-400">{sStats.green}</span><span className="text-[8px] text-zinc-600">/</span><span className="text-[9px] font-black text-rose-400">{sStats.red}</span>
                                      <span className="text-[8px] font-bold text-white/20 italic">{sConf.toFixed(0)}%</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
