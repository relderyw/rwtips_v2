import React from 'react';
import { getStatusColor, getStatusText } from '../utils/helpers';
import { LiveScore } from '../services/liveApi';

interface MatchCardProps {
    match: LiveScore;
    onClick: (match: LiveScore) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onClick }) => {
    const showMinute = match.minute && match.status !== 'FT' && match.status !== 'NS';

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.style.display = 'none';
    };

    return (
        <div
            onClick={() => onClick(match)}
            className="group relative bg-zinc-900 hover:bg-zinc-800/80 rounded-2xl p-5 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 border border-zinc-800 hover:border-emerald-500/50"
        >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/0 group-hover:via-emerald-500/5 rounded-2xl transition-all duration-500" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2.5">
                    {match.countryImagePath ? (
                        <img
                            src={match.countryImagePath}
                            alt={match.countryName || 'country'}
                            className="h-5 w-5 object-contain opacity-80"
                        />
                    ) : (
                        <span className="text-xl">🌍</span>
                    )}
                    <span className="text-zinc-400 text-xs font-medium tracking-wide uppercase">{match.leagueName}</span>
                </div>
                <div className={`
          px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border 
          ${match.status === 'LIVE' || showMinute
                        ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'}
        `}>
                    {getStatusText(match.status)}
                    {showMinute && <span className="ml-1 text-white">• {match.minute}'</span>}
                </div>
            </div>

            {/* Teams and score */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 relative z-10">
                {/* Local Team */}
                <div className="flex flex-col items-center text-center gap-2">
                    <div className="bg-black/40 p-2 rounded-xl border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                        {match.localTeamFlag ? (
                            <img
                                src={match.localTeamFlag}
                                alt={match.localTeamName}
                                className="h-10 w-10 object-contain"
                                onError={handleImageError}
                            />
                        ) : (
                            <div className="h-10 w-10 bg-zinc-800 rounded-full flex items-center justify-center text-xs">Home</div>
                        )}
                    </div>
                    <span className="text-zinc-200 font-bold text-sm leading-tight line-clamp-2 w-full">
                        {match.localTeamName}
                    </span>
                </div>

                {/* Score Board */}
                <div className="flex flex-col items-center justify-center min-w-[80px]">
                    <div className="bg-black/60 px-4 py-2 rounded-xl border border-zinc-800 backdrop-blur-sm">
                        <div className="text-2xl font-black text-white tracking-widest tabular-nums font-mono">
                            {(match.scoresLocalTeam ?? 0)} - {(match.scoresVisitorTeam ?? 0)}
                        </div>
                    </div>
                    {(match.status === 'HT' || (match.calculatedHTLocal !== null && match.calculatedHTVisitor !== null)) && (
                        <div className="mt-1.5 text-[10px] font-mono text-zinc-500">
                            (HT: {match.calculatedHTLocal !== null
                                ? `${match.calculatedHTLocal}-${match.calculatedHTVisitor}`
                                : `${(match.scoresLocalTeam ?? 0)}-${(match.scoresVisitorTeam ?? 0)}`})
                        </div>
                    )}
                </div>

                {/* Visitor Team */}
                <div className="flex flex-col items-center text-center gap-2">
                    <div className="bg-black/40 p-2 rounded-xl border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                        {match.visitorTeamFlag ? (
                            <img
                                src={match.visitorTeamFlag}
                                alt={match.visitorTeamName}
                                className="h-10 w-10 object-contain"
                                onError={handleImageError}
                            />
                        ) : (
                            <div className="h-10 w-10 bg-zinc-800 rounded-full flex items-center justify-center text-xs">Away</div>
                        )}
                    </div>
                    <span className="text-zinc-200 font-bold text-sm leading-tight line-clamp-2 w-full">
                        {match.visitorTeamName}
                    </span>
                </div>
            </div>

            {/* Footer / Stats */}
            {match.status !== 'NS' && (
                <div className="mt-5 pt-4 border-t border-zinc-800/80 grid grid-cols-3 gap-2 relative z-10">
                    <div className="text-center group-hover:bg-zinc-800/50 rounded-lg p-1 transition-colors">
                        <div className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-0.5">Ataques</div>
                        <div className="text-xs font-mono text-emerald-400">
                            {match.localAttacksAttacks || 0}
                            <span className="text-zinc-600 mx-1">/</span>
                            {match.visitorAttacksAttacks || 0}
                        </div>
                    </div>

                    <div className="text-center group-hover:bg-zinc-800/50 rounded-lg p-1 transition-colors">
                        <div className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-0.5">Chutes</div>
                        <div className="text-xs font-mono text-blue-400">
                            {(match.localShotsOnGoal || 0)}
                            <span className="text-zinc-600 mx-1">-</span>
                            {(match.visitorShotsOnGoal || 0)}
                        </div>
                    </div>

                    <div className="text-center group-hover:bg-zinc-800/50 rounded-lg p-1 transition-colors">
                        <div className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-0.5">Posse</div>
                        <div className="text-xs font-mono text-purple-400">
                            {match.localBallPossession ? `${match.localBallPossession}%` : '-'}
                            <span className="text-zinc-600 mx-1">/</span>
                            {match.visitorBallPossession ? `${match.visitorBallPossession}%` : '-'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MatchCard;
