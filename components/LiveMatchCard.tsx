
import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { LiveEvent, HistoryMatch } from '../types';
import {
  calculatePlayerStats, getLeagueInfo, calculateMetricProbability,
  normalize, calculateMatchDecisionScore, MatchDecisionScore
} from '../services/analyzer';

const createSlug = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");

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

// ── Design Tokens por label ──
const LABEL_STYLE = {
  elite: {
    label: 'ELITE', icon: '⚡',
    accent: '#34D399',       // emerald
    accentDim: 'rgba(52,211,153,0.12)',
    accentBorder: 'rgba(52,211,153,0.22)',
    text: '#34D399',
    badge: 'rgba(52,211,153,0.15)',
    cardBorder: 'rgba(52,211,153,0.25)',
    cardLeft: '#34D399',
  },
  enter: {
    label: 'ENTRAR', icon: '✓',
    accent: '#4ADE80',
    accentDim: 'rgba(74,222,128,0.08)',
    accentBorder: 'rgba(74,222,128,0.18)',
    text: '#4ADE80',
    badge: 'rgba(74,222,128,0.12)',
    cardBorder: 'rgba(74,222,128,0.18)',
    cardLeft: '#4ADE80',
  },
  watch: {
    label: 'OBSERVAR', icon: '◎',
    accent: '#F59E0B',
    accentDim: 'rgba(245,158,11,0.07)',
    accentBorder: 'rgba(245,158,11,0.16)',
    text: '#F59E0B',
    badge: 'rgba(245,158,11,0.10)',
    cardBorder: 'rgba(245,158,11,0.16)',
    cardLeft: '#F59E0B',
  },
  avoid: {
    label: 'EVITAR', icon: '✕',
    accent: '#F87171',
    accentDim: 'rgba(248,113,113,0.06)',
    accentBorder: 'rgba(248,113,113,0.14)',
    text: '#F87171',
    badge: 'rgba(248,113,113,0.08)',
    cardBorder: 'rgba(248,113,113,0.14)',
    cardLeft: '#F87171',
  },
};

// ── Score Ring SVG ──
const ScoreRing = ({ score, color }: { score: number; color: string }) => {
  const r = 30; const circ = 2 * Math.PI * r;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="absolute inset-0">
      <circle cx="38" cy="38" r={r} fill="none" stroke="#1A1A22" strokeWidth="5" />
      <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * circ} ${circ}`}
        strokeDashoffset={circ / 4}
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 5px ${color}80)` }}
      />
    </svg>
  );
};

// ── Form Dots ──
const FormDots = ({ results, stats }: { results: string[]; stats: any }) => (
  <div className="flex gap-1.5 justify-center mt-1">
    {results.slice(0, 5).map((r, i) => {
      const game = stats.lastMatches?.[i];
      if (!game) return null;
      const isW = r === 'W', isD = r === 'D';
      const col = isW ? '#34D399' : isD ? '#F59E0B' : '#F87171';
      const label = isW ? 'V' : isD ? 'E' : 'D';
      const date = new Date(game.data_realizacao).toLocaleDateString('pt-BR');
      return (
        <div key={i} className="group/dot relative">
          <div className="w-2 h-2 rounded-full cursor-help hover:scale-125 transition-transform"
            style={{ backgroundColor: col }} />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/dot:opacity-100 pointer-events-none transition-all duration-150 z-[9999]">
            <div className="rounded-lg px-3 py-2 text-center min-w-[130px]"
              style={{ background: '#0A0A10', border: '1px solid #252530', boxShadow: '0 16px 40px rgba(0,0,0,0.95)' }}>
              <div className="text-[7px] font-bold uppercase tracking-widest mb-1" style={{ color: col }}>{label === 'V' ? 'VITÓRIA' : label === 'E' ? 'EMPATE' : 'DERROTA'}</div>
              <div className="text-[9px] font-semibold text-white/80 mb-1 truncate">{game.home_player} × {game.away_player}</div>
              <div className="text-[11px] font-bold tabular-nums" style={{ color: col }}>{game.score_home}–{game.score_away}</div>
              <div className="text-[7px] mt-1" style={{ color: '#44445A' }}>HT {game.halftime_score_home}–{game.halftime_score_away} · {date}</div>
            </div>
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent mx-auto"
              style={{ borderTopColor: '#252530' }} />
          </div>
        </div>
      );
    })}
  </div>
);

