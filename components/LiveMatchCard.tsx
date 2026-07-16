
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LiveEvent, HistoryMatch } from '../types';
import { calculatePlayerStats, getLeagueInfo, calculateMetricProbability, normalize } from '../services/analyzer';
import { toast } from 'sonner';

// Helper for URL slugs
const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
};

interface LiveMatchCardProps {
  match: LiveEvent;
  potential: string;
  confidence?: number;
  reasons?: string[];
  historicalGames: HistoryMatch[];
  onDetailClick: (match: LiveEvent) => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

// All strategies map to accent — differentiation is by LABEL + ICON, not color
const STRATEGY_THEMES: Record<string, { label: string; icon: string }> = {
  ht_pro:         { label: "HT PRO SNIPER",   icon: "fa-crosshairs" },
  ft_pro:         { label: "FT PRO ENGINE",   icon: "fa-fire-flame-simple" },
  btts_pro_ht:    { label: "BTTS HT PRO",     icon: "fa-arrows-rotate" },
  btts_pro_ft:    { label: "BTTS FT PRO",     icon: "fa-arrows-rotate" },
  casa_pro:       { label: "CASA DOMINANTE",  icon: "fa-house-circle-check" },
  fora_pro:       { label: "FORA DOMINANTE",  icon: "fa-plane-arrival" },
  casa_engine_pro:{ label: "CASA ENGINE",     icon: "fa-gears" },
  fora_engine_pro:{ label: "FORA ENGINE",     icon: "fa-microchip" },
  top_clash:      { label: "ELITE CLASH",     icon: "fa-crown" },
  none:           { label: "",                icon: "" },
};

// Form dots — purely semantic (W/D/L)
const FormDots = ({ results, stats }: { results: string[]; stats: any }) => {
  return (
    <div className="flex gap-1.5 justify-center mt-2" style={{ isolation: 'isolate' }}>
      {results.map((r, i) => {
        const game = stats.lastMatches && stats.lastMatches[i];
        if (!game) return null;

        const isWin = r === 'W';
        const isDraw = r === 'D';
        const dotColor = isWin ? '#34D399' : isDraw ? '#4ade80' : '#F87171';
        const statusText = isWin ? "VITÓRIA" : isDraw ? "EMPATE" : "DERROTA";

        const dateObj = new Date(game.data_realizacao);
        const formattedDate = dateObj.toLocaleDateString('pt-BR');
        const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        return (
          <div key={i} className="group/dot relative flex flex-col items-center">
            <div
              className="w-2.5 h-2.5 rounded-full cursor-help transition-transform duration-200 hover:scale-125"
              style={{ backgroundColor: dotColor }}
            ></div>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover/dot:opacity-100 transition-all duration-200 pointer-events-none z-[9999] flex flex-col items-center scale-95 group-hover/dot:scale-100 origin-bottom">
              <div className="rounded-xl p-3 min-w-[152px] text-center flex flex-col items-center gap-1.5"
                style={{ background: '#0D0D12', border: '1px solid #1E1E28', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }}>
                <span className="text-[8px] font-medium uppercase tracking-wider" style={{ color: dotColor }}>{statusText}</span>
                <h5 className="text-[10px] font-semibold whitespace-nowrap" style={{ color: '#F0F0F4' }}>
                  {game.home_player} <span style={{ color: '#44445A' }}>×</span> {game.away_player}
                </h5>
                <div className="px-4 py-1 rounded-full" style={{ background: dotColor + '20', border: `1px solid ${dotColor}40` }}>
                  <span className="text-sm font-bold tabular-nums" style={{ color: dotColor }}>
                    {game.score_home} – {game.score_away}
                  </span>
                </div>
                <span className="text-[8px] font-mono-numbers" style={{ color: '#44445A' }}>
                  {formattedDate} {formattedTime}
                </span>
                <div className="w-full rounded-lg py-1" style={{ background: '#13131A', border: '1px solid #1E1E28' }}>
                  <span className="text-[9px] font-medium" style={{ color: '#8888A0' }}>HT {game.halftime_score_home}–{game.halftime_score_away}</span>
                </div>
              </div>
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] -mt-px" style={{ borderTopColor: '#1E1E28' }}></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const LiveMatchCard: React.FC<LiveMatchCardProps> = ({ match, potential, confidence, reasons, historicalGames, onDetailClick, isPinned, onTogglePin }) => {
  const [activeTab, setActiveTab] = useState<'HT' | 'FT'>('FT');

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
      const timer = setTimeout(() => setScoreState(prev => ({ ...prev, animating: false })), 600);
      prevScoreRef.current = match.score;
      return () => clearTimeout(timer);
    }
  }, [match.score.home, match.score.away]);

  const isHT = activeTab === 'HT';
  const isSignaled = potential !== 'none' && (confidence ?? 0) >= 75;
  const theme = STRATEGY_THEMES[potential] || STRATEGY_THEMES.none;

  // Dual metric bar — shows both players' stats mirrored from center
  const DualMetricRow = ({ label, homeValue, awayValue }: { label: string; homeValue: number; awayValue: number }) => {
    const getBarColor = (v: number) => v >= 70 ? '#34D399' : v >= 50 ? 'rgba(57, 211, 83,0.75)' : 'rgba(248,113,113,0.6)';
    const getTextColor = (v: number) => v >= 70 ? '#34D399' : v >= 50 ? '#39D353' : '#F87171';

    return (
      <div className="flex items-center gap-1 py-[3px]">
        {/* Home percentage */}
        <div className="w-[30px] text-left shrink-0">
          <span className="text-[10px] font-bold font-mono-numbers tabular-nums" style={{ color: getTextColor(homeValue) }}>
            {homeValue.toFixed(0)}%
          </span>
        </div>
        {/* Home bar (right-aligned, grows from center outward) */}
        <div className="flex-1 h-[4px] rounded-full overflow-hidden flex justify-end" style={{ background: '#161620' }}>
          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${homeValue}%`, background: getBarColor(homeValue) }}></div>
        </div>
        {/* Label (center) */}
        <div className="w-[48px] text-center shrink-0">
          <span className="text-[8px] font-semibold uppercase" style={{ color: '#6B6B80' }}>{label}</span>
        </div>
        {/* Away bar (left-aligned, grows from center outward) */}
        <div className="flex-1 h-[4px] rounded-full overflow-hidden" style={{ background: '#161620' }}>
          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${awayValue}%`, background: getBarColor(awayValue) }}></div>
        </div>
        {/* Away percentage */}
        <div className="w-[30px] text-right shrink-0">
          <span className="text-[10px] font-bold font-mono-numbers tabular-nums" style={{ color: getTextColor(awayValue) }}>
            {awayValue.toFixed(0)}%
          </span>
        </div>
      </div>
    );
  };

