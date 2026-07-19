
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LiveEvent, HistoryMatch } from '../types';
import {
  calculatePlayerStats, getLeagueInfo, calculateMetricProbability,
  normalize, calculateMatchDecisionScore, MatchDecisionScore
} from '../services/analyzer';

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
  mds?: MatchDecisionScore;
}

// MDS Score config
const MDS_CONFIG = {
  elite: {
    label: 'ELITE',
    sublabel: 'Oportunidade Premium',
    color: '#34D399',
    glow: 'rgba(52, 211, 153, 0.4)',
    bg: 'rgba(52, 211, 153, 0.08)',
    border: 'rgba(52, 211, 153, 0.3)',
    textColor: '#34D399',
    icon: '⚡',
    ring: '#34D399',
  },
  enter: {
    label: 'ENTRAR',
    sublabel: 'Condições favoráveis',
    color: '#39D353',
    glow: 'rgba(57, 211, 83, 0.35)',
    bg: 'rgba(57, 211, 83, 0.07)',
    border: 'rgba(57, 211, 83, 0.25)',
    textColor: '#39D353',
    icon: '✅',
    ring: '#39D353',
  },
  watch: {
    label: 'OBSERVAR',
    sublabel: 'Aguardar mais dados',
    color: '#FBBF24',
    glow: 'rgba(251, 191, 36, 0.2)',
    bg: 'rgba(251, 191, 36, 0.05)',
    border: 'rgba(251, 191, 36, 0.2)',
    textColor: '#FBBF24',
    icon: '👁️',
    ring: '#FBBF24',
  },
  avoid: {
    label: 'EVITAR',
    sublabel: 'Sinais desfavoráveis',
    color: '#F87171',
    glow: 'rgba(248, 113, 113, 0.2)',
    bg: 'rgba(248, 113, 113, 0.05)',
    border: 'rgba(248, 113, 113, 0.2)',
    textColor: '#F87171',
    icon: '🚫',
    ring: '#F87171',
  },
};

// Momentum arrow
const MomentumArrow = ({ direction, name }: { direction: 'up' | 'stable' | 'down'; name: string }) => {
  const cfg = {
    up:     { icon: '↑', color: '#34D399', label: 'aquec.' },
    stable: { icon: '→', color: '#FBBF24', label: 'estável' },
    down:   { icon: '↓', color: '#F87171', label: 'esfri.' },
  }[direction];
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[14px] font-bold leading-none" style={{ color: cfg.color }}>{cfg.icon}</span>
      <span className="text-[7px] font-medium uppercase tracking-wide" style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  );
};

// SVG Score Ring
const ScoreRing = ({ score, color }: { score: number; color: string }) => {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" className="absolute inset-0">
      {/* Track */}
      <circle cx="42" cy="42" r={radius} fill="none" stroke="#161620" strokeWidth="6" />
      {/* Progress */}
      <circle
        cx="42" cy="42" r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        strokeDashoffset={circumference / 4}
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </svg>
  );
};

