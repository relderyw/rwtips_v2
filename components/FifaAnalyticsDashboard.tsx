import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { HistoryMatch } from '../types';
import {
  runLeagueBacktest, runPlayerBacktest, generatePredictionSignals,
  BacktestResult, PlayerBacktestResult, PredictionSignal,
  getLeagueInfo, ALLOWED_LEAGUES, STRATEGY_THEMES, normalize,
  PRO_MARKETS, calculateProLeagueSummary, runScenarioGameLines, runScenarioPlayerAnalysis
} from '../services/analyzer';
import { fetchPlayers } from '../services/api';

// =========================================================
// CONSTANTS
// =========================================================
const MARKETS = [
  { id: 'over_0.5_ht', label: 'Over 0.5 HT', icon: 'fa-bolt', color: '#39D353' },
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
const MatchTooltip: React.FC<{ match: HistoryMatch; hit: number }> = ({ match, hit }) => (
  <div className="flex flex-col gap-1.5 p-2 min-w-[210px]">
    <div className="flex items-center justify-between border-b border-white/5 pb-1">
      <div className="flex items-center gap-2">
        <div className={`w-1 h-1 rounded-full ${hit ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
        <span className="text-[8px] text-zinc-400 font-black uppercase tracking-tighter">{match.league_name}</span>
      </div>
      <span className="text-[7px] text-zinc-600 font-bold">{match.data_realizacao}</span>
    </div>

    <div className="grid grid-cols-3 items-center gap-2">
      <div className="flex flex-col items-center text-center">
        <span className="text-[9px] font-black text-white uppercase leading-tight line-clamp-1 w-full">{match.home_player}</span>
        <span className="text-[6px] text-zinc-600 font-bold truncate w-full">{match.home_team}</span>
      </div>

      <div className="flex flex-col items-center bg-white/5 rounded-lg py-1 border border-white/5">
        <span className={`text-sm font-black tracking-tighter ${hit ? 'text-emerald-400' : 'text-rose-400'}`}>
          {match.score_home} - {match.score_away}
        </span>
        <span className="text-[6px] text-zinc-500 font-black uppercase tracking-widest">Final</span>
      </div>

      <div className="flex flex-col items-center text-center">
        <span className="text-[9px] font-black text-white uppercase leading-tight line-clamp-1 w-full">{match.away_player}</span>
        <span className="text-[6px] text-zinc-600 font-bold truncate w-full">{match.away_team}</span>
      </div>
    </div>

    <div className="flex items-center justify-between pt-1 border-t border-white/5">
      <div className="flex flex-col">
        <span className="text-[6px] text-zinc-500 font-black uppercase tracking-wider">HT</span>
        <span className="text-[9px] text-zinc-300 font-black">{match.halftime_score_home} - {match.halftime_score_away}</span>
      </div>
      <div className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${hit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
        {hit ? 'Green' : 'Red'}
      </div>
    </div>
  </div>
);

const DotStreak: React.FC<{ results: { hit: number; match: HistoryMatch }[]; size?: 'sm' | 'md', rowIndex?: number, align?: 'left' | 'center' | 'right' }> = ({ results, size = 'sm', rowIndex = 0, align = 'center' }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Se estiver nas primeiras linhas, mostra o tooltip para baixo
  const isTopRow = rowIndex < 2;
  const xPosition = align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';

  return (
    <div className="flex items-center gap-1 relative">
      {results.slice(0, 5).map((r, i) => (
        <div
          key={i}
          className="relative"
          onMouseEnter={() => setHoveredIdx(i)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <div
            className={`rounded-full border flex items-center justify-center font-black cursor-help transition-all hover:scale-110 ${size === 'md' ? 'w-6 h-6 text-[9px]' : 'w-4 h-4 text-[8px]'} ${r.hit === 1 ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/40' : 'bg-rose-500/20 border-rose-500/50 text-rose-400 hover:bg-rose-500/40'}`}
          >
            {r.hit === 1 ? 'G' : 'R'}
          </div>

          {hoveredIdx === i && (
            <div className={`absolute ${isTopRow ? 'top-full mt-3' : 'bottom-full mb-3'} ${xPosition} z-[500] bg-zinc-950/95 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200`}>
              <MatchTooltip match={r.match} hit={r.hit} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const TrendBadge: React.FC<{ trend: 'heating' | 'cooling' | 'stable' }> = ({ trend }) => {
  const map = {
    heating: { label: '↑ Alta', style: { background: 'rgba(57, 211, 83,0.1)', border: '1px solid rgba(57, 211, 83,0.2)', color: '#39D353' } },
    cooling: { label: '↓ Baixa', style: { background: '#13131A', border: '1px solid #1E1E28', color: '#8888A0' } },
    stable:  { label: '→ Estável', style: { background: '#13131A', border: '1px solid #1E1E28', color: '#44445A' } },
  };
  const m = map[trend];
  return <span className="px-2 py-0.5 rounded-md text-[8px] font-medium uppercase tracking-wide" style={m.style}>{m.label}</span>;
};

const SignalBadge: React.FC<{ signal: PredictionSignal['signal'] }> = ({ signal }) => {
  const map: Record<string, { label: string; style: React.CSSProperties }> = {
    strong_buy: { label: '↑ Forte Entrada', style: { background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34D399' } },
    buy:        { label: '↑ Entrada',       style: { background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', color: 'rgba(52,211,153,0.8)' } },
    neutral:    { label: '→ Neutro',        style: { background: '#13131A', border: '1px solid #1E1E28', color: '#8888A0' } },
    avoid:      { label: '✕ Evitar',        style: { background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171' } },
  };
  const m = map[signal];
  return <span className="px-2 py-0.5 rounded-md text-[9px] font-medium uppercase tracking-wide" style={m.style}>{m.label}</span>;
};

const ConfidenceBadge: React.FC<{ conf: 'high' | 'medium' | 'low'; score?: number }> = ({ conf, score }) => {
  const map: Record<string, React.CSSProperties> = {
    high:   { background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34D399' },
    medium: { background: 'rgba(57, 211, 83,0.08)', border: '1px solid rgba(57, 211, 83,0.2)', color: '#39D353' },
    low:    { background: '#13131A', border: '1px solid #1E1E28', color: '#44445A' },
  };
  const labels = { high: 'Alta', medium: 'Média', low: 'Baixa' };
  return (
    <div className="group relative inline-block">
      <span className="px-2 py-0.5 rounded-md text-[9px] font-medium cursor-help" style={map[conf]}>
        {labels[conf]}{score !== undefined && ` (${score})`}
      </span>
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-44 p-2.5 rounded-xl shadow-2xl z-[100]"
        style={{ background: '#0D0D12', border: '1px solid #1E1E28' }}>
        <p className="text-[8px] leading-relaxed" style={{ color: '#8888A0' }}>
          {conf === 'high' ? 'Base de dados sólida e padrões consistentes detectados.' :
            conf === 'medium' ? 'Padrões moderados, considere reduzir a stake.' :
              'Dados insuficientes ou alta volatilidade. Evite entradas.'}
        </p>
      </div>
    </div>
  );
};

const MarketIcon: React.FC<{ market: string }> = ({ market }) => {
  const m = MARKETS.find(x => x.id === market) || { icon: 'fa-circle', color: '#71717a' };
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10">
      <i className={`fa-solid ${m.icon} text-xs`} style={{ color: m.color }}></i>
    </div>
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
  const [btMode, setBtMode] = useState<'league' | 'player' | 'signals' | 'pro'>('pro');
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

  // ─── PRO BACKTEST STATE ───
  const [unitValue, setUnitValue] = useState(10);
  const [baseOdd, setBaseOdd] = useState(1.80);
  const [proLeagueData, setProLeagueData] = useState<any[]>([]);
  const [scenarioGameLines, setScenarioGameLines] = useState<any>(null);
  const [scenarioPlayers, setScenarioPlayers] = useState<any[]>([]);
  const [scenarioVictories, setScenarioVictories] = useState<any[]>([]);
  const [proLeagueSelected, setProLeagueSelected] = useState('all');

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

  const mostOver = useMemo(() => {
    if (!proLeagueData || proLeagueData.length === 0) return null;
    return [...proLeagueData].sort((a, b) => (b.stats['over_2.5_ft'] || 0) - (a.stats['over_2.5_ft'] || 0))[0];
  }, [proLeagueData]);

  const mostUnder = useMemo(() => {
    if (!proLeagueData || proLeagueData.length === 0) return null;
    return [...proLeagueData].sort((a, b) => (a.stats['over_1.5_ft'] || 0) - (b.stats['over_1.5_ft'] || 0))[0];
  }, [proLeagueData]);

  const nuclearOver = useMemo(() => {
    if (!proLeagueData || proLeagueData.length === 0) return null;
    return [...proLeagueData].find(l => (l.stats['over_3.5_ft'] || 0) >= 94);
  }, [proLeagueData]);

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

  const runProBacktest = useCallback(async () => {
    setBtRunning(true);
    await new Promise(r => setTimeout(r, 50));

    const summary = calculateProLeagueSummary(history, btSampleSize);
    setProLeagueData(summary);

    const gameLines = runScenarioGameLines(history, btSampleSize, baseOdd, unitValue);
    setScenarioGameLines(gameLines);

    const targetLeague = proLeagueSelected === 'all' ? (summary[0]?.league || '') : proLeagueSelected;

    const pGoals = runScenarioPlayerAnalysis(history, targetLeague, btSampleSize, baseOdd, unitValue, 'goals');
    setScenarioPlayers(pGoals);

    const pVictories = runScenarioPlayerAnalysis(history, targetLeague, btSampleSize, baseOdd, unitValue, 'victory');
    setScenarioVictories(pVictories);

    setBtRunning(false);
  }, [history, btSampleSize, baseOdd, unitValue, proLeagueSelected]);

  useEffect(() => {
    if (btMode === 'pro' && history.length > 0) {
      runProBacktest();
    }
  }, [btMode, btSampleSize, baseOdd, unitValue, proLeagueSelected]);

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── BACKTEST PRO ENGINE ── */}
      <div className="relative overflow-hidden rounded-2xl p-6" style={{ background: '#0D0D12', borderLeft: '3px solid #39D353', border: '1px solid #1E1E28', borderLeftColor: '#39D353' }}>
        <div className="absolute top-0 right-0 w-48 h-48 opacity-5 blur-[60px] pointer-events-none" style={{ background: '#39D353', borderRadius: '50%' }}></div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(57, 211, 83,0.1)', border: '1px solid rgba(57, 211, 83,0.2)' }}>
            <i className="fa-solid fa-chart-mixed text-sm" style={{ color: '#39D353' }}></i>
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: '#F0F0F4' }}>Backtest Pro Engine</h2>
            <p className="text-xs flex items-center gap-2 mt-0.5" style={{ color: '#8888A0' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#34D399' }}></span>
              Simulação em Tempo Real & Análise de Momentum de Mercado
            </p>
          </div>
        </div>
      </div>

      {/* ─── PRO MODE ─── */}
      {btMode === 'pro' && (
        <div className="space-y-5">
          {/* CONFIGURAÇÃO */}
          <div className="rounded-2xl p-5" style={{ background: '#0D0D12', border: '1px solid #1E1E28' }}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(57, 211, 83,0.1)', border: '1px solid rgba(57, 211, 83,0.2)' }}>
                <span className="text-[9px] font-bold" style={{ color: '#39D353' }}>01</span>
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888A0' }}>Configuração</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-medium uppercase tracking-wider pl-0.5" style={{ color: '#8888A0' }}>Unidade (R$)</label>
                <input type="number" value={unitValue} onChange={e => setUnitValue(Number(e.target.value))}
                  className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all"
                  style={{ background: '#13131A', border: '1px solid #1E1E28', color: '#F0F0F4' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(57, 211, 83,0.4)'}
                  onBlur={e => e.target.style.borderColor = '#1E1E28'} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-medium uppercase tracking-wider pl-0.5" style={{ color: '#8888A0' }}>Odd de Entrada</label>
                <input type="number" step="0.05" value={baseOdd} onChange={e => setBaseOdd(Number(e.target.value))}
                  className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all"
                  style={{ background: '#13131A', border: '1px solid #1E1E28', color: '#F0F0F4' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(57, 211, 83,0.4)'}
                  onBlur={e => e.target.style.borderColor = '#1E1E28'} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-medium uppercase tracking-wider pl-0.5" style={{ color: '#8888A0' }}>Amostragem</label>
                <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#13131A', border: '1px solid #1E1E28' }}>
                  {[5, 10, 15, 20].map(n => (
                    <button key={n} onClick={() => setBtSampleSize(n)}
                      className="flex-1 py-2 rounded-lg text-[9px] font-semibold transition-all"
                      style={btSampleSize === n ? { background: '#39D353', color: '#07070A' } : { color: '#44445A' }}>{n}J</button>
                  ))}
                </div>
              </div>
              <div className="flex items-end">
                <button onClick={runProBacktest} disabled={btRunning}
                  className="w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  style={{ background: '#39D353', color: '#07070A' }}>
                  {btRunning ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-rotate"></i>}
                  {btRunning ? 'Calculando...' : 'Atualizar'}
                </button>
              </div>
            </div>
          </div>

          {/* Highlights da Sessão */}
          {(mostOver || mostUnder || nuclearOver) && (
            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-500">
              {/* Nuclear Over — sem cyan, usa accent */}
              {nuclearOver && (
                <div className="relative rounded-2xl p-5 flex items-center justify-between overflow-hidden"
                  style={{ background: '#0D0D12', border: '1px solid rgba(57, 211, 83,0.25)', borderLeft: '3px solid #39D353' }}>
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.04] blur-[50px] pointer-events-none" style={{ background: '#39D353', borderRadius: '50%' }}></div>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center animate-accent-glow"
                      style={{ background: 'rgba(57, 211, 83,0.12)', border: '1px solid rgba(57, 211, 83,0.25)' }}>
                      <i className="fa-solid fa-bolt text-lg" style={{ color: '#39D353' }}></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#39D353' }}></span>
                        <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#39D353' }}>Padrão Nuclear Detectado</span>
                      </div>
                      <div className="text-lg font-semibold tracking-tight" style={{ color: '#F0F0F4' }}>{nuclearOver.league}</div>
                      <div className="text-[9px] mt-0.5" style={{ color: '#8888A0' }}>Histórico de Gols — Over 3.5 FT</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end relative z-10">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-4xl font-bold font-mono-numbers" style={{ color: '#39D353' }}>{nuclearOver.stats['over_3.5_ft']?.toFixed(0)}</span>
                      <span className="text-lg font-semibold" style={{ color: 'rgba(57, 211, 83,0.6)' }}>%</span>
                    </div>
                    <span className="text-[8px] font-medium uppercase tracking-wider mt-1" style={{ color: '#44445A' }}>Over 3.5 FT</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mostOver && (
                  <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: '#0D0D12', border: '1px solid #1E1E28' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}>
                        <i className="fa-solid fa-arrow-trend-up" style={{ color: '#34D399' }}></i>
                      </div>
                      <div>
                        <div className="text-[9px] font-medium uppercase tracking-wider mb-0.5" style={{ color: '#8888A0' }}>Liga Mais Over</div>
                        <div className="text-sm font-semibold" style={{ color: '#F0F0F4' }}>{mostOver.league}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono-numbers" style={{ color: '#34D399' }}>{(mostOver.stats['over_2.5_ft'] || 0).toFixed(0)}%</div>
                      <div className="text-[8px] font-medium uppercase" style={{ color: '#44445A' }}>Over 2.5 FT</div>
                    </div>
                  </div>
                )}
                {mostUnder && (
                  <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: '#0D0D12', border: '1px solid #1E1E28' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}>
                        <i className="fa-solid fa-arrow-trend-down" style={{ color: '#F87171' }}></i>
                      </div>
                      <div>
                        <div className="text-[9px] font-medium uppercase tracking-wider mb-0.5" style={{ color: '#8888A0' }}>Liga Mais Under</div>
                        <div className="text-sm font-semibold" style={{ color: '#F0F0F4' }}>{mostUnder.league}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono-numbers" style={{ color: '#F87171' }}>{(100 - (mostUnder.stats['over_1.5_ft'] || 0)).toFixed(0)}%</div>
                      <div className="text-[8px] font-medium uppercase" style={{ color: '#44445A' }}>Under 1.5 FT</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TABELA HEATMAP */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#0D0D12', border: '1px solid #1E1E28' }}>
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1E1E28', background: '#13131A' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(57, 211, 83,0.1)', border: '1px solid rgba(57, 211, 83,0.2)' }}>
                  <span className="text-[9px] font-bold" style={{ color: '#39D353' }}>02</span>
                </div>
                <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888A0' }}>Painel de Calor das Ligas</h3>
              </div>
              <span className="text-[9px] font-medium px-2.5 py-1 rounded-full" style={{ background: '#1E1E28', color: '#44445A' }}>
                Amostra: {btSampleSize}J
              </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ background: '#13131A' }}>
                    <th rowSpan={2} className="p-4 text-[9px] font-medium uppercase tracking-wider" style={{ color: '#44445A', borderRight: '1px solid #1E1E28' }}>Liga</th>
                    <th colSpan={4} className="p-2.5 text-[8px] font-medium uppercase tracking-wider text-center" style={{ color: '#39D353', borderBottom: '1px solid #1E1E28', borderRight: '1px solid rgba(57, 211, 83,0.15)' }}>1º Tempo (HT)</th>
                    <th colSpan={4} className="p-2.5 text-[8px] font-medium uppercase tracking-wider text-center" style={{ color: '#34D399', borderBottom: '1px solid #1E1E28' }}>Jogo Completo (FT)</th>
                  </tr>
                  <tr style={{ background: '#0D0D12' }}>
                    {PRO_MARKETS.map((m, i) => (
                      <th key={m} className="p-3 text-[8px] font-medium text-center whitespace-nowrap"
                        style={{ color: '#44445A', borderRight: `1px solid ${i === 3 ? 'rgba(57, 211, 83,0.15)' : '#161620'}` }}>
                        {m.replace('over_', '+').replace('_ht', '').replace('_ft', '').replace('btts', 'BTTS').toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {proLeagueData.map((row, i) => (
                    <tr key={i} className="transition-colors" style={{ borderTop: '1px solid #161620' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#13131A'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <td className="p-3" style={{ borderRight: '1px solid #1E1E28' }}>
                        <div className="text-sm font-medium" style={{ color: '#F0F0F4' }}>{row.league}</div>
                        <div className="text-[9px] mt-0.5" style={{ color: '#44445A' }}>{row.gamesCount} jogos</div>
                      </td>
                      {PRO_MARKETS.map((market, mi) => {
                        const val = row.stats[market] || 0;
                        // New semantic system — only green/red, no rainbow
                        let cellStyle: React.CSSProperties = {};
                        let textStyle: React.CSSProperties = { color: '#44445A' };
                        if (val >= 85)      { cellStyle = { background: 'rgba(52,211,153,0.12)' }; textStyle = { color: '#34D399', fontWeight: 600 }; }
                        else if (val >= 70) { cellStyle = { background: 'rgba(52,211,153,0.05)' }; textStyle = { color: 'rgba(52,211,153,0.75)' }; }
                        else if (val >= 50) { textStyle = { color: '#8888A0' }; }
                        else if (val > 0)   { textStyle = { color: 'rgba(248,113,113,0.7)' }; }

                        return (
                          <td key={mi} className="p-3 text-center"
                            style={{ ...cellStyle, borderRight: `1px solid ${mi === 3 ? 'rgba(57, 211, 83,0.1)' : '#161620'}` }}>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[11px] font-mono-numbers" style={textStyle}>{val.toFixed(1)}%</span>
                              <DotStreak results={row.hits[market] || []} rowIndex={i} align={mi >= 6 ? 'right' : (mi <= 2 ? 'left' : 'center')} />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CENÁRIOS DE ANÁLISE */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(57, 211, 83,0.1)', border: '1px solid rgba(57, 211, 83,0.2)' }}>
                <span className="text-[9px] font-bold" style={{ color: '#39D353' }}>03</span>
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888A0' }}>Cenários de Análise</h3>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Cenário 1: Linhas de Jogos */}
              <div className="rounded-xl p-5 space-y-4" style={{ background: '#0D0D12', border: '1px solid #1E1E28' }}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold" style={{ color: '#F0F0F4' }}>Linhas de Jogos</h4>
                  <i className="fa-solid fa-chart-line" style={{ color: '#44445A' }}></i>
                </div>
                {scenarioGameLines && (
                  <div className="space-y-5">
                    {/* Top Performers */}
                    <div className="space-y-2">
                      <div className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#34D399' }}>Melhores Oportunidades</div>
                      {scenarioGameLines.top.map((item: any, idx: number) => (
                        <div key={idx} className="rounded-xl p-3.5 flex justify-between items-center"
                          style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.12)' }}>
                          <div className="flex flex-col gap-1">
                            <div className="text-[8px] font-medium uppercase" style={{ color: '#44445A' }}>{item.league}</div>
                            <div className="text-[11px] font-semibold flex items-center gap-2" style={{ color: '#F0F0F4' }}>
                              {item.market.replace('over_', '+').toUpperCase()}
                              <TrendBadge trend={item.momentum} />
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-bold font-mono-numbers" style={{ color: item.returnCash > 0 ? '#34D399' : '#F87171' }}>
                              R$ {item.returnCash.toFixed(2)}
                            </div>
                            <div className="flex gap-1.5 justify-end mt-0.5 text-[8px] font-medium">
                              <span style={{ color: item.returnUnits > 0 ? 'rgba(52,211,153,0.7)' : 'rgba(248,113,113,0.7)' }}>
                                {item.returnUnits > 0 ? '+' : ''}{item.returnUnits.toFixed(1)}U
                              </span>
                              <span style={{ color: '#44445A' }}>·</span>
                              <span style={{ color: '#8888A0' }}>{item.roi.toFixed(1)}% ROI</span>
                            </div>
                            <div className="mt-1.5 flex justify-end"><DotStreak results={item.hits} /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Bottom Performers */}
                    <div className="space-y-2">
                      <div className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#F87171' }}>Maiores Perdas</div>
                      {scenarioGameLines.bottom.map((item: any, idx: number) => (
                        <div key={idx} className="rounded-xl p-3.5 flex justify-between items-center opacity-50 hover:opacity-100 transition-all"
                          style={{ background: '#13131A', border: '1px solid #1E1E28' }}>
                          <div>
                            <div className="text-[8px] font-medium uppercase mb-0.5" style={{ color: '#44445A' }}>{item.league}</div>
                            <div className="text-[11px] font-semibold" style={{ color: '#8888A0' }}>{item.market.replace('over_', '+').toUpperCase()}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-bold font-mono-numbers" style={{ color: '#F87171' }}>R$ {item.returnCash.toFixed(2)}</div>
                            <div className="flex gap-1.5 justify-end mt-0.5 text-[8px] font-medium">
                              <span style={{ color: 'rgba(248,113,113,0.6)' }}>{item.returnUnits.toFixed(1)}U</span>
                              <span style={{ color: '#44445A' }}>·</span>
                              <span style={{ color: '#44445A' }}>{item.roi.toFixed(1)}% ROI</span>
                            </div>
                            <div className="mt-1.5 flex justify-end"><DotStreak results={item.hits} /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cenário 2: Gols Jogador */}
              <div className="rounded-xl p-5 space-y-4" style={{ background: '#0D0D12', border: '1px solid #1E1E28' }}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold" style={{ color: '#F0F0F4' }}>Gols por Jogador</h4>
                  <select value={proLeagueSelected} onChange={e => setProLeagueSelected(e.target.value)}
                    className="rounded-lg px-2 py-1 text-[9px] font-medium outline-none"
                    style={{ background: '#13131A', border: '1px solid #1E1E28', color: '#8888A0' }}>
                    <option value="all">Todas as Ligas</option>
                    {availableLeagues.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  {scenarioPlayers.map((sig, i) => (
                    <div key={i} className="rounded-xl p-3.5 flex justify-between items-center transition-all"
                      style={{
                        background: sig.momentum === 'heating' ? 'rgba(57, 211, 83,0.04)' : '#13131A',
                        border: `1px solid ${sig.momentum === 'heating' ? 'rgba(57, 211, 83,0.15)' : '#1E1E28'}`
                      }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: '#1E1E28', border: '1px solid #2A2A35' }}>
                          <i className="fa-solid fa-user text-[8px]" style={{ color: sig.momentum === 'heating' ? '#39D353' : '#44445A' }}></i>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold truncate max-w-[110px]" style={{ color: '#F0F0F4' }}>{sig.player}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[8px] font-medium" style={{ color: '#44445A' }}>{sig.market.replace('over_', '+').toUpperCase()}</span>
                            <TrendBadge trend={sig.momentum} />
                          </div>
                          <div className="mt-1"><DotStreak results={sig.hits} /></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono-numbers" style={{ color: sig.returnCash > 0 ? '#34D399' : '#F87171' }}>R$ {sig.returnCash.toFixed(2)}</div>
                        <div className="flex gap-1.5 justify-end mt-0.5 text-[8px] font-medium">
                          <span style={{ color: sig.returnUnits > 0 ? 'rgba(52,211,153,0.7)' : 'rgba(248,113,113,0.7)' }}>
                            {sig.returnUnits > 0 ? '+' : ''}{sig.returnUnits.toFixed(1)}U
                          </span>
                          <span style={{ color: '#44445A' }}>·</span>
                          <span style={{ color: '#8888A0' }}>{sig.roi.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cenário 3: Vitória Jogador */}
              <div className="rounded-xl p-5 space-y-4" style={{ background: '#0D0D12', border: '1px solid #1E1E28' }}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold" style={{ color: '#F0F0F4' }}>Vitória por Jogador</h4>
                  <i className="fa-solid fa-crown" style={{ color: '#44445A' }}></i>
                </div>
                <div className="space-y-2">
                  {scenarioVictories.map((sig, i) => (
                    <div key={i} className="rounded-xl p-3.5 flex justify-between items-center transition-all"
                      style={{
                        background: sig.momentum === 'heating' ? 'rgba(57, 211, 83,0.04)' : '#13131A',
                        border: `1px solid ${sig.momentum === 'heating' ? 'rgba(57, 211, 83,0.15)' : '#1E1E28'}`
                      }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: '#1E1E28', border: '1px solid #2A2A35' }}>
                          <i className="fa-solid fa-crown text-[8px]" style={{ color: sig.momentum === 'heating' ? '#39D353' : '#44445A' }}></i>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold" style={{ color: '#F0F0F4' }}>{sig.player}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[8px] font-medium" style={{ color: '#44445A' }}>Vitória {(sig.winRate).toFixed(0)}%</span>
                            <TrendBadge trend={sig.momentum} />
                          </div>
                          <div className="mt-1"><DotStreak results={sig.hits} /></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono-numbers" style={{ color: sig.returnCash > 0 ? '#34D399' : '#F87171' }}>R$ {sig.returnCash.toFixed(2)}</div>
                        <div className="flex gap-1.5 justify-end mt-0.5 text-[8px] font-medium">
                          <span style={{ color: sig.returnUnits > 0 ? 'rgba(52,211,153,0.7)' : 'rgba(248,113,113,0.7)' }}>
                            {sig.returnUnits > 0 ? '+' : ''}{sig.returnUnits.toFixed(1)}U
                          </span>
                          <span style={{ color: '#44445A' }}>·</span>
                          <span style={{ color: '#8888A0' }}>{sig.roi.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
