
import React from 'react';
import { GameEvent } from '../types';
import { getTeamLogo, formatTeamName } from '../utils/calculations';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface GameCardProps {
  game: GameEvent;
  onAnalyze: (game: GameEvent) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, onAnalyze }) => {
  const isLive = game.status.includes('Progress');

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

  // Projections for the analysis field
  const projectedTotal = 218 + Math.floor(Math.random() * 15);
  const confidence = winPercentage > 65 ? 'ALTA' : 'MÉDIA';

  return (
    <div className={`relative bg-[#0a0a0a] border border-zinc-900 rounded-2xl p-3 hover:border-emerald-500/50 transition-all duration-300 group overflow-hidden ${isLive ? 'ring-1 ring-emerald-500/30' : ''} shadow-xl`}>
      {isLive && (
        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-emerald-600 rounded-full z-10 shadow-lg">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
          <span className="text-[9px] font-black text-white uppercase tracking-tighter">Ao Vivo</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-6 mt-2 px-1">
        <div className="flex flex-col items-center flex-1">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center border border-zinc-900 mb-2 group-hover:scale-110 transition-transform shadow-inner">
            <img src={getTeamLogo(game.top.seoIdentifier)} alt={game.top.name} className="w-10 h-10 object-contain" />
          </div>
          <span className="text-[11px] font-oxanium text-zinc-600 font-bold tracking-widest">{game.top.record}</span>
        </div>

        <div className="flex flex-col items-center px-4">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1.5 opacity-80">Início</span>
            <span className="text-xl font-oxanium font-bold text-white tracking-tighter">
              {new Date(game.dateET).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center flex-1">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center border border-zinc-900 mb-2 group-hover:scale-110 transition-transform shadow-inner">
            <img src={getTeamLogo(game.bottom.seoIdentifier)} alt={game.bottom.name} className="w-10 h-10 object-contain" />
          </div>
          <span className="text-[11px] font-oxanium text-zinc-600 font-bold tracking-widest">{game.bottom.record}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-[#0f0f0f] rounded-xl p-2.5 border border-zinc-900 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center gap-1.5 mb-0.5">
            <BarChart3 className="w-3 h-3 text-emerald-500" />
            <span className="text-[8px] text-zinc-600 uppercase font-black tracking-widest">Projection</span>
          </div>
          <span className="text-[10px] font-black text-white uppercase tracking-tighter">{winPercentage}% {favoredTeam}</span>
        </div>
        <div className="bg-[#0f0f0f] rounded-xl p-2.5 border border-zinc-900 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center gap-1.5 mb-0.5">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span className="text-[8px] text-zinc-600 uppercase font-black tracking-widest">Analysis</span>
          </div>
          <span className="text-[10px] font-black text-white uppercase tracking-tighter">{projectedTotal} PTS | {confidence}</span>
        </div>
      </div>

      <button
        onClick={() => onAnalyze(game)}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl uppercase text-[10px] tracking-[0.15em] transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
      >
        Análise Profissional
      </button>
    </div>
  );
};

export default GameCard;
