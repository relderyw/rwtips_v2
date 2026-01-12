
import React, { useState, useEffect } from 'react';
import { GameEvent, GameIntelligence } from '../types';
import { getTeamLogo, formatTeamName } from '../utils/calculations';
import { TrendingUp, BarChart3, Flame, Zap } from 'lucide-react';
import { intelligenceService } from '../services/intelligenceService';

interface GameCardProps {
  game: GameEvent;
  onAnalyze: (game: GameEvent) => void;
  showIntelligence?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ game, onAnalyze, showIntelligence = false }) => {
  const isLive = game.status.includes('Progress');
  const [intelligence, setIntelligence] = useState<GameIntelligence | null>(null);

  useEffect(() => {
    if (showIntelligence) {
      intelligenceService.analyzeGame(game).then(setIntelligence);
    }
  }, [game, showIntelligence]);

  // Logic to estimate win probability from record if available
  const parseRecord = (record: string) => {
    const [w, l] = (record || "0-0").split('-').map(Number);
    return w / (w + l || 1);
  };

  const awayWinRate = parseRecord(game.top.record);
  const homeWinRate = parseRecord(game.bottom.record);

  // Basic estimation for the card view based on records
  const awayProb = 0.5 + (awayWinRate - homeWinRate) * 0.2;
  const winProb = Math.max(awayProb, 1 - awayProb);
  const winPercentage = Math.round(winProb * 100);
  const favoredTeam = awayProb > 0.5 ? game.top.shortName : game.bottom.shortName;

  // Projections for the analysis field (Deterministic estimates based on ID and Record)
  const getStableNumber = (id: string, min: number, max: number, seedSuffix: string = '') => {
    const str = id + seedSuffix;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    const range = max - min;
    return min + (Math.abs(hash) % range);
  };

  const projectedTotal = parseInt(game.bettingData?.total ?? "0") || getStableNumber(game.eventId, 218, 238, "total");

  // Estimate stats if not available
  const topAvg = getStableNumber(game.eventId, 108, 118, "top");
  const bottomAvg = getStableNumber(game.eventId, 108, 118, "bottom");

  // Adjust estimates based on winrate roughly
  const topEst = Math.round(topAvg + (awayProb - 0.5) * 10);
  const bottomEst = Math.round(bottomAvg + ((1 - awayProb) - 0.5) * 10);

  // Create a balanced total for display if not fetching strictly
  const displayTotal = game.bettingData?.total ? game.bettingData.total : (topEst + bottomEst);

  const confidence = winPercentage > 65 ? 'ALTA' : 'MÉDIA';

  return (
    <div className={`relative bg-[#0a0a0a] border border-zinc-900 rounded-2xl p-4 hover:border-emerald-500/50 transition-all duration-300 group overflow-hidden ${isLive ? 'ring-1 ring-emerald-500/30' : ''} shadow-xl`}>

      {/* Intelligence Badge */}
      {intelligence && intelligence.intelligenceScore >= 75 && (
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow-lg animate-pulse">
            <Flame className="w-3 h-3 text-white" />
            <span className="text-[9px] font-black text-white uppercase tracking-wider">HOT</span>
          </div>
        </div>
      )}
      {intelligence && intelligence.intelligenceScore >= 60 && intelligence.intelligenceScore < 75 && (
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg shadow-lg">
            <Zap className="w-3 h-3 text-white" />
            <span className="text-[9px] font-black text-white uppercase tracking-wider">GOOD</span>
          </div>
        </div>
      )}

      {/* Header: Logos and Score/Status */}
      <div className="flex justify-between items-center mb-6">
        {/* Home Team (Bottom) - Now on Left */}
        <div className="flex flex-col items-center flex-1">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center border border-zinc-900 mb-2 group-hover:scale-110 transition-transform shadow-inner">
            <img src={getTeamLogo(game.bottom.seoIdentifier)} alt={game.bottom.name} className="w-10 h-10 object-contain" />
          </div>
          <span className="text-[12px] font-oxanium text-white font-bold">{game.bottom.shortName}</span>
          <span className="text-[10px] text-zinc-600 font-bold tracking-widest">{game.bottom.record}</span>
          <span className="text-[9px] text-emerald-500/50 font-black uppercase tracking-widest mt-1">CASA</span>
        </div>

        {/* Center Info: Score or Time */}
        <div className="flex flex-col items-center px-2 min-w-[100px]">
          {isLive ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Ao Vivo</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-3xl font-oxanium font-bold ${game.bottom.score && game.top.score && game.bottom.score > game.top.score ? 'text-emerald-500' : 'text-white'} tabular-nums`}>{game.bottom.score ?? 0}</span>
                <span className="text-zinc-600 font-bold">-</span>
                <span className={`text-3xl font-oxanium font-bold ${game.bottom.score && game.top.score && game.top.score > game.bottom.score ? 'text-emerald-500' : 'text-white'} tabular-nums`}>{game.top.score ?? 0}</span>
              </div>
            </div>
          ) : game.status === 'Final' ? (
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Final</span>
              <div className="flex items-center gap-3">
                <span className={`text-3xl font-oxanium font-bold ${game.bottom.score && game.top.score && game.bottom.score > game.top.score ? 'text-emerald-500' : 'text-white'} tabular-nums`}>{game.bottom.score ?? 0}</span>
                <span className="text-zinc-600 font-bold">-</span>
                <span className={`text-3xl font-oxanium font-bold ${game.bottom.score && game.top.score && game.top.score > game.bottom.score ? 'text-emerald-500' : 'text-white'} tabular-nums`}>{game.top.score ?? 0}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1.5 opacity-80">Programado</span>
              <span className="text-2xl font-oxanium font-bold text-white tracking-tighter">
                {(() => {
                  const date = new Date(game.dateET);
                  date.setHours(date.getHours() + 1);
                  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                })()}
              </span>
            </div>
          )}
        </div>

        {/* Away Team (Top) - Now on Right */}
        <div className="flex flex-col items-center flex-1">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center border border-zinc-900 mb-2 group-hover:scale-110 transition-transform shadow-inner">
            <img src={getTeamLogo(game.top.seoIdentifier)} alt={game.top.name} className="w-10 h-10 object-contain" />
          </div>
          <span className="text-[12px] font-oxanium text-white font-bold">{game.top.shortName}</span>
          <span className="text-[10px] text-zinc-600 font-bold tracking-widest">{game.top.record}</span>
          <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mt-1">FORA</span>
        </div>
      </div>

      {/* Lines / Stats Section */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-3 h-3 text-emerald-500" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Linhas do Confronto</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#0f0f0f] border border-zinc-900 rounded-lg p-2 flex flex-col items-center">
            <span className="text-[9px] text-zinc-500 uppercase font-bold text-center leading-tight mb-1">Média {game.bottom.shortName}</span>
            <span className="text-sm font-oxanium font-bold text-white">{bottomEst}</span>
          </div>
          <div className="bg-[#0f0f0f] border border-zinc-900 rounded-lg p-2 flex flex-col items-center">
            <span className="text-[9px] text-zinc-500 uppercase font-bold text-center leading-tight mb-1">Média Jogo</span>
            <span className="text-sm font-oxanium font-bold text-emerald-500">{displayTotal}</span>
          </div>
          <div className="bg-[#0f0f0f] border border-zinc-900 rounded-lg p-2 flex flex-col items-center">
            <span className="text-[9px] text-zinc-500 uppercase font-bold text-center leading-tight mb-1">Média {game.top.shortName}</span>
            <span className="text-sm font-oxanium font-bold text-white">{topEst}</span>
          </div>
        </div>
      </div>

      {/* Win Rate / Analysis Button */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          <span>Winrate <span className="text-white">{favoredTeam}</span></span>
          <span className="text-emerald-500">{winPercentage}%</span>
        </div>
        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
            style={{ width: `${winPercentage}%` }}
          ></div>
        </div>

        <button
          onClick={() => onAnalyze(game)}
          className="w-full py-2 mt-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black border border-emerald-500/50 font-black rounded-lg uppercase text-[9px] tracking-[0.15em] transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
        >
          Análise Profissional
        </button>
      </div>
    </div>
  );
};

export default GameCard;
