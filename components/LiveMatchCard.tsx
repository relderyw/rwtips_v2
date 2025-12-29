
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LiveEvent, HistoryMatch } from '../types';
import { calculatePlayerStats, getLeagueInfo, calculateMetricProbability, normalize } from '../services/analyzer';

interface LiveMatchCardProps {
  match: LiveEvent;
  potential: string;
  confidence?: number;
  reasons?: string[];
  historicalGames: HistoryMatch[];
  onDetailClick: (match: LiveEvent) => void;
}

const STRATEGY_THEMES: Record<string, { label: string, color: string, icon: string, secondary: string }> = {
  ht_pro: { label: "HT PRO SNIPER", color: "#6366f1", secondary: "rgba(99, 102, 241, 0.15)", icon: "fa-crosshairs" },
  ft_pro: { label: "FT PRO ENGINE", color: "#f97316", secondary: "rgba(249, 115, 22, 0.15)", icon: "fa-fire-flame-simple" },
  btts_pro_ht: { label: "BTTS HT PRO", color: "#ec4899", secondary: "rgba(236, 72, 153, 0.15)", icon: "fa-arrows-rotate" },
  casa_pro: { label: "CASA DOMINANTE", color: "#10b981", secondary: "rgba(16, 185, 129, 0.15)", icon: "fa-house-circle-check" },
  fora_pro: { label: "FORA DOMINANTE", color: "#10b981", secondary: "rgba(16, 185, 129, 0.15)", icon: "fa-plane-arrival" },
  casa_engine_pro: { label: "CASA ENGINE", color: "#06b6d4", secondary: "rgba(6, 182, 212, 0.15)", icon: "fa-gears" },
  fora_engine_pro: { label: "FORA ENGINE", color: "#06b6d4", secondary: "rgba(6, 182, 212, 0.15)", icon: "fa-microchip" },
  top_clash: { label: "ELITE CLASH", color: "#eab308", secondary: "rgba(234, 179, 8, 0.15)", icon: "fa-crown" },
  none: { label: "", color: "transparent", secondary: "transparent", icon: "" }
};

