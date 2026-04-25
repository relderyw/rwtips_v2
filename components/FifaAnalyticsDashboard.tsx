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

      {/* ── BACKTEST PRO ENGINE ── */}
      <div className="bg-gradient-to-r from-amber-600/20 to-transparent border-l-4 border-amber-500 p-6 rounded-r-2xl">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">🏆 Backtest Pro Engine</h2>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Simulação Real-Time & Análise de Momentum</p>
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
                            <div className="flex flex-col items-center gap-1.5">
                              <span className={`text-xs font-black ${textColor}`}>{val.toFixed(1)}%</span>
                              <DotStreak results={(row.hits[market] || []).slice(0, 5).map((h: any) => h === 1 ? 'G' : 'R')} size="sm" />
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
                          <div className="flex flex-col">
                            <div className="text-[8px] text-zinc-500 font-black uppercase mb-1">{item.league}</div>
                            <div className="text-xs font-black text-white uppercase flex items-center gap-2">
                              {item.market.replace('over_', '+').toUpperCase()}
                              <TrendBadge trend={item.momentum} />
                            </div>
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
                            <div className={`text-lg font-black ${item.roi > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{item.roi.toFixed(1)}%</div>
                            <div className="text-[9px] text-zinc-500 font-bold uppercase">ROI · {item.returnUnits.toFixed(1)}U</div>
                            <div className="mt-2 flex justify-end">
                              <DotStreak results={item.hits.map((h: any) => h === 1 ? 'G' : 'R')} />
                            </div>
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
                    <option value="all">Filtro: Todas as Ligas</option>
                    {availableLeagues.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  {scenarioPlayers.map((sig, i) => (
                    <div key={i} className={`bg-white/[0.03] border rounded-2xl p-4 flex justify-between items-center transition-all ${sig.momentum === 'heating' ? 'border-orange-500/30 bg-orange-500/[0.02] shadow-lg shadow-orange-500/5' : 'border-white/5'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${sig.momentum === 'heating' ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500'}`}>
                          <i className={`fa-solid ${sig.momentum === 'heating' ? 'fa-fire' : 'fa-user-ninja'} text-[10px]`}></i>
                        </div>
                        <div className="flex flex-col">
                          <div className="text-xs font-black text-white uppercase truncate max-w-[120px] mb-1">{sig.player}</div>
                          <div className="text-[8px] text-zinc-500 font-black uppercase flex items-center gap-2">
                            {sig.market.replace('over_', '+').toUpperCase()}
                            <TrendBadge trend={sig.momentum} />
                          </div>
                          <div className="mt-1">
                            <DotStreak results={sig.hits.map((h: any) => h === 1 ? 'G' : 'R')} />
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-black ${sig.returnCash > 0 ? 'text-emerald-400' : 'text-white'}`}>R$ {sig.returnCash.toFixed(2)}</div>
                        <div className="text-[9px] text-zinc-500 font-bold uppercase">{sig.roi.toFixed(1)}% ROI</div>
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
                    <div key={i} className={`bg-white/[0.03] border rounded-2xl p-4 flex justify-between items-center transition-all ${sig.momentum === 'heating' ? 'border-amber-500/30 bg-amber-500/[0.02] shadow-lg shadow-amber-500/5' : 'border-white/5'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${sig.momentum === 'heating' ? 'bg-amber-500/20 border-amber-500/40 text-amber-500' : 'bg-violet-500/10 border-violet-500/20 text-violet-500'}`}>
                          <i className="fa-solid fa-crown text-[10px]"></i>
                        </div>
                        <div className="flex flex-col">
                          <div className="text-xs font-black text-white uppercase mb-1">{sig.player}</div>
                          <div className="text-[8px] text-zinc-500 font-black uppercase flex items-center gap-2">
                            Vitória {(sig.winRate).toFixed(0)}%
                            <TrendBadge trend={sig.momentum} />
                          </div>
                          <div className="mt-1">
                            <DotStreak results={sig.hits.map((h: any) => h === 1 ? 'G' : 'R')} />
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-black ${sig.returnUnits > 0 ? 'text-emerald-400' : 'text-white'}`}>+{sig.returnUnits.toFixed(1)}U</div>
                        <div className="text-[9px] text-zinc-500 font-bold uppercase">{sig.roi.toFixed(1)}% ROI</div>
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