  const homePlayerMetrics = useMemo(() => ({
    m05: calculateMetricProbability(match.homePlayer, historicalGames, 'target0.5', isHT, syncLimit),
    m15: calculateMetricProbability(match.homePlayer, historicalGames, 'target1.5', isHT, syncLimit),
    m25: calculateMetricProbability(match.homePlayer, historicalGames, 'target2.5', isHT, syncLimit),
  }), [match.homePlayer, historicalGames, isHT, syncLimit]);

  const awayPlayerMetrics = useMemo(() => ({
    m05: calculateMetricProbability(match.awayPlayer, historicalGames, 'target0.5', isHT, syncLimit),
    m15: calculateMetricProbability(match.awayPlayer, historicalGames, 'target1.5', isHT, syncLimit),
    m25: calculateMetricProbability(match.awayPlayer, historicalGames, 'target2.5', isHT, syncLimit),
  }), [match.awayPlayer, historicalGames, isHT, syncLimit]);

  const isAltenarLeague = match.leagueName.toLowerCase().includes('valhalla') ||
    match.leagueName.toLowerCase().includes('valkyrie');

  let bookmakerUrl = '';
  let bookmakerName = '';
  let bookmakerLogo = '';

  if (isAltenarLeague) {
    bookmakerUrl = match.bet365EventId
      ? `https://www.estrelabet.bet.br/apostas-ao-vivo?page=liveEvent&eventId=${match.bet365EventId}&sportId=66`
      : "https://www.estrelabet.bet.br/apostas-ao-vivo";
    bookmakerName = 'ESTRELA BET';
    bookmakerLogo = 'https://assets.staradm.com/estrelabet_favicon.ico';
  } else {
    const homeStr = match.homeTeamName ? `${match.homeTeamName} ${match.homePlayer}` : match.homePlayer;
    const awayStr = match.awayTeamName ? `${match.awayTeamName} ${match.awayPlayer}` : match.awayPlayer;
    const matchSlug = createSlug(`${homeStr} x ${awayStr}`);
    let eventId = match.id.replace(/\D/g, '');
    if (!eventId) eventId = 'v2';
    bookmakerUrl = `https://superbet.bet.br/odds/e-sport-futebol/${matchSlug}-${eventId}/?t=offer-live-82545&mdt=o`;
    bookmakerName = 'SUPERBET';
    bookmakerLogo = 'https://superbet.bet.br/static/img/icons/favicon.ico';
  }