const FormDots = ({ results, stats }: { results: string[], stats: any }) => {
  return (
    <div className="flex gap-1.5 justify-center mt-2" style={{ isolation: 'isolate' }}>
      {results.map((r, i) => {
        const game = stats.lastMatches && stats.lastMatches[i];
        if (!game) return null;

        const isWin = r === 'W';
        const isDraw = r === 'D';
        const statusText = isWin ? "VITÓRIA" : isDraw ? "EMPATE" : "DERROTA";

        // Cores baseadas no resultado
        const resultColor = isWin ? '#10b981' : isDraw ? '#facc15' : '#ef4444';
        const shadowColor = isWin ? 'rgba(16,185,129,0.5)' : isDraw ? 'rgba(250,204,21,0.5)' : 'rgba(239,68,68,0.5)';

        const dateObj = new Date(game.data_realizacao);
        const formattedDate = dateObj.toLocaleDateString('pt-BR');
        const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        return (
          <div key={i} className="group/dot relative flex flex-col items-center">
            {/* Bolinha */}
            <div
              className="w-2.5 h-2.5 rounded-full cursor-help transition-all duration-300 hover:scale-125 shadow-lg shadow-black/60"
              style={{ backgroundColor: resultColor }}
            ></div>

            {/* Pop-up (Tooltip) - Estilo Imagem Solicitada */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover/dot:opacity-100 transition-all duration-300 pointer-events-none z-[9999] flex flex-col items-center transform scale-90 group-hover/dot:scale-100 origin-bottom">
              <div className="bg-[#000000] border border-white/10 p-3 rounded-xl shadow-[0_30px_70px_rgba(0,0,0,1)] min-w-[160px] text-center flex flex-col items-center">

                {/* Texto Superior (Status) */}
                <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1.5">{statusText}</span>

                {/* Nomes dos Jogadores do histórico */}
                <h5 className="text-[11px] font-black text-white/90 mb-2 tracking-tight whitespace-nowrap">
                  {game.home_player} <span className="text-white/30 mx-0.5">x</span> {game.away_player}
                </h5>

                {/* Pill do Placar (Cor sincronizada com a bolinha) */}
                <div
                  className="px-5 py-1.5 rounded-full mb-2 border border-white/20 shadow-xl"
                  style={{
                    backgroundColor: resultColor,
                    boxShadow: `0 4px 15px ${shadowColor}`
                  }}
                >
                  <span className="text-sm font-black text-white tabular-nums tracking-tight">
                    {game.score_home} - {game.score_away}
                  </span>
                </div>

                {/* Data e Hora */}
                <span className="text-[9px] font-bold text-white/50 mb-1.5 tracking-tight font-mono-numbers">
                  {formattedDate} {formattedTime}
                </span>

                {/* Placar HT */}
                <div className="bg-white/5 w-full py-1 rounded-lg border border-white/[0.04]">
                  <span className="text-[10px] font-black text-white/70 uppercase tracking-wider">HT {game.halftime_score_home}-{game.halftime_score_away}</span>
                </div>
              </div>

              {/* Seta do Pop-up (Preta) */}
              <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-[#000000] -mt-[1px]"></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const LiveMatchCard: React.FC<LiveMatchCardProps> = ({ match, potential, confidence, reasons, historicalGames, onDetailClick }) => {
  const [activeTab, setActiveTab] = useState<'HT' | 'FT'>('FT');
  const [activePlayerTab, setActivePlayerTab] = useState<'H' | 'A'>('H');

  const leagueInfo = getLeagueInfo(match.leagueName);

  const syncLimit = useMemo(() => {
    const n1 = normalize(match.homePlayer);
    const n2 = normalize(match.awayPlayer);
    const count1 = historicalGames.filter(g => normalize(g.home_player) === n1 || normalize(g.away_player) === n1).length;
    const count2 = historicalGames.filter(g => normalize(g.home_player) === n2 || normalize(g.away_player) === n2).length;
    return Math.max(1, Math.min(count1, count2, 5));
  }, [match.homePlayer, match.awayPlayer, historicalGames]);

  const p1 = useMemo(() => calculatePlayerStats(match.homePlayer, historicalGames, syncLimit), [match.homePlayer, historicalGames, syncLimit]);
  const p2 = useMemo(() => calculatePlayerStats(match.awayPlayer, historicalGames, syncLimit), [match.awayPlayer, historicalGames, syncLimit]);

  const [scoreState, setScoreState] = useState({ home: match.score.home, away: match.score.away, animating: false });
  const prevScoreRef = useRef(match.score);

  useEffect(() => {
    if (prevScoreRef.current.home !== match.score.home || prevScoreRef.current.away !== match.score.away) {
      setScoreState({ ...match.score, animating: true });
      const timer = setTimeout(() => {
        setScoreState(prev => ({ ...prev, animating: false }));
      }, 600);
      prevScoreRef.current = match.score;
      return () => clearTimeout(timer);
    }
  }, [match.score.home, match.score.away]);

  const isHT = activeTab === 'HT';
  const theme = STRATEGY_THEMES[potential] || STRATEGY_THEMES.none;
  const isSignaled = potential !== 'none';

  const getDynamicColor = (value: number, opacity: number = 1) => {
    const hue = Math.min(Math.max(value * 1.2, 0), 120);
    return `hsla(${hue}, 80%, 45%, ${opacity})`;
  };

  const MetricRow = ({ label, value }: { label: string, value: number }) => {
    const mainColor = getDynamicColor(value, 1);
    const glowColor = getDynamicColor(value, 0.4);

    return (
      <div className="flex items-center gap-2.5 mb-2 last:mb-0 group/row">
        {/* Label - Fixed width for alignment */}
        <div className="w-[48px] shrink-0">
          <span className="text-[9px] font-black text-white/50 uppercase tracking-tighter group-hover/row:text-white/80 transition-colors whitespace-nowrap">{label}</span>
        </div>

        {/* Progress Bar Container */}
        <div className="flex-1 h-[7px] bg-black/40 rounded-full overflow-hidden border border-white/[0.04] relative shadow-inner">
          <div
            className="h-full progress-bar-fill transition-all duration-1000 ease-out relative"
            style={{
              width: `${value}%`,
              backgroundColor: mainColor,
              boxShadow: `0 0 12px ${glowColor}`
            }}
          >
            {/* Glossy overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-30"></div>
          </div>
        </div>

        {/* % Value */}
        <div className="w-[32px] text-right shrink-0">
          <span className="text-[11px] font-black font-mono-numbers tabular-nums translate-y-[0.5px] inline-block" style={{ color: mainColor }}>
            {value.toFixed(0)}%
          </span>
        </div>
      </div>
    );
  };

  const playerMetrics = useMemo(() => {
    const name = activePlayerTab === 'H' ? match.homePlayer : match.awayPlayer;
    return {
      m05: calculateMetricProbability(name, historicalGames, 'target0.5', isHT, syncLimit),
      m15: calculateMetricProbability(name, historicalGames, 'target1.5', isHT, syncLimit),
      m25: calculateMetricProbability(name, historicalGames, 'target2.5', isHT, syncLimit),
    };
  }, [activePlayerTab, match.homePlayer, match.awayPlayer, historicalGames, isHT, syncLimit]);

  const bet365Url = match.bet365EventId
    ? `https://www.bet365.bet.br/#/IP/EV${match.bet365EventId}`
    : "https://www.bet365.bet.br";

  return (
    <div
      className={`relative bg-[#0d0d0f] rounded-2xl border flex flex-col transition-all duration-500 h-full min-h-[480px] ${isSignaled ? 'scale-[1.01] shadow-[0_0_40px_rgba(0,0,0,0.8)]' : 'card-glow border-white/5'}`}
      style={{
        borderColor: isSignaled ? theme.color : 'rgba(255,255,255,0.05)',
        boxShadow: isSignaled ? `0 0 20px ${theme.secondary}, 0 20px 40px rgba(0,0,0,0.6)` : '',
        borderLeft: isSignaled ? `6px solid ${theme.color}` : `5px solid ${leagueInfo.color}`,
        overflow: 'visible'
      }}
    >
      {/* STRATEGY & CONFIDENCE INTEGRATED HEADER */}
      {isSignaled && (
        <div className="mx-2 mt-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-md relative overflow-hidden group">
          {/* Background Glow Effect */}
          <div className="absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20" style={{ background: `radial-gradient(circle at top right, ${theme.color}, transparent)` }}></div>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg border" style={{ backgroundColor: `${theme.color}20`, borderColor: `${theme.color}40` }}>
                <i className={`fa-solid ${theme.icon} text-xs animate-pulse`} style={{ color: theme.color }}></i>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-wider leading-none mb-1" style={{ color: theme.color }}>
                  {theme.label}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {reasons && reasons.map((r, i) => (
                    <span key={i} className="text-[7px] font-bold text-white/30 uppercase tracking-tighter italic">{r}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Confiança</span>
                <span className="text-sm font-black italic tabular-nums" style={{ color: confidence && confidence >= 85 ? '#10b981' : confidence && confidence >= 75 ? '#facc15' : '#fff' }}>
                  {confidence}%
                </span>
              </div>
              <div className="w-16 h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full transition-all duration-1000"
                  style={{
                    width: `${confidence}%`,
                    backgroundColor: confidence && confidence >= 85 ? '#10b981' : confidence && confidence >= 75 ? '#facc15' : '#6366f1'
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header do Card */}
      <div className="p-3.5 pb-2.5 flex items-center justify-between border-b border-white/[0.04] bg-white/[0.005] rounded-t-2xl relative z-10">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-black/40 p-2 border border-white/5 shrink-0 flex items-center justify-center shadow-2xl">
            <img src={leagueInfo.image} className="w-full h-full object-contain brightness-110" alt="" />
          </div>
          <div className="flex flex-col min-w-0">
            <h4 className="text-[14px] font-black text-white uppercase tracking-tight truncate leading-tight mb-1">
              {match.homePlayer} <span className="text-white/20 italic mx-0.5">vs</span> {match.awayPlayer}
            </h4>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider truncate">
              {leagueInfo.name}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 ml-1 shrink-0">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-2.5 py-1.5 shadow-inner">
            <span className="text-[12px] font-mono-numbers font-black text-emerald-400 tracking-tighter">{match.timer.formatted}</span>
          </div>
        </div>
      </div>

      <div className="p-3 pb-2.5 flex flex-col gap-2.5 flex-1 relative z-10">
        <div className="flex items-center justify-between bg-black/40 p-3 rounded-2xl border border-white/[0.03] shadow-inner">
          <div className="text-center flex-1 min-w-0">
            <h3 className="text-[11px] font-black text-white/80 uppercase truncate mb-1">{match.homePlayer}</h3>
            {p1.lastMatches && p1.lastMatches.length >= 3 ? (
              <FormDots results={p1.last5} stats={p1} />
            ) : (
              <div className="mt-2 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wider">Dados Insuficientes</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center mx-1 shrink-0">
            <div className={`bg-[#050505] px-3 py-1.5 rounded-xl border border-white/10 shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] min-w-[70px] text-center transform scale-105 transition-all duration-300 ${scoreState.animating ? 'animate-score-pop border-emerald-500/50' : ''}`}>
              <div className="flex items-center justify-center italic font-black text-2xl tabular-nums drop-shadow-xl">
                <span className={`transition-all duration-300 ${scoreState.animating && prevScoreRef.current.home !== match.score.home ? 'text-white scale-125' : 'text-emerald-400'}`}>
                  {match.score.home}
                </span>
                <span className="text-white/20 mx-0.5">–</span>
                <span className={`transition-all duration-300 ${scoreState.animating && prevScoreRef.current.away !== match.score.away ? 'text-white scale-125' : 'text-emerald-400'}`}>
                  {match.score.away}
                </span>
              </div>
            </div>
          </div>

          <div className="text-center flex-1 min-w-0">
            <h3 className="text-[11px] font-black text-white/80 uppercase truncate mb-1">{match.awayPlayer}</h3>
            {p2.lastMatches && p2.lastMatches.length >= 3 ? (
              <FormDots results={p2.last5} stats={p2} />
            ) : (
              <div className="mt-2 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wider">Dados Insuficientes</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-black/20 p-2 rounded-xl border border-white/[0.02] flex-1">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <i className="fa-solid fa-bolt text-emerald-400 text-[10px]"></i>
              <span className="text-[10px] font-black text-white/50 uppercase tracking-widest truncate flex items-center gap-1.5">
                Linhas confronto <span className={syncLimit < 5 ? 'text-amber-500' : ''}>({syncLimit}J)</span>
                {syncLimit < 5 && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>}
              </span>
            </div>
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 shrink-0 shadow-sm">
              <button onClick={() => setActiveTab('HT')} className={`px-2.5 py-1 text-[9px] font-black rounded-lg transition-all ${isHT ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}>HT</button>
              <button onClick={() => setActiveTab('FT')} className={`px-2.5 py-1 text-[9px] font-black rounded-lg transition-all ${!isHT ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}>FT</button>
            </div>
          </div>

          <div className="space-y-0.5">
            {isHT ? (
              <>
                <MetricRow label="0.5 HT" value={(p1.htOver05Rate + p2.htOver05Rate) / 2} />
                <MetricRow label="1.5 HT" value={(p1.htOver15Rate + p2.htOver15Rate) / 2} />
                <MetricRow label="2.5 HT" value={(p1.htOver25Rate + p2.htOver25Rate) / 2} />
                <MetricRow label="BTTS HT" value={(p1.htBttsRate + p2.htBttsRate) / 2} />
              </>
            ) : (
              <>
                <MetricRow label="1.5 FT" value={(p1.ft15Rate + p2.ft15Rate) / 2} />
                <MetricRow label="2.5 FT" value={(p1.ftOver25Rate + p2.ftOver25Rate) / 2} />
                <MetricRow label="3.5 FT" value={(p1.ft35Rate + p2.ft35Rate) / 2} />
                <MetricRow label="BTTS FT" value={(p1.ftBttsRate + p2.ftBttsRate) / 2} />
              </>
            )}
          </div>
        </div>

        <div className="bg-black/20 p-2 rounded-xl border border-white/[0.02]">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <i className="fa-solid fa-chart-line text-emerald-400 text-[10px]"></i>
              <span className="text-[10px] font-black text-white/50 uppercase tracking-widest truncate flex items-center gap-1.5">
                Linhas Players <span className={syncLimit < 5 ? 'text-amber-500' : ''}>({syncLimit}J)</span>
                {syncLimit < 5 && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>}
              </span>
            </div>
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 shrink-0 max-w-[130px]">
              <button onClick={() => setActivePlayerTab('H')} className={`px-2 py-1 text-[9px] font-black rounded-lg transition-all truncate flex-1 ${activePlayerTab === 'H' ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}>{match.homePlayer}</button>
              <button onClick={() => setActivePlayerTab('A')} className={`px-2 py-1 text-[9px] font-black rounded-lg transition-all truncate flex-1 ${activePlayerTab === 'A' ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}>{match.awayPlayer}</button>
            </div>
          </div>
          <div className="space-y-0.5">
            <MetricRow label={`0.5 ${isHT ? 'HT' : 'FT'}`} value={playerMetrics.m05} />
            <MetricRow label={`1.5 ${isHT ? 'HT' : 'FT'}`} value={playerMetrics.m15} />
            <MetricRow label={`2.5 ${isHT ? 'HT' : 'FT'}`} value={playerMetrics.m25} />
          </div>
        </div>

        <div className="flex gap-3 pt-2 mt-auto">
          <button onClick={() => onDetailClick(match)} className="flex-[0.8] bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg group">
            ANÁLISE <i className="fa-solid fa-microchip text-[10px] text-emerald-500/60 group-hover:scale-125 transition-transform"></i>
          </button>
          <a href={bet365Url} target="_blank" rel="noopener noreferrer" className="flex-1 bg-bet365 hover:brightness-110 border border-white/5 py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center group shadow-2xl">
            <img src="https://www.bet365.bet.br/sports-assets/sports/HeaderReactModule/assets/bet365_Logo_Inline.svg" className="h-3 group-hover:scale-110 transition-transform" alt="" />
          </a>
        </div>
      </div>
    </div>
  );
};