// ── Help Popup Sections ──
const HELP_ITEMS = [
  { color: '#34D399', title: 'MDS — Match Decision Score', body: 'Score 0–100 que sintetiza Liga + Momentum dos Players + H2H + Convergência de sinais. Quanto maior, mais sólida a oportunidade.' },
  { color: '#F59E0B', title: 'Níveis: ELITE / ENTRAR / OBSERVAR / EVITAR', body: '⚡ ELITE (80–100): apostar com convicção. ✓ ENTRAR (60–79): condições favoráveis. ◎ OBSERVAR (40–59): aguardar. ✕ EVITAR (<40): dados desfavoráveis.' },
  { color: '#60A5FA', title: 'Mercado Recomendado', body: 'Sistema percorre do mercado mais exigente (2.5 HT) para o mais fácil e recomenda o maior que ambos os players sustentam historicamente.' },
  { color: '#A78BFA', title: '↑ → ↓ Momentum', body: '↑ Aquecendo: média de gols recente acima do histórico. → Estável: dentro da média. ↓ Esfriando: abaixo da média dos últimos jogos.' },
  { color: '#F87171', title: 'H2H — Confronto Direto', body: 'Histórico de confrontos diretos. O número indica quantas partidas foram encontradas. Taxa de Over nesses jogos impacta o score MDS.' },
  { color: '#34D399', title: 'Sinais Convergindo', body: 'Badge especial: Liga, P1 e P2 todos positivos simultaneamente. Melhor cenário possível para assertividade.' },
  { color: '#FBBF24', title: 'Barra de Contribuição', body: 'Cada segmento mostra o peso de: Liga (esquerda) → P1 → P2 → H2H → Convergência (direita). Soma = 100 pontos.' },
  { color: '#34D399', title: 'Métricas de Confronto (barras centrais)', body: 'Média das taxas de Over de ambos os players. Verde ≥70%, Amarelo 50–69%, Vermelho <50%. Ordem: do mais difícil (4.5 FT) para o mais fácil.' },
  { color: '#F0F0F4', title: 'Média FT — Gols por Jogo', body: 'Média de gols totais por partida de cada player nos últimos jogos analisados. >3.0 = perfil volumétrico.' },
  { color: '#8888A0', title: 'Pontos de Forma', body: 'Cada ponto = 1 jogo recente. Verde = vitória, Amarelo = empate, Vermelho = derrota. Hover para ver placar completo.' },
];

const CardHelpPopup = ({ onClose, p1, p2 }: { onClose: () => void; p1: string; p2: string }) =>
  ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}>
      <div className="w-full max-w-md max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#09090E', border: '1px solid #1E1E2E', boxShadow: '0 40px 80px rgba(0,0,0,0.95)' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid #141420' }}>
          <div>
            <h3 className="text-[13px] font-bold text-white tracking-wide">Como ler este card</h3>
            <p className="text-[9px] mt-0.5 font-medium" style={{ color: '#444460' }}>{p1} vs {p2}</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ border: '1px solid #1E1E2E' }}>
            <i className="fa-solid fa-xmark text-[10px]" style={{ color: '#555570' }} />
          </button>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 custom-scroll">
          {HELP_ITEMS.map((item, i) => (
            <div key={i} className="flex gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: '#0F0F18', border: '1px solid #141420' }}>
              <div className="w-1 rounded-full shrink-0 mt-1 self-stretch" style={{ background: item.color, opacity: 0.7 }} />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: item.color }}>{item.title}</p>
                <p className="text-[9px] leading-relaxed" style={{ color: '#6B6B85' }}>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Footer tip */}
        <div className="px-4 pb-4 pt-2 shrink-0">
          <div className="rounded-xl px-3 py-2 text-center" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.12)' }}>
            <p className="text-[8px] font-medium" style={{ color: 'rgba(52,211,153,0.7)' }}>
              💡 Priorize ELITE + Sinais Convergindo para maior assertividade
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