  return (
    <div
      className={`relative flex flex-col transition-all duration-300 h-full min-h-[420px] rounded-xl overflow-visible ${isSignaled ? 'animate-accent-glow' : ''}`}
      style={{
        background: '#0D0D12',
        border: `1px solid ${isSignaled ? 'rgba(57, 211, 83,0.3)' : '#1E1E28'}`,
        borderLeft: `3px solid ${isSignaled ? '#39D353' : leagueInfo.color + '60'}`,
        boxShadow: isSignaled ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(57, 211, 83,0.1)' : '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      {/* SIGNAL PANEL — Compact */}
      {potential !== 'none' && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-xl"
          style={{
            background: isSignaled ? 'rgba(57, 211, 83,0.06)' : '#13131A',
            border: `1px solid ${isSignaled ? 'rgba(57, 211, 83,0.2)' : '#1E1E28'}`,
          }}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${!isSignaled ? 'opacity-40' : ''}`}>
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: isSignaled ? 'rgba(57, 211, 83,0.12)' : '#1E1E28', border: `1px solid ${isSignaled ? 'rgba(57, 211, 83,0.25)' : '#1E1E28'}` }}>
                <i className={`fa-solid ${theme.icon} text-[9px]`} style={{ color: isSignaled ? '#39D353' : '#44445A' }}></i>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: isSignaled ? '#39D353' : '#44445A' }}>
                {theme.label}
                {!isSignaled && <span className="ml-1.5 text-[7px] font-normal" style={{ color: '#44445A' }}>OBSERVANDO</span>}
              </span>
            </div>

            <div className={`flex items-center gap-2 ${!isSignaled ? 'opacity-30' : ''}`}>
              <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: '#1E1E28' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${confidence}%`, background: confidence && confidence >= 85 ? '#34D399' : confidence && confidence >= 75 ? '#39D353' : '#F87171' }}></div>
              </div>
              <span className="text-xs font-bold tabular-nums font-mono-numbers"
                style={{ color: confidence && confidence >= 85 ? '#34D399' : confidence && confidence >= 75 ? '#39D353' : '#F87171' }}>
                {confidence}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Card Header — League + Players */}
      <div className="p-3.5 pb-2 flex items-center justify-between" style={{ borderBottom: '1px solid #161620' }}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* League dot + image */}
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 p-2" style={{ background: '#13131A', border: '1px solid #1E1E28' }}>
            <img src={leagueInfo.image} className="w-full h-full object-contain" alt="" />
          </div>
          <div className="flex flex-col min-w-0">
            {/* Players — white, no league color */}
            <h4 className="text-[13px] font-semibold truncate leading-tight mb-0.5" style={{ color: '#F0F0F4' }}>
              {match.homePlayer} <span style={{ color: '#44445A' }}>vs</span> {match.awayPlayer}
            </h4>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: leagueInfo.color }}></div>
              <span className="text-[10px] font-medium truncate" style={{ color: '#8888A0' }}>{leagueInfo.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-2 shrink-0">
          {onTogglePin && (
            <button onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ background: '#13131A', border: '1px solid #1E1E28' }}
              title={isPinned ? "Desfixar" : "Fixar"}>
              <i className={`fa-solid fa-star text-xs ${isPinned ? '' : 'opacity-30 hover:opacity-60'}`}
                style={{ color: isPinned ? '#39D353' : '#F0F0F4' }}></i>
            </button>
          )}
          {/* Timer */}
          <div className="px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}>
            <span className="text-[11px] font-mono-numbers font-bold" style={{ color: '#34D399' }}>{match.timer.formatted}</span>
          </div>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2.5 flex-1">
        {/* Score Section — DOMINANT element */}
        <div className="flex items-center justify-between rounded-xl p-3" style={{ background: '#13131A', border: '1px solid #1E1E28' }}>
          {/* Home Player */}
          <div className="text-center flex-1 min-w-0">
            <p className="text-[9px] font-medium uppercase truncate mb-1" style={{ color: '#44445A' }}>{match.homeTeamName || '–'}</p>
            <h3 className="text-[13px] font-semibold truncate mb-1.5" style={{ color: '#F0F0F4' }}>{match.homePlayer}</h3>
            {p1.lastMatches && p1.lastMatches.length >= 3 ? (
              <FormDots results={p1.last5} stats={p1} />
            ) : (
              <div className="mt-2 px-2 py-1 rounded-lg inline-block" style={{ background: 'rgba(74, 222, 128,0.06)', border: '1px solid rgba(74, 222, 128,0.15)' }}>
                <span className="text-[7px] font-medium" style={{ color: '#4ade80' }}>Poucos dados</span>
              </div>
            )}
          </div>

          {/* Score */}
          <div className="flex flex-col items-center mx-2 shrink-0">
            <div className={`px-5 py-2.5 rounded-xl text-center min-w-[80px] transition-all duration-300 ${scoreState.animating ? 'animate-score-pop' : ''}`}
              style={{
                background: '#07070A',
                border: `1px solid ${scoreState.animating ? 'rgba(52,211,153,0.4)' : '#1E1E28'}`,
                boxShadow: scoreState.animating ? '0 0 20px rgba(52,211,153,0.2)' : 'none'
              }}>
              <div className="flex items-center justify-center gap-1.5 font-bold text-3xl tabular-nums tracking-tighter font-mono-numbers" style={{ color: '#F0F0F4' }}>
                <span>{match.score.home}</span>
                <span style={{ color: '#1E1E28' }}>–</span>
                <span>{match.score.away}</span>
              </div>
              <div className="text-[7px] font-medium uppercase tracking-widest mt-1" style={{ color: '#44445A' }}>AO VIVO</div>
            </div>
          </div>

          {/* Away Player */}
          <div className="text-center flex-1 min-w-0">
            <p className="text-[9px] font-medium uppercase truncate mb-1" style={{ color: '#44445A' }}>{match.awayTeamName || '–'}</p>
            <h3 className="text-[13px] font-semibold truncate mb-1.5" style={{ color: '#F0F0F4' }}>{match.awayPlayer}</h3>
            {p2.lastMatches && p2.lastMatches.length >= 3 ? (
              <FormDots results={p2.last5} stats={p2} />
            ) : (
              <div className="mt-2 px-2 py-1 rounded-lg inline-block" style={{ background: 'rgba(74, 222, 128,0.06)', border: '1px solid rgba(74, 222, 128,0.15)' }}>
                <span className="text-[7px] font-medium" style={{ color: '#4ade80' }}>Poucos dados</span>
              </div>
            )}
          </div>
        </div>

        {/* Unified Metrics — Dual Column */}
        <div className="rounded-xl p-2.5" style={{ background: '#13131A', border: '1px solid #1E1E28' }}>
          {/* Header: Confronto + HT/FT toggle */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#44445A' }}>
              <i className="fa-solid fa-bolt text-[8px]" style={{ color: '#34D399' }}></i>
              Linhas Confronto
              {syncLimit < 5 && <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: '#F87171' }}></span>}
              <span style={{ color: syncLimit < 5 ? '#4ade80' : '#44445A' }}>({syncLimit}J)</span>
            </span>
            <div className="flex p-0.5 rounded-lg" style={{ background: '#07070A', border: '1px solid #1E1E28' }}>
              <button onClick={() => setActiveTab('HT')} className="px-2 py-0.5 rounded-md text-[8px] font-semibold transition-all"
                style={isHT ? { background: '#1E1E28', color: '#F0F0F4' } : { color: '#44445A' }}>HT</button>
              <button onClick={() => setActiveTab('FT')} className="px-2 py-0.5 rounded-md text-[8px] font-semibold transition-all"
                style={!isHT ? { background: '#1E1E28', color: '#F0F0F4' } : { color: '#44445A' }}>FT</button>
            </div>
          </div>

          {/* Player name labels */}
          <div className="flex items-center justify-between mb-1 px-0.5">
            <span className="text-[8px] font-semibold uppercase tracking-wider truncate max-w-[90px]" style={{ color: '#F0F0F4' }}>{match.homePlayer}</span>
            <span className="text-[8px] font-semibold uppercase tracking-wider truncate max-w-[90px]" style={{ color: '#F0F0F4' }}>{match.awayPlayer}</span>
          </div>

          {/* Confronto dual bars */}
          <div className="space-y-0">
            {isHT ? (
              <>
                <DualMetricRow label="0.5 HT" homeValue={p1.htOver05Rate} awayValue={p2.htOver05Rate} />
                <DualMetricRow label="1.5 HT" homeValue={p1.htOver15Rate} awayValue={p2.htOver15Rate} />
                <DualMetricRow label="2.5 HT" homeValue={p1.htOver25Rate} awayValue={p2.htOver25Rate} />
                <DualMetricRow label="BTTS HT" homeValue={p1.htBttsRate} awayValue={p2.htBttsRate} />
              </>
            ) : (
              <>
                <DualMetricRow label="1.5 FT" homeValue={p1.ft15Rate} awayValue={p2.ft15Rate} />
                <DualMetricRow label="2.5 FT" homeValue={p1.ftOver25Rate} awayValue={p2.ftOver25Rate} />
                <DualMetricRow label="3.5 FT" homeValue={p1.ft35Rate} awayValue={p2.ft35Rate} />
                <DualMetricRow label="BTTS FT" homeValue={p1.ftBttsRate} awayValue={p2.ftBttsRate} />
              </>
            )}
          </div>

          {/* Divider */}
          <div className="my-2 mx-1" style={{ borderTop: '1px solid #1E1E28' }}></div>

          {/* Over Gols Individual */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <i className="fa-solid fa-chart-line text-[8px]" style={{ color: '#34D399' }}></i>
            <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#44445A' }}>Over Gols Individual</span>
          </div>

          <div className="space-y-0">
            <DualMetricRow label={`0.5 ${isHT ? 'HT' : 'FT'}`} homeValue={homePlayerMetrics.m05} awayValue={awayPlayerMetrics.m05} />
            <DualMetricRow label={`1.5 ${isHT ? 'HT' : 'FT'}`} homeValue={homePlayerMetrics.m15} awayValue={awayPlayerMetrics.m15} />
            <DualMetricRow label={`2.5 ${isHT ? 'HT' : 'FT'}`} homeValue={homePlayerMetrics.m25} awayValue={awayPlayerMetrics.m25} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 pt-1 mt-auto">
          <button onClick={() => onDetailClick(match)}
            className="flex-[0.8] py-2.5 rounded-xl text-[9px] font-semibold uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{ background: '#13131A', border: '1px solid #1E1E28', color: '#8888A0' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(57, 211, 83,0.3)'; (e.currentTarget as HTMLElement).style.color = '#39D353'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1E1E28'; (e.currentTarget as HTMLElement).style.color = '#8888A0'; }}>
            Análise <i className="fa-solid fa-microchip text-[9px]"></i>
          </button>
          <a href={bookmakerUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 overflow-hidden"
            style={{ background: '#13131A', border: '1px solid #1E1E28', color: '#8888A0' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2E2E38'; (e.currentTarget as HTMLElement).style.color = '#F0F0F4'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1E1E28'; (e.currentTarget as HTMLElement).style.color = '#8888A0'; }}>
            <img src={bookmakerLogo} className="w-3.5 h-3.5 object-contain rounded-sm" alt={bookmakerName} />
            <span className="text-[9px] font-semibold uppercase tracking-wider">{bookmakerName}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
