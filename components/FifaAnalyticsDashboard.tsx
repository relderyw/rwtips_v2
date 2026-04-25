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
    <div className="group relative inline-block">
      <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase cursor-help ${map[conf]}`}>
        {conf === 'high' ? '🔒 Alta' : conf === 'medium' ? '⚠️ Média' : '📉 Baixa'}
        {score !== undefined && ` (${score})`}
      </span>
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-48 p-2 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl z-[100]">
        <p className="text-[8px] text-zinc-400 leading-tight">
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

      {/* ── BACKTEST ENGINE ── */}
      <div className="animate-in fade-in duration-500 space-y-6">
        {/* Mode selector */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { id: 'pro', label: '🏆 BACKTEST PRO', desc: 'Simulação Excel Avançada', color: 'amber' },
            { id: 'signals', label: '🎯 Sinais Preditivos', desc: 'Ranking de players por mercado', color: 'emerald' },
            { id: 'player', label: '👤 Por Player', desc: 'Backtest de um jogador específico', color: 'cyan' },
            { id: 'league', label: '🏆 Por Liga & Estratégia', desc: 'Performance histórica por liga', color: 'violet' },
          ].map(m => (
            <button key={m.id} onClick={() => setBtMode(m.id as any)}
              className={`p-4 rounded-2xl border text-left transition-all duration-300 ${btMode === m.id
                ? m.color === 'amber' ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10'
                  : m.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : m.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                      : 'bg-violet-500/10 border-violet-500/40 shadow-lg shadow-violet-500/10'
                : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}>
              <div className="text-sm font-black text-white mb-1">{m.label}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* ─── PRO MODE (EXCEL STYLE) ─── */}
        {btMode === 'pro' && (
          <div className="space-y-6">
            {/* 1º CONFIGURAÇÃO */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/40">
                  <span className="text-amber-500 font-black">1º</span>
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Configuração de Backtest</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest pl-1">Valor da Unidade (R$)</label>
                  <input type="number" value={unitValue} onChange={e => setUnitValue(Number(e.target.value))}
                    className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white font-black focus:border-amber-500/50 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest pl-1">Odd Base</label>
                  <input type="number" step="0.05" value={baseOdd} onChange={e => setBaseOdd(Number(e.target.value))}
                    className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white font-black focus:border-amber-500/50 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest pl-1">Amostra (Jogos)</label>
                  <div className="flex gap-2">
                    {[3, 5, 8, 10, 15, 20].map(n => (
                      <button key={n} onClick={() => setBtSampleSize(n)}
                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${btSampleSize === n ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>{n}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-end">
                  <button onClick={runProBacktest} disabled={btRunning}
                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black rounded-xl uppercase tracking-widest shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
                    {btRunning ? 'Processando...' : 'Atualizar Dados'}
                  </button>
                </div>
              </div>
            </div>

            {/* 2º TABELA DE LIGAS (HEATMAP) */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/40">
                    <span className="text-amber-500 font-black">2º</span>
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tighter">Resumo das Ligas</h3>
                </div>
                <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Base: Últimos {btSampleSize} Jogos</div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/40">
                      <th rowSpan={2} className="p-4 text-[10px] text-zinc-500 uppercase font-black border-r border-white/5">Ligas</th>
                      <th colSpan={4} className="p-2 text-[10px] text-amber-500 uppercase font-black text-center border-b border-r border-white/5">1º Tempo (HT)</th>
                      <th colSpan={4} className="p-2 text-[10px] text-cyan-500 uppercase font-black text-center border-b border-white/5">Jogo Completo (FT)</th>
                    </tr>
                    <tr className="bg-black/20">
                      {PRO_MARKETS.map((m, i) => (
                        <th key={m} className={`p-3 text-[9px] text-zinc-400 font-black text-center whitespace-nowrap border-r border-white/5 ${i === 3 ? 'border-r-amber-500/20' : ''}`}>
                          {m.replace('over_', '+').replace('_ht', '').replace('_ft', '').replace('btts', 'BTTS').toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {proLeagueData.map((row, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="p-4 border-r border-white/5">
                          <div className="text-xs font-black text-white group-hover:text-amber-400 transition-colors uppercase">{row.league}</div>
                          <div className="text-[8px] text-zinc-600 font-bold uppercase">{row.gamesCount} Jogos lidos</div>
                        </td>
                        {PRO_MARKETS.map((market, mi) => {
                          const val = row.stats[market] || 0;
                          // Heatmap color logic
                          let bgColor = 'bg-zinc-900/40';
                          let textColor = 'text-zinc-500';
                          if (val >= 90) { bgColor = 'bg-emerald-500/40'; textColor = 'text-emerald-100'; }
                          else if (val >= 80) { bgColor = 'bg-emerald-500/20'; textColor = 'text-emerald-400'; }
                          else if (val >= 70) { bgColor = 'bg-lime-500/20'; textColor = 'text-lime-400'; }
                          else if (val >= 50) { bgColor = 'bg-amber-500/20'; textColor = 'text-amber-400'; }
                          else if (val > 0) { bgColor = 'bg-rose-500/20'; textColor = 'text-rose-400'; }

                          return (
                            <td key={mi} className={`p-4 text-center border-r border-white/5 ${bgColor}`}>
                              <span className={`text-xs font-black ${textColor}`}>{val.toFixed(1)}%</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3º CENÁRIOS DE ANÁLISE */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/40">
                  <span className="text-amber-500 font-black">3º</span>
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Cenários de Análise</h3>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Cenário 1: Linhas de Jogos */}
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Cenário 1: Linhas de Jogos</h4>
                    <i className="fa-solid fa-chart-line text-amber-500/40"></i>
                  </div>
                  {scenarioGameLines && (
                    <div className="space-y-6">
                      {/* Top Performers */}
                      <div className="space-y-3">
                        <div className="text-[10px] text-emerald-500 font-black uppercase tracking-widest pl-1">Melhores Oportunidades (ROI)</div>
                        {scenarioGameLines.top.map((item: any, idx: number) => (
                          <div key={idx} className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex justify-between items-center">
                            <div>
                              <div className="text-[8px] text-zinc-500 font-black uppercase mb-1">{item.league}</div>
                              <div className="text-xs font-black text-white uppercase">{item.market.replace('over_', '+').toUpperCase()}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-black text-emerald-400">{item.roi.toFixed(1)}%</div>
                              <div className="text-[9px] text-zinc-500 font-bold uppercase">ROI · +{item.returnUnits.toFixed(1)}U</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Bottom Performers */}
                      <div className="space-y-3">
                        <div className="text-[10px] text-rose-500 font-black uppercase tracking-widest pl-1">Maiores Perdas</div>
                        {scenarioGameLines.bottom.map((item: any, idx: number) => (
                          <div key={idx} className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 flex justify-between items-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
                            <div>
                              <div className="text-[8px] text-zinc-500 font-black uppercase mb-1">{item.league}</div>
                              <div className="text-xs font-black text-white uppercase">{item.market.replace('over_', '+').toUpperCase()}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-black text-rose-400">{item.roi.toFixed(1)}%</div>
                              <div className="text-[9px] text-zinc-500 font-bold uppercase">ROI · {item.returnUnits.toFixed(1)}U</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cenário 2: Gols Jogador */}
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Cenário 2: Gols Jogador</h4>
                    <select value={proLeagueSelected} onChange={e => setProLeagueSelected(e.target.value)}
                      className="bg-black/60 border border-zinc-700 rounded-lg px-2 py-1 text-[10px] text-white outline-none focus:border-amber-500/50">
                      <option value="all">Todas as Ligas</option>
                      {availableLeagues.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    {scenarioPlayers.map((sig, i) => (
                      <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                            <i className="fa-solid fa-user-ninja text-cyan-500 text-[10px]"></i>
                          </div>
                          <div>
                            <div className="text-xs font-black text-white uppercase truncate max-w-[120px]">{sig.player}</div>
                            <div className="text-[8px] text-zinc-500 font-black uppercase">{sig.market.replace('over_', '+').toUpperCase()}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-white">R$ {sig.returnCash.toFixed(2)}</div>
                          <div className="text-[9px] text-emerald-400 font-bold">{sig.roi.toFixed(1)}% ROI</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cenário 3: Vitória Jogador */}
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Cenário 3: Vitória Jogador</h4>
                    <i className="fa-solid fa-trophy text-amber-500/40"></i>
                  </div>
                  <div className="space-y-3">
                    {scenarioVictories.map((sig, i) => (
                      <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                            <i className="fa-solid fa-crown text-violet-500 text-[10px]"></i>
                          </div>
                          <div>
                            <div className="text-xs font-black text-white uppercase">{sig.player}</div>
                            <div className="text-[8px] text-zinc-500 font-black uppercase">Vitória {(sig.winRate).toFixed(0)}%</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-white">+{sig.returnUnits.toFixed(1)}U</div>
                          <div className="text-[9px] text-emerald-400 font-bold">{sig.roi.toFixed(1)}% ROI</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {btSignals.map((sig, i) => (
                    <div key={i}
                      className={`relative p-5 rounded-[2rem] border transition-all overflow-hidden ${sig.signal === 'strong_buy' ? 'bg-emerald-500/[0.03] border-emerald-500/30 shadow-2xl shadow-emerald-500/5' : 'bg-white/[0.02] border-white/5'}`}>
                      {sig.signal === 'strong_buy' && (
                        <div className="absolute top-0 right-0 px-4 py-1.5 bg-emerald-500 text-black text-[9px] font-black uppercase rounded-bl-2xl tracking-tighter">
                          ⚡ ENTRADA RECOMENDADA
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-3 mb-5">
                        <div className="flex items-center gap-4">
                          <MarketIcon market={sig.market} />
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] text-zinc-500 uppercase font-black">{sig.league}</span>
                            </div>
                            <div className="text-xl font-black text-white leading-tight tracking-tight">{sig.player}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-4xl font-black text-emerald-400 leading-none">{sig.probability.toFixed(0)}%</div>
                          <div className="text-[9px] text-zinc-600 uppercase mt-1.5 font-bold">Probabilidade</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center">
                          <div className="text-[9px] text-zinc-500 uppercase font-black mb-1">Decisão</div>
                          <SignalBadge signal={sig.signal} />
                        </div>
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center">
                          <div className="text-[9px] text-zinc-500 uppercase font-black mb-1">Momento</div>
                          <TrendBadge trend={sig.trend} />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-[9px] text-zinc-500 uppercase font-black">Histórico Recente (10J)</span>
                            {sig.streak >= 2 && (
                              <span className={`text-[9px] font-black uppercase ${sig.streakType === 'G' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {sig.streak}× {sig.streakType === 'G' ? 'GREEN' : 'RED'}
                              </span>
                            )}
                          </div>
                          <DotStreak results={sig.lastN} size="md" />
                        </div>

                        {sig.reasoning.length > 0 && (
                          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                            <div className="text-[9px] text-zinc-500 uppercase font-black mb-3 tracking-widest">Análise de Risco</div>
                            <div className="space-y-2">
                              {sig.reasoning.map((r, ri) => (
                                <div key={ri} className="flex items-start gap-2 text-[10px] text-white/70 leading-relaxed">
                                  <i className="fa-solid fa-circle-check text-emerald-500/60 mt-0.5 shrink-0"></i>
                                  {r}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Confidence bar */}
                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-[9px] text-zinc-500 uppercase font-black">Índice de Confiança</span>
                            <span className="text-[10px] font-black text-white">{sig.confidence}%</span>
                          </div>
                          <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full" style={{ width: `${sig.confidence}%` }} />
                          </div>
                        </div>
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN: Summary & Stats */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                      <i className="fa-solid fa-user-gear text-6xl"></i>
                    </div>

                    <div className="relative z-10">
                      <div className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.3em] mb-2">{btPlayerResult.displayMarket}</div>
                      <h2 className="text-3xl font-black text-white mb-8 tracking-tighter">{btPlayerResult.player}</h2>

                      <div className="space-y-6">
                        <div className="bg-black/40 border border-white/5 rounded-3xl p-6 text-center">
                          <div className="text-[10px] text-zinc-500 uppercase font-black mb-2">Projeção Próximo Jogo</div>
                          <div className="text-6xl font-black text-emerald-400 leading-none tracking-tighter">{btPlayerResult.predictedProbability.toFixed(0)}%</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                            <div className="text-[9px] text-zinc-500 uppercase font-black mb-1">Win Rate</div>
                            <div className={`text-xl font-black ${btPlayerResult.winRate >= 70 ? 'text-emerald-400' : 'text-white'}`}>{btPlayerResult.winRate.toFixed(0)}%</div>
                          </div>
                          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                            <div className="text-[9px] text-zinc-500 uppercase font-black mb-1">Amostra</div>
                            <div className="text-xl font-black text-white">{btPlayerResult.totalGames}J</div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5">
                          <TrendBadge trend={btPlayerResult.trend} />
                          <ConfidenceBadge conf={btPlayerResult.confidence} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 space-y-4">
                    <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-2">Sequência Atual</div>
                    <div className="bg-black/20 rounded-2xl p-4 flex items-center justify-between">
                      <DotStreak results={btPlayerResult.lastN} size="md" />
                      <span className={`text-sm font-black ${btPlayerResult.streakType === 'G' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {btPlayerResult.currentStreak}× {btPlayerResult.streakType === 'G' ? 'GREEN' : 'RED'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Detailed History */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                      <h3 className="text-[11px] font-black text-white/60 uppercase tracking-[0.2em]">Histórico Detalhado — {btPlayerResult.displayMarket}</h3>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span className="text-[9px] font-black text-zinc-500 uppercase">{btPlayerResult.greens} GREENS</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                          <span className="text-[9px] font-black text-zinc-500 uppercase">{btPlayerResult.reds} REDS</span>
                        </div>
                      </div>
                    </div>

                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                      <div className="divide-y divide-white/[0.03]">
                        {btPlayerResult.recentGames.map((g, i) => (
                          <div key={i} className="px-8 py-4 flex items-center gap-6 hover:bg-white/[0.03] transition-all group">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-transform group-hover:scale-110 ${g.result === 'G' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                              {g.result}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{g.homePlayer}</span>
                                <span className="text-zinc-600 font-black text-[10px]">VS</span>
                                <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{g.awayPlayer}</span>
                              </div>
                              <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">{g.date}</div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-xl font-black text-white tracking-tighter">{g.score}</div>
                              <div className="text-[9px] text-zinc-500 font-black">HT {g.htScore}</div>
                            </div>

                            <div className="text-right shrink-0 w-16 px-4 py-2 bg-black/40 rounded-xl border border-white/5">
                              <div className={`text-sm font-black ${g.result === 'G' ? 'text-emerald-400' : 'text-zinc-500'}`}>{g.value}</div>
                              <div className="text-[7px] text-zinc-600 uppercase font-black">Gols/Hit</div>
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
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Ativações', value: btLeagueResult.activations, color: 'text-white', icon: 'fa-bolt-lightning', sub: 'Oportunidades encontradas' },
                    { label: 'Win Rate Global', value: `${btLeagueResult.winRate.toFixed(1)}%`, color: btLeagueResult.winRate >= 65 ? 'text-emerald-400' : 'text-rose-400', icon: 'fa-chart-pie', sub: `${btLeagueResult.greens}G / ${btLeagueResult.reds}R` },
                    { label: 'Expectativa ROI', value: `${btLeagueResult.roi > 0 ? '+' : ''}${btLeagueResult.roi.toFixed(1)}%`, color: btLeagueResult.roi > 0 ? 'text-emerald-400' : 'text-rose-400', icon: 'fa-sack-dollar', sub: 'Base odd 1.80' },
                    { label: 'Confiança Média', value: `${btLeagueResult.avgConfidence.toFixed(0)}%`, color: 'text-white', icon: 'fa-shield-halved', sub: 'Índice de assertividade' },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 relative overflow-hidden group hover:bg-white/[0.04] transition-all">
                      <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <i className={`fa-solid ${item.icon} text-5xl`}></i>
                      </div>
                      <div className="text-[9px] text-zinc-500 uppercase font-black mb-3 tracking-widest">{item.label}</div>
                      <div className={`text-3xl font-black leading-none mb-2 ${item.color}`}>{item.value}</div>
                      <div className="text-[9px] text-zinc-600 font-bold uppercase">{item.sub}</div>
                    </div>
                  ))}
                </div>

                {/* League Analysis Header */}
                <div className="bg-gradient-to-r from-violet-600/10 to-transparent border border-violet-500/20 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                      <i className="fa-solid fa-trophy text-violet-400"></i>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Análise de Contexto</div>
                      <div className="text-sm font-black text-white uppercase">{btLeagueResult.league} · {STRATEGY_THEMES[btLeagueResult.strategy]?.label || 'TODAS AS ESTRATÉGIAS'}</div>
                    </div>
                  </div>
                  <TrendBadge trend={btLeagueResult.trend} />
                </div>

                {/* Timeline & Highlights */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="px-8 py-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Timeline de Ativações</span>
                      <span className="text-[9px] font-black text-zinc-500 uppercase italic">Últimos {btLeagueResult.timeline.length} sinais detectados</span>
                    </div>
                    <div className="p-8">
                      <div className="flex flex-wrap gap-3">
                        {btLeagueResult.timeline.map((entry, i) => (
                          <div key={i} className="group relative">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-[10px] font-black cursor-help border transition-all hover:scale-110 hover:z-10 shadow-lg ${entry.result === 'G' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/20 border-rose-500/40 text-rose-400'}`}>
                              {entry.result}
                            </div>
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 hidden group-hover:block w-48 p-3 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-2">
                              <div className="text-[8px] text-zinc-500 uppercase font-black mb-1">{entry.date}</div>
                              <div className="text-[10px] font-bold text-white mb-1">{entry.homePlayer} vs {entry.awayPlayer}</div>
                              <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-1">
                                <span className="text-[9px] font-black text-white">{entry.score}</span>
                                <span className={`text-[8px] font-black uppercase ${entry.result === 'G' ? 'text-emerald-400' : 'text-rose-400'}`}>{entry.result === 'G' ? 'GREEN' : 'RED'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-center text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-violet-500/30"></div>
                    <i className="fa-solid fa-lightbulb text-violet-400/20 text-5xl mb-6"></i>
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Veredito da Análise</h4>
                    <p className="text-white font-bold leading-relaxed">
                      {btLeagueResult.winRate >= 70 ? 'Esta liga apresenta padrões altamente consistentes no momento. Ideal para operações de alta confiança.' :
                        btLeagueResult.winRate >= 55 ? 'Performance estável, mas requer atenção às variações de odd. Opere com cautela.' :
                          'Alta volatilidade detectada. Sugerimos aguardar um ciclo de aquecimento antes de novas entradas.'}
                    </p>
                    <div className="mt-8 pt-8 border-t border-white/5">
                      <div className="text-[9px] text-zinc-600 font-black uppercase mb-1">Expectativa de Acerto</div>
                      <div className="text-3xl font-black text-white">{btLeagueResult.winRate.toFixed(0)}%</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