// Form Dots (compact)
const FormDots = ({ results, stats }: { results: string[]; stats: any }) => (
  <div className="flex gap-1 justify-center mt-1.5" style={{ isolation: 'isolate' }}>
    {results.slice(0, 5).map((r, i) => {
      const game = stats.lastMatches?.[i];
      if (!game) return null;
      const isWin = r === 'W';
      const isDraw = r === 'D';
      const dotColor = isWin ? '#34D399' : isDraw ? '#FBBF24' : '#F87171';
      const statusText = isWin ? "VITÓRIA" : isDraw ? "EMPATE" : "DERROTA";
      const dateObj = new Date(game.data_realizacao);
      const formattedDate = dateObj.toLocaleDateString('pt-BR');
      const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return (
        <div key={i} className="group/dot relative flex flex-col items-center">
          <div
            className="w-2 h-2 rounded-full cursor-help transition-transform duration-200 hover:scale-125"
            style={{ backgroundColor: dotColor }}
          />
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover/dot:opacity-100 transition-all duration-200 pointer-events-none z-[9999] flex flex-col items-center scale-95 group-hover/dot:scale-100 origin-bottom">
            <div className="rounded-xl p-3 min-w-[148px] text-center flex flex-col items-center gap-1.5"
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
              <span className="text-[8px] font-mono" style={{ color: '#44445A' }}>
                {formattedDate} {formattedTime}
              </span>
              <div className="w-full rounded-lg py-1" style={{ background: '#13131A', border: '1px solid #1E1E28' }}>
                <span className="text-[9px] font-medium" style={{ color: '#8888A0' }}>HT {game.halftime_score_home}–{game.halftime_score_away}</span>
              </div>
            </div>
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] -mt-px" style={{ borderTopColor: '#1E1E28' }} />
          </div>
        </div>
      );
    })}
  </div>
);

