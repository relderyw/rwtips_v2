
import React from 'react';
import { Game } from '../types';
import { getCompetitorLogo } from '../services/api';
import clsx from 'clsx';
import { Clock } from 'lucide-react';

interface MatchRowProps {
    match: Game;
    onClick: (match: Game) => void;
}

const MatchRow: React.FC<MatchRowProps> = ({ match, onClick }) => {
    const startTime = new Date(match.startTime).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const isLive = match.statusGroup === 3;

    return (
        <div
            onClick={() => onClick(match)}
            className="group flex items-center py-3 px-4 cursor-pointer border-b border-white/[0.02] last:border-0 hover:bg-white/[0.03] transition-all duration-300"
        >
            {/* Time / Status */}
            <div className="w-16 flex-shrink-0 flex items-center gap-2">
                {isLive ? (
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </div>
                ) : (
                    <Clock className="w-3 h-3 text-slate-600" />
                )}
                <span className={clsx(
                    "text-[11px] font-medium tracking-wide",
                    isLive ? "text-red-500 font-bold" : "text-slate-500"
                )}>
                    {isLive ? 'LIVE' : startTime}
                </span>
            </div>

            {/* Teams Container */}
            <div className="flex-grow flex items-center justify-center gap-6">
                {/* Home Team */}
                <div className="flex-1 flex items-center justify-end gap-3">
                    <span className="text-[13px] font-semibold text-slate-300 group-hover:text-white transition-colors text-right leading-tight">
                        {match.homeCompetitor.name}
                    </span>
                    <img
                        src={getCompetitorLogo(match.homeCompetitor.id, match.homeCompetitor.imageVersion)}
                        className="w-6 h-6 object-contain"
                        alt=""
                    />
                </div>

                {/* Score Box */}
                <div className="w-16 h-8 flex items-center justify-center bg-[#0a0f18] rounded-lg border border-white/5 shadow-inner group-hover:border-primary/30 transition-all">
                    <span className="font-bold text-[13px] text-white tracking-widest font-mono">
                        {match.homeCompetitor.score >= 0 ?
                            `${match.homeCompetitor.score} - ${match.awayCompetitor.score}` :
                            <span className="text-slate-700 text-[10px]">VS</span>
                        }
                    </span>
                </div>

                {/* Away Team */}
                <div className="flex-1 flex items-center justify-start gap-3">
                    <img
                        src={getCompetitorLogo(match.awayCompetitor.id, match.awayCompetitor.imageVersion)}
                        className="w-6 h-6 object-contain"
                        alt=""
                    />
                    <span className="text-[13px] font-semibold text-slate-300 group-hover:text-white transition-colors text-left leading-tight">
                        {match.awayCompetitor.name}
                    </span>
                </div>
            </div>

            {/* Odds / Extra Info */}
            <div className="w-20 flex-shrink-0 flex items-center justify-end">
                {match.odds?.options?.[0]?.rate?.decimal && (
                    <div className="px-2 py-1 bg-primary/10 rounded text-[10px] font-bold text-primary border border-primary/20">
                        {match.odds.options[0].rate.decimal}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MatchRow;