// ── Metric bar colors ──
const barColor = (v: number) => v >= 70 ? '#34D399' : v >= 50 ? '#F59E0B' : '#F87171';
const textColor = (v: number) => v >= 70 ? '#34D399' : v >= 50 ? '#F59E0B' : '#F87171';

// ── Single bar row (confronto) ──
const MetricBar = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center gap-2 py-[2.5px]">
    <span className="w-[42px] text-[7.5px] font-medium shrink-0" style={{ color: '#3E3E55' }}>{label}</span>
    <div className="flex-1 h-[2.5px] rounded-full overflow-hidden" style={{ background: '#141420' }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: barColor(value) }} />
    </div>
    <span className="w-[26px] text-right text-[8px] font-bold tabular-nums shrink-0" style={{ color: textColor(value) }}>
      {value.toFixed(0)}%
    </span>
  </div>
);

// ── Dual bar row (individual) ──
const DualBar = ({ label, h, a }: { label: string; h: number; a: number }) => (
  <div className="flex items-center gap-1.5 py-[2.5px]">
    <span className="w-[22px] text-right text-[8px] font-bold tabular-nums shrink-0" style={{ color: textColor(h) }}>{h.toFixed(0)}%</span>
    <div className="flex-1 h-[2.5px] rounded-full overflow-hidden flex justify-end" style={{ background: '#141420' }}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, h))}%`, background: barColor(h) }} />
    </div>
    <span className="w-[36px] text-center text-[7px] font-medium shrink-0" style={{ color: '#2E2E40' }}>{label}</span>
    <div className="flex-1 h-[2.5px] rounded-full overflow-hidden" style={{ background: '#141420' }}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, a))}%`, background: barColor(a) }} />
    </div>
    <span className="w-[22px] text-[8px] font-bold tabular-nums shrink-0" style={{ color: textColor(a) }}>{a.toFixed(0)}%</span>
  </div>
);

// ── Momentum tag ──
const MomentumTag = ({ dir, name }: { dir: 'up' | 'stable' | 'down'; name: string }) => {
  const cfg = {
    up:     { arrow: '↑', color: '#34D399', label: 'AQUEC.' },
    stable: { arrow: '→', color: '#9CA3AF', label: 'ESTÁVEL' },
    down:   { arrow: '↓', color: '#F87171', label: 'ESFRI.' },
  }[dir];
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
      style={{ background: '#0F0F18', border: `1px solid ${cfg.color}20` }}>
      <span className="text-[11px] leading-none font-bold" style={{ color: cfg.color }}>{cfg.arrow}</span>
      <span className="text-[7px] font-semibold uppercase tracking-wide truncate max-w-[40px]" style={{ color: '#4A4A62' }}>
        {name.split(' ')[0]}
      </span>
      <span className="text-[6.5px] font-bold uppercase" style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  );
};