export const LiveMatchCard: React.FC<LiveMatchCardProps> = ({
  match, potential, confidence, reasons, historicalGames, onDetailClick,
  isPinned, onTogglePin, mds: mdsFromProps
}) => {
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

  // Calculate MDS if not passed from parent (fallback)
  const mds = useMemo(() => {
    if (mdsFromProps) return mdsFromProps;
    return calculateMatchDecisionScore(match.homePlayer, match.awayPlayer, historicalGames, match.leagueName);
  }, [mdsFromProps, match.homePlayer, match.awayPlayer, historicalGames, match.leagueName]);

  const mdsConfig = MDS_CONFIG[mds.label];

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

  // Bookmaker link
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

  // Metric bars helpers
  const getBarColor = (v: number) => v >= 70 ? '#34D399' : v >= 50 ? 'rgba(57, 211, 83,0.75)' : 'rgba(248,113,113,0.6)';
  const getTextColor = (v: number) => v >= 70 ? '#34D399' : v >= 50 ? '#39D353' : '#F87171';

  const SingleMetricRow = ({ label, value }: { label: string; value: number }) => (
    <div className="flex items-center gap-2 py-[3px]">
      <div className="w-[44px] text-left shrink-0">
        <span className="text-[8px] font-semibold uppercase" style={{ color: '#6B6B80' }}>{label}</span>
      </div>
      <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: '#161620' }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${value}%`, background: getBarColor(value) }} />
      </div>
      <div className="w-[28px] text-right shrink-0">
        <span className="text-[9px] font-bold tabular-nums" style={{ color: getTextColor(value) }}>{value.toFixed(0)}%</span>
      </div>
    </div>
  );

  const DualMetricRow = ({ label, homeValue, awayValue }: { label: string; homeValue: number; awayValue: number }) => (
    <div className="flex items-center gap-1 py-[3px]">
      <div className="w-[26px] text-left shrink-0">
        <span className="text-[9px] font-bold tabular-nums" style={{ color: getTextColor(homeValue) }}>{homeValue.toFixed(0)}%</span>
      </div>
      <div className="flex-1 h-[3px] rounded-full overflow-hidden flex justify-end" style={{ background: '#161620' }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${homeValue}%`, background: getBarColor(homeValue) }} />
      </div>
      <div className="w-[42px] text-center shrink-0">
        <span className="text-[8px] font-semibold uppercase" style={{ color: '#6B6B80' }}>{label}</span>
      </div>
      <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: '#161620' }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${awayValue}%`, background: getBarColor(awayValue) }} />
      </div>
      <div className="w-[26px] text-right shrink-0">
        <span className="text-[9px] font-bold tabular-nums" style={{ color: getTextColor(awayValue) }}>{awayValue.toFixed(0)}%</span>
      </div>
    </div>
  );

  const isElite = mds.label === 'elite';
  const shouldGlow = mds.label === 'elite' || mds.label === 'enter';

  return (
    <div
      className={`relative flex flex-col transition-all duration-300 h-full rounded-xl overflow-visible ${isElite ? 'animate-accent-glow' : ''}`}
      style={{
        background: '#0D0D12',
        border: `1px solid ${shouldGlow ? mdsConfig.border : '#1E1E28'}`,
        borderLeft: `3px solid ${shouldGlow ? mdsConfig.color : leagueInfo.color + '60'}`,
        boxShadow: isElite ? `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${mdsConfig.glow}` : '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >

      {/* ── MDS DECISION PANEL ── */}
      <div
        className="mx-3 mt-3 rounded-xl px-3 py-2.5"
        style={{
          background: mdsConfig.bg,
          border: `1px solid ${mdsConfig.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          {/* Score Ring */}
          <div className="relative w-[84px] h-[84px] shrink-0 flex items-center justify-center">
            <ScoreRing score={mds.score} color={mdsConfig.ring} />
            <div className="absolute flex flex-col items-center leading-none">
              <span className="text-[22px] font-bold tabular-nums font-mono-numbers" style={{ color: mdsConfig.textColor }}>
                {mds.score}
              </span>
              <span className="text-[7px] font-bold uppercase tracking-wider mt-0.5" style={{ color: mdsConfig.textColor + 'BB' }}>
                MDS
              </span>
            </div>
          </div>

          {/* Decision content */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            {/* Label + Icon */}
            <div className="flex items-center gap-1.5">
              <span className="text-base">{mdsConfig.icon}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: mdsConfig.textColor }}>
                {mdsConfig.label}
              </span>
              {isElite && (
                <span className="px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest animate-pulse"
                  style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>
                  TOP
                </span>
              )}
            </div>

            {/* Best Market */}
            <div className="flex items-center gap-1.5">
              <i className="fa-solid fa-bullseye text-[9px]" style={{ color: '#44445A' }} />
              <span className="text-[10px] font-semibold" style={{ color: '#F0F0F4' }}>
                {mds.bestMarket}
              </span>
            </div>

            {/* Context row: Liga | P1 | P2 | H2H */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Liga */}
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                style={{ background: '#13131A', border: '1px solid #1E1E28' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: leagueInfo.color }} />
                <span className="text-[7px] font-bold uppercase tracking-wide" style={{ color: '#8888A0' }}>
                  {mds.leagueOverRate > 0 ? `${mds.leagueOverRate.toFixed(0)}%` : 'Liga'}
                </span>
              </div>
              {/* P1 momentum */}
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md"
                style={{ background: '#13131A', border: '1px solid #1E1E28' }}>
                <span className="text-[7px] uppercase font-medium truncate max-w-[36px]" style={{ color: '#6B6B80' }}>
                  {match.homePlayer.split(' ')[0]}
                </span>
                <MomentumArrow direction={mds.p1Momentum} name={match.homePlayer} />
              </div>
              {/* P2 momentum */}
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md"
                style={{ background: '#13131A', border: '1px solid #1E1E28' }}>
                <span className="text-[7px] uppercase font-medium truncate max-w-[36px]" style={{ color: '#6B6B80' }}>
                  {match.awayPlayer.split(' ')[0]}
                </span>
                <MomentumArrow direction={mds.p2Momentum} name={match.awayPlayer} />
              </div>
              {/* H2H */}
              {mds.h2hCount > 0 && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                  style={{ background: '#13131A', border: '1px solid #1E1E28' }}>
                  <i className="fa-solid fa-people-arrows text-[7px]" style={{ color: '#6B6B80' }} />
                  <span className="text-[7px] font-bold tabular-nums" style={{ color: '#8888A0' }}>
                    H2H {mds.h2hCount}j
                  </span>
                </div>
              )}
              {/* Convergence badge */}
              {mds.convergenceBonus && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                  style={{ background: 'rgba(57,211,83,0.08)', border: '1px solid rgba(57,211,83,0.25)' }}>
                  <i className="fa-solid fa-bolt text-[7px]" style={{ color: '#39D353' }} />
                  <span className="text-[7px] font-bold" style={{ color: '#39D353' }}>SINAIS CONVERGINDO</span>
                </div>
              )}
            </div>

            {/* Reasoning (1st bullet) */}
            {mds.reasoning.length > 0 && (
              <p className="text-[8px] leading-tight truncate" style={{ color: '#6B6B80' }}>
                {mds.reasoning[0]}
              </p>
            )}
          </div>
        </div>

        {/* Score breakdown bar */}
        <div className="mt-2 flex gap-0.5 h-1 rounded-full overflow-hidden">
          <div style={{ width: `${(mds.scoreBreakdown.leagueScore / 20) * 20}%`, background: leagueInfo.color, opacity: 0.7 }} />
          <div style={{ width: `${(mds.scoreBreakdown.p1Score / 25) * 25}%`, background: '#34D399' }} />
          <div style={{ width: `${(mds.scoreBreakdown.p2Score / 25) * 25}%`, background: '#60A5FA' }} />
          <div style={{ width: `${(mds.scoreBreakdown.h2hScore / 20) * 20}%`, background: '#A78BFA' }} />
          <div style={{ width: `${(mds.scoreBreakdown.convergenceScore / 10) * 10}%`, background: '#FBBF24' }} />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-0.5"><div className="w-1.5 h-1.5 rounded-full" style={{ background: leagueInfo.color, opacity: 0.7 }} /><span className="text-[6px] uppercase" style={{ color: '#44445A' }}>Liga</span></div>
          <div className="flex items-center gap-0.5"><div className="w-1.5 h-1.5 rounded-full bg-[#34D399]" /><span className="text-[6px] uppercase" style={{ color: '#44445A' }}>P1</span></div>
          <div className="flex items-center gap-0.5"><div className="w-1.5 h-1.5 rounded-full bg-[#60A5FA]" /><span className="text-[6px] uppercase" style={{ color: '#44445A' }}>P2</span></div>
          <div className="flex items-center gap-0.5"><div className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]" /><span className="text-[6px] uppercase" style={{ color: '#44445A' }}>H2H</span></div>
          <div className="flex items-center gap-0.5"><div className="w-1.5 h-1.5 rounded-full bg-[#FBBF24]" /><span className="text-[6px] uppercase" style={{ color: '#44445A' }}>Conv.</span></div>
        </div>
      </div>

      {/* ── Card Header — League + Players ── */}
      <div className="px-3.5 pt-2.5 pb-2 flex items-center justify-between" style={{ borderBottom: '1px solid #161620' }}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 p-1.5" style={{ background: '#13131A', border: '1px solid #1E1E28' }}>
            <img src={leagueInfo.image} className="w-full h-full object-contain" alt="" />
          </div>
          <div className="flex flex-col min-w-0">
            <h4 className="text-[12px] font-semibold truncate leading-tight" style={{ color: '#F0F0F4' }}>
              {match.homePlayer} <span style={{ color: '#44445A' }}>vs</span> {match.awayPlayer}
            </h4>
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: leagueInfo.color }} />
              <span className="text-[9px] font-medium truncate" style={{ color: '#8888A0' }}>{leagueInfo.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          {onTogglePin && (
            <button onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
              style={{ background: '#13131A', border: '1px solid #1E1E28' }}
              title={isPinned ? "Desfixar" : "Fixar"}>
              <i className={`fa-solid fa-star text-[9px] ${isPinned ? '' : 'opacity-30 hover:opacity-60'}`}
                style={{ color: isPinned ? '#39D353' : '#F0F0F4' }} />
            </button>
          )}
          {/* Timer */}
          <div className="px-2 py-1 rounded-lg" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}>
            <span className="text-[10px] font-mono-numbers font-bold" style={{ color: '#34D399' }}>{match.timer.formatted}</span>
          </div>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Score Section */}
        <div className="flex items-center justify-between rounded-xl p-2.5" style={{ background: '#13131A', border: '1px solid #1E1E28' }}>
          {/* Home Player */}
          <div className="text-center flex-1 min-w-0">
            <p className="text-[8px] font-medium uppercase truncate mb-0.5" style={{ color: '#44445A' }}>{match.homeTeamName || '–'}</p>
            <h3 className="text-[12px] font-semibold truncate mb-1" style={{ color: '#F0F0F4' }}>{match.homePlayer}</h3>
            {p1.lastMatches && p1.lastMatches.length >= 3 ? (
              <FormDots results={p1.last5} stats={p1} />
            ) : (
              <div className="mt-1 px-2 py-0.5 rounded-md inline-block" style={{ background: 'rgba(74, 222, 128,0.06)', border: '1px solid rgba(74, 222, 128,0.15)' }}>
                <span className="text-[7px] font-medium" style={{ color: '#4ade80' }}>Poucos dados</span>
              </div>
            )}
          </div>

          {/* Live Score */}
          <div className="flex flex-col items-center mx-2 shrink-0">
            <div className={`px-4 py-2 rounded-xl text-center min-w-[72px] transition-all duration-300 ${scoreState.animating ? 'animate-score-pop' : ''}`}
              style={{
                background: '#07070A',
                border: `1px solid ${scoreState.animating ? 'rgba(52,211,153,0.4)' : '#1E1E28'}`,
                boxShadow: scoreState.animating ? '0 0 20px rgba(52,211,153,0.2)' : 'none'
              }}>
              <div className="flex items-center justify-center gap-1.5 font-bold text-2xl tabular-nums tracking-tighter font-mono-numbers" style={{ color: '#F0F0F4' }}>
                <span>{match.score.home}</span>
                <span style={{ color: '#1E1E28' }}>–</span>
                <span>{match.score.away}</span>
              </div>
              <div className="text-[6px] font-medium uppercase tracking-widest mt-0.5" style={{ color: '#44445A' }}>AO VIVO</div>
            </div>
          </div>

          {/* Away Player */}
          <div className="text-center flex-1 min-w-0">
            <p className="text-[8px] font-medium uppercase truncate mb-0.5" style={{ color: '#44445A' }}>{match.awayTeamName || '–'}</p>
            <h3 className="text-[12px] font-semibold truncate mb-1" style={{ color: '#F0F0F4' }}>{match.awayPlayer}</h3>
            {p2.lastMatches && p2.lastMatches.length >= 3 ? (
              <FormDots results={p2.last5} stats={p2} />
            ) : (
              <div className="mt-1 px-2 py-0.5 rounded-md inline-block" style={{ background: 'rgba(74, 222, 128,0.06)', border: '1px solid rgba(74, 222, 128,0.15)' }}>
                <span className="text-[7px] font-medium" style={{ color: '#4ade80' }}>Poucos dados</span>
              </div>
            )}
          </div>
        </div>

        {/* Metrics Section */}
        <div className="rounded-xl p-2.5" style={{ background: '#13131A', border: '1px solid #1E1E28' }}>
          {/* Header: Confronto + HT/FT toggle */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[8px] font-medium uppercase tracking-wider flex items-center gap-1" style={{ color: '#44445A' }}>
              <i className="fa-solid fa-bolt text-[7px]" style={{ color: '#34D399' }} />
              Confronto
              <span style={{ color: syncLimit < 5 ? '#4ade80' : '#44445A' }}>({syncLimit}J)</span>
            </span>
            <div className="flex p-0.5 rounded-lg" style={{ background: '#07070A', border: '1px solid #1E1E28' }}>
              <button onClick={() => setActiveTab('HT')} className="px-1.5 py-0.5 rounded-md text-[8px] font-semibold transition-all"
                style={isHT ? { background: '#1E1E28', color: '#F0F0F4' } : { color: '#44445A' }}>HT</button>
              <button onClick={() => setActiveTab('FT')} className="px-1.5 py-0.5 rounded-md text-[8px] font-semibold transition-all"
                style={!isHT ? { background: '#1E1E28', color: '#F0F0F4' } : { color: '#44445A' }}>FT</button>
            </div>
          </div>

          {/* Confronto single bars */}
          <div className="space-y-0">
            {isHT ? (
              <>
                <SingleMetricRow label="0.5 HT" value={(p1.htOver05Rate + p2.htOver05Rate) / 2} />
                <SingleMetricRow label="1.5 HT" value={(p1.htOver15Rate + p2.htOver15Rate) / 2} />
                <SingleMetricRow label="2.5 HT" value={(p1.htOver25Rate + p2.htOver25Rate) / 2} />
                <SingleMetricRow label="BTTS HT" value={(p1.htBttsRate + p2.htBttsRate) / 2} />
              </>
            ) : (
              <>
                <SingleMetricRow label="1.5 FT" value={(p1.ft15Rate + p2.ft15Rate) / 2} />
                <SingleMetricRow label="2.5 FT" value={(p1.ftOver25Rate + p2.ftOver25Rate) / 2} />
                <SingleMetricRow label="3.5 FT" value={(p1.ft35Rate + p2.ft35Rate) / 2} />
                <SingleMetricRow label="BTTS FT" value={(p1.ftBttsRate + p2.ftBttsRate) / 2} />
              </>
            )}
          </div>

          {/* Divider */}
          <div className="my-1.5 mx-1" style={{ borderTop: '1px solid #1E1E28' }} />

          {/* Individual header */}
          <div className="flex items-center justify-between mb-1 px-0.5">
            <span className="text-[8px] font-semibold uppercase tracking-wider truncate max-w-[80px]" style={{ color: '#F0F0F4' }}>{match.homePlayer}</span>
            <span className="text-[7px] font-medium" style={{ color: '#44445A' }}>Individual</span>
            <span className="text-[8px] font-semibold uppercase tracking-wider truncate max-w-[80px] text-right" style={{ color: '#F0F0F4' }}>{match.awayPlayer}</span>
          </div>

          <div className="space-y-0">
            <DualMetricRow label={`0.5 ${isHT ? 'HT' : 'FT'}`} homeValue={homePlayerMetrics.m05} awayValue={awayPlayerMetrics.m05} />
            <DualMetricRow label={`1.5 ${isHT ? 'HT' : 'FT'}`} homeValue={homePlayerMetrics.m15} awayValue={awayPlayerMetrics.m15} />
            <DualMetricRow label={`2.5 ${isHT ? 'HT' : 'FT'}`} homeValue={homePlayerMetrics.m25} awayValue={awayPlayerMetrics.m25} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-0.5 mt-auto">
          <button onClick={() => onDetailClick(match)}
            className="flex-[0.8] py-2 rounded-xl text-[9px] font-semibold uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{ background: '#13131A', border: '1px solid #1E1E28', color: '#8888A0' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(57, 211, 83,0.3)'; (e.currentTarget as HTMLElement).style.color = '#39D353'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1E1E28'; (e.currentTarget as HTMLElement).style.color = '#8888A0'; }}>
            Análise <i className="fa-solid fa-microchip text-[9px]" />
          </button>
          <a href={bookmakerUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 py-2 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 overflow-hidden"
            style={{ background: '#13131A', border: '1px solid #1E1E28', color: '#8888A0' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2E2E38'; (e.currentTarget as HTMLElement).style.color = '#F0F0F4'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1E1E28'; (e.currentTarget as HTMLElement).style.color = '#8888A0'; }}>
            <img src={bookmakerLogo} className="w-3 h-3 object-contain rounded-sm" alt={bookmakerName} />
            <span className="text-[8px] font-semibold uppercase tracking-wider">{bookmakerName}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