// ══════════════════════════════════════════════
export const LiveMatchCard: React.FC<LiveMatchCardProps> = ({
  match, potential, confidence, reasons, historicalGames, onDetailClick,
  isPinned, onTogglePin, mds: mdsFromProps
}) => {
  const [activeTab, setActiveTab] = useState<'HT' | 'FT'>('FT');
  const [showHelp, setShowHelp] = useState(false);
  const leagueInfo = getLeagueInfo(match.leagueName);

  const syncLimit = useMemo(() => {
    const n1 = normalize(match.homePlayer), n2 = normalize(match.awayPlayer);
    const c1 = historicalGames.filter(g => normalize(g.home_player) === n1 || normalize(g.away_player) === n1).length;
    const c2 = historicalGames.filter(g => normalize(g.home_player) === n2 || normalize(g.away_player) === n2).length;
    return Math.max(1, Math.min(c1, c2, 5));
  }, [match.homePlayer, match.awayPlayer, historicalGames]);

  const p1 = useMemo(() => calculatePlayerStats(match.homePlayer, historicalGames, syncLimit), [match.homePlayer, historicalGames, syncLimit]);
  const p2 = useMemo(() => calculatePlayerStats(match.awayPlayer, historicalGames, syncLimit), [match.awayPlayer, historicalGames, syncLimit]);

  const mds = useMemo(() => mdsFromProps ?? calculateMatchDecisionScore(match.homePlayer, match.awayPlayer, historicalGames, match.leagueName),
    [mdsFromProps, match.homePlayer, match.awayPlayer, historicalGames, match.leagueName]);

  const S = LABEL_STYLE[mds.label];
  const isElite = mds.label === 'elite';

  const [scoreAnim, setScoreAnim] = useState(false);
  const prevScore = useRef(match.score);
  useEffect(() => {
    if (prevScore.current.home !== match.score.home || prevScore.current.away !== match.score.away) {
      setScoreAnim(true);
      const t = setTimeout(() => setScoreAnim(false), 600);
      prevScore.current = match.score;
      return () => clearTimeout(t);
    }
  }, [match.score.home, match.score.away]);

  const isHT = activeTab === 'HT';

  const hm = useMemo(() => ({
    m05: calculateMetricProbability(match.homePlayer, historicalGames, 'target0.5', isHT, syncLimit),
    m15: calculateMetricProbability(match.homePlayer, historicalGames, 'target1.5', isHT, syncLimit),
    m25: calculateMetricProbability(match.homePlayer, historicalGames, 'target2.5', isHT, syncLimit),
  }), [match.homePlayer, historicalGames, isHT, syncLimit]);

  const am = useMemo(() => ({
    m05: calculateMetricProbability(match.awayPlayer, historicalGames, 'target0.5', isHT, syncLimit),
    m15: calculateMetricProbability(match.awayPlayer, historicalGames, 'target1.5', isHT, syncLimit),
    m25: calculateMetricProbability(match.awayPlayer, historicalGames, 'target2.5', isHT, syncLimit),
  }), [match.awayPlayer, historicalGames, isHT, syncLimit]);

  // Bookmaker
  const isAltenar = match.leagueName.toLowerCase().includes('valhalla') || match.leagueName.toLowerCase().includes('valkyrie');
  const bkUrl = isAltenar
    ? (match.bet365EventId ? `https://www.estrelabet.bet.br/apostas-ao-vivo?page=liveEvent&eventId=${match.bet365EventId}&sportId=66` : 'https://www.estrelabet.bet.br/apostas-ao-vivo')
    : `https://superbet.bet.br/odds/e-sport-futebol/${createSlug(`${match.homeTeamName || match.homePlayer} x ${match.awayTeamName || match.awayPlayer}`)}-${match.id.replace(/\D/g, '') || 'v2'}/?t=offer-live-82545&mdt=o`;
  const bkName = isAltenar ? 'ESTRELA BET' : 'SUPERBET';
  const bkLogo = isAltenar ? 'https://assets.staradm.com/estrelabet_favicon.ico' : 'https://superbet.bet.br/static/img/icons/favicon.ico';

  // Breakdown bar widths
  const bd = mds.scoreBreakdown;
  const totalBd = bd.leagueScore + bd.p1Score + bd.p2Score + bd.h2hScore + bd.convergenceScore;

  return (
    <div className="relative flex flex-col h-full rounded-xl overflow-visible transition-all duration-300"
      style={{
        background: '#0A0A10',
        border: `1px solid ${isElite ? S.cardBorder : '#16161F'}`,
        borderLeft: `2px solid ${S.cardLeft}`,
        boxShadow: isElite ? `0 0 0 1px ${S.accentBorder}, 0 8px 32px rgba(0,0,0,0.6)` : '0 4px 20px rgba(0,0,0,0.5)',
      }}>

      {/* ── MDS PANEL ── */}
      <div className="mx-3 mt-3 rounded-xl p-3" style={{ background: S.accentDim, border: `1px solid ${S.accentBorder}` }}>

        {/* Top row: label + help */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: S.accent }}>{S.icon}</span>
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: S.text }}>{S.label}</span>
            {isElite && (
              <span className="text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                style={{ background: `${S.accent}20`, color: S.accent, border: `1px solid ${S.accent}30` }}>
                TOP
              </span>
            )}
          </div>
          <button onClick={() => setShowHelp(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md opacity-30 hover:opacity-80 transition-all text-[7px] font-semibold uppercase"
            style={{ background: '#0A0A10', border: '1px solid #1A1A25', color: '#6B6B85' }}>
            <i className="fa-regular fa-circle-question text-[8px]" /> Guia
          </button>
        </div>

        {/* Score ring + info */}
        <div className="flex items-center gap-3">
          {/* Ring */}
          <div className="relative w-[76px] h-[76px] shrink-0 flex items-center justify-center">
            <ScoreRing score={mds.score} color={S.accent} />
            <div className="absolute flex flex-col items-center leading-none">
              <span className="text-[21px] font-bold tabular-nums" style={{ color: S.accent }}>{mds.score}</span>
              <span className="text-[6.5px] font-bold uppercase tracking-widest mt-0.5" style={{ color: `${S.accent}70` }}>MDS</span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            {/* Market */}
            <div className="flex items-center gap-1.5">
              <i className="fa-solid fa-crosshairs text-[8px]" style={{ color: '#2E2E45' }} />
              <span className="text-[11px] font-semibold" style={{ color: '#C8C8DC' }}>{mds.bestMarket}</span>
            </div>

            {/* Momentum row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Liga */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: '#0F0F18', border: '1px solid #1A1A25' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: leagueInfo.color }} />
                {mds.leagueOverRate > 0 && (
                  <span className="text-[7px] font-semibold tabular-nums" style={{ color: '#5A5A72' }}>
                    {mds.leagueOverRate.toFixed(0)}%
                  </span>
                )}
              </div>

              <MomentumTag dir={mds.p1Momentum} name={match.homePlayer} />
              <MomentumTag dir={mds.p2Momentum} name={match.awayPlayer} />

              {mds.h2hCount > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: '#0F0F18', border: '1px solid #1A1A25' }}>
                  <i className="fa-solid fa-arrows-left-right text-[7px]" style={{ color: '#3E3E55' }} />
                  <span className="text-[7px] font-semibold tabular-nums" style={{ color: '#5A5A72' }}>H2H {mds.h2hCount}j</span>
                </div>
              )}
            </div>

            {/* Convergence + Reasoning */}
            <div className="flex flex-col gap-1">
              {mds.convergenceBonus && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg self-start"
                  style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                  <i className="fa-solid fa-bolt text-[6px]" style={{ color: '#34D399' }} />
                  <span className="text-[7px] font-semibold uppercase tracking-wider" style={{ color: '#34D39990' }}>Sinais Convergindo</span>
                </div>
              )}
              {mds.reasoning[0] && (
                <p className="text-[7.5px] leading-snug truncate" style={{ color: '#3E3E58' }}>{mds.reasoning[0]}</p>
              )}
            </div>
          </div>
        </div>

        {/* Breakdown bar */}
        {totalBd > 0 && (
          <div className="mt-3">
            <div className="flex h-[3px] rounded-full overflow-hidden gap-px">
              {bd.leagueScore > 0    && <div style={{ flex: bd.leagueScore,    background: leagueInfo.color, opacity: 0.6 }} />}
              {bd.p1Score > 0        && <div style={{ flex: bd.p1Score,        background: '#34D399' }} />}
              {bd.p2Score > 0        && <div style={{ flex: bd.p2Score,        background: '#60A5FA' }} />}
              {bd.h2hScore > 0       && <div style={{ flex: bd.h2hScore,       background: '#A78BFA' }} />}
              {bd.convergenceScore > 0 && <div style={{ flex: bd.convergenceScore, background: '#F59E0B' }} />}
            </div>
            <div className="flex items-center gap-3 mt-1">
              {[
                { c: leagueInfo.color, l: 'Liga' },
                { c: '#34D399', l: 'P1' },
                { c: '#60A5FA', l: 'P2' },
                { c: '#A78BFA', l: 'H2H' },
                { c: '#F59E0B', l: 'Conv.' },
              ].map(({ c, l }) => (
                <div key={l} className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: c, opacity: 0.7 }} />
                  <span className="text-[6px] font-medium uppercase" style={{ color: '#2A2A3A' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Card Header ── */}
      <div className="px-3.5 pt-2.5 pb-2 flex items-center justify-between" style={{ borderBottom: '1px solid #111118' }}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 p-1" style={{ background: '#111118', border: '1px solid #1A1A25' }}>
            <img src={leagueInfo.image} className="w-full h-full object-contain" alt="" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[11px] font-semibold truncate leading-tight" style={{ color: '#CCCCDC' }}>
              {match.homePlayer} <span style={{ color: '#252535' }}>vs</span> {match.awayPlayer}
            </h4>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full" style={{ background: leagueInfo.color }} />
              <span className="text-[8px] font-medium truncate" style={{ color: '#3A3A52' }}>{leagueInfo.name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          {onTogglePin && (
            <button onClick={e => { e.stopPropagation(); onTogglePin(); }}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: '#111118', border: '1px solid #1A1A25' }}>
              <i className={`fa-solid fa-star text-[8px] ${isPinned ? '' : 'opacity-20 hover:opacity-50'}`}
                style={{ color: isPinned ? '#F59E0B' : '#CCCCDC' }} />
            </button>
          )}
          <div className="px-2 py-1 rounded-lg" style={{ background: `${S.accent}10`, border: `1px solid ${S.accent}20` }}>
            <span className="text-[9px] font-mono font-bold" style={{ color: S.accent }}>{match.timer.formatted}</span>
          </div>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2.5 flex-1">

        {/* ── Score section ── */}
        <div className="flex items-center justify-between rounded-xl p-2.5" style={{ background: '#0F0F18', border: '1px solid #141420' }}>
          {/* Home */}
          <div className="text-center flex-1 min-w-0">
            <p className="text-[7px] font-medium uppercase truncate mb-0.5" style={{ color: '#252535' }}>{match.homeTeamName || '–'}</p>
            <h3 className="text-[11px] font-semibold truncate mb-1" style={{ color: '#B0B0C8' }}>{match.homePlayer}</h3>
            {p1.lastMatches?.length >= 3 ? <FormDots results={p1.last5} stats={p1} /> : (
              <div className="mt-1 inline-block px-2 py-0.5 rounded-md" style={{ background: '#141420', border: '1px solid #1E1E2E' }}>
                <span className="text-[7px]" style={{ color: '#3E3E55' }}>Poucos dados</span>
              </div>
            )}
          </div>

          {/* Live Score */}
          <div className="flex flex-col items-center mx-2 shrink-0">
            <div className={`px-4 py-2 rounded-xl text-center min-w-[68px] transition-all duration-300 ${scoreAnim ? 'scale-105' : ''}`}
              style={{
                background: '#07070B',
                border: `1px solid ${scoreAnim ? `${S.accent}40` : '#141420'}`,
                boxShadow: scoreAnim ? `0 0 16px ${S.accent}20` : 'none'
              }}>
              <div className="flex items-center justify-center gap-1.5 text-2xl font-bold tabular-nums" style={{ color: '#E0E0F0' }}>
                <span>{match.score.home}</span>
                <span style={{ color: '#1A1A25' }}>–</span>
                <span>{match.score.away}</span>
              </div>
              <div className="text-[6px] font-medium uppercase tracking-widest mt-0.5" style={{ color: '#252535' }}>AO VIVO</div>
            </div>
          </div>

          {/* Away */}
          <div className="text-center flex-1 min-w-0">
            <p className="text-[7px] font-medium uppercase truncate mb-0.5" style={{ color: '#252535' }}>{match.awayTeamName || '–'}</p>
            <h3 className="text-[11px] font-semibold truncate mb-1" style={{ color: '#B0B0C8' }}>{match.awayPlayer}</h3>
            {p2.lastMatches?.length >= 3 ? <FormDots results={p2.last5} stats={p2} /> : (
              <div className="mt-1 inline-block px-2 py-0.5 rounded-md" style={{ background: '#141420', border: '1px solid #1E1E2E' }}>
                <span className="text-[7px]" style={{ color: '#3E3E55' }}>Poucos dados</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Metrics section ── */}
        <div className="rounded-xl p-2.5" style={{ background: '#0F0F18', border: '1px solid #141420' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[7.5px] font-semibold uppercase tracking-wider" style={{ color: '#2A2A40' }}>
              Confronto <span style={{ color: syncLimit < 5 ? '#4ADE80' : '#2A2A40' }}>({syncLimit}J)</span>
            </span>
            <div className="flex p-0.5 rounded-lg" style={{ background: '#07070B', border: '1px solid #141420' }}>
              {(['HT', 'FT'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="px-2 py-0.5 rounded-md text-[7.5px] font-semibold transition-all"
                  style={activeTab === tab ? { background: '#1A1A25', color: '#B0B0C8' } : { color: '#2E2E45' }}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Bars — Confronto */}
          {isHT ? (
            <>
              <MetricBar label="2.5 HT" value={(p1.htOver25Rate + p2.htOver25Rate) / 2} />
              <MetricBar label="1.5 HT" value={(p1.htOver15Rate + p2.htOver15Rate) / 2} />
              <MetricBar label="BTTS HT" value={(p1.htBttsRate + p2.htBttsRate) / 2} />
              <MetricBar label="0.5 HT" value={(p1.htOver05Rate + p2.htOver05Rate) / 2} />
            </>
          ) : (
            <>
              <MetricBar label="4.5 FT" value={(p1.ft35Rate + p2.ft35Rate) / 2 * 0.65} />
              <MetricBar label="3.5 FT" value={(p1.ft35Rate + p2.ft35Rate) / 2} />
              <MetricBar label="2.5 FT" value={(p1.ftOver25Rate + p2.ftOver25Rate) / 2} />
              <MetricBar label="BTTS FT" value={(p1.ftBttsRate + p2.ftBttsRate) / 2} />
            </>
          )}

          {/* Divider */}
          <div className="my-2" style={{ borderTop: '1px solid #111118' }} />

          {/* Individual header + goals */}
          <div className="flex items-center justify-between px-0.5 mb-1">
            <span className="text-[8px] font-semibold truncate max-w-[70px]" style={{ color: '#34D399' }}>{match.homePlayer}</span>
            <span className="text-[7px] font-medium" style={{ color: '#252535' }}>Individual</span>
            <span className="text-[8px] font-semibold truncate max-w-[70px] text-right" style={{ color: '#60A5FA' }}>{match.awayPlayer}</span>
          </div>

          {/* Goals avg */}
          <div className="flex items-center justify-between px-0.5 py-1 mb-1 rounded-lg" style={{ background: '#0A0A10' }}>
            <span className="text-[12px] font-bold tabular-nums" style={{ color: '#34D399' }}>{p1.avgGoalsScoredFT.toFixed(1)}</span>
            <span className="text-[7px] uppercase font-medium" style={{ color: '#252535' }}>média FT</span>
            <span className="text-[12px] font-bold tabular-nums" style={{ color: '#60A5FA' }}>{p2.avgGoalsScoredFT.toFixed(1)}</span>
          </div>

          {/* Dual bars */}
          {isHT ? (
            <>
              <DualBar label="2.5 HT" h={hm.m25} a={am.m25} />
              <DualBar label="1.5 HT" h={hm.m15} a={am.m15} />
              <DualBar label="0.5 HT" h={hm.m05} a={am.m05} />
            </>
          ) : (
            <>
              <DualBar label="3.5 FT" h={hm.m25} a={am.m25} />
              <DualBar label="2.5 FT" h={hm.m15} a={am.m15} />
              <DualBar label="1.5 FT" h={hm.m05} a={am.m05} />
            </>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-2 mt-auto">
          <button onClick={() => onDetailClick(match)}
            className="flex-[0.85] py-2 rounded-xl text-[8.5px] font-semibold uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{ background: '#0F0F18', border: '1px solid #1A1A25', color: '#3E3E55' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${S.accent}30`; (e.currentTarget as HTMLElement).style.color = S.accent; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1A1A25'; (e.currentTarget as HTMLElement).style.color = '#3E3E55'; }}>
            Análise <i className="fa-solid fa-microchip text-[8px]" />
          </button>
          <a href={bkUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
            style={{ background: '#0F0F18', border: '1px solid #1A1A25', color: '#3E3E55' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2A2A38'; (e.currentTarget as HTMLElement).style.color = '#CCCCDC'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1A1A25'; (e.currentTarget as HTMLElement).style.color = '#3E3E55'; }}>
            <img src={bkLogo} className="w-3 h-3 object-contain rounded-sm" alt={bkName} />
            <span className="text-[7.5px] font-semibold uppercase tracking-wider">{bkName}</span>
          </a>
        </div>
      </div>

      {/* Help popup portal */}
      {showHelp && <CardHelpPopup onClose={() => setShowHelp(false)} p1={match.homePlayer} p2={match.awayPlayer} />}
    </div>
  );
};
