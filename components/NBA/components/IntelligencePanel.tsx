
import React, { useState, useEffect } from 'react';
import { GameEvent, GameIntelligence } from '../types';
import { intelligenceService } from '../services/intelligenceService';
import { getTeamLogo } from '../utils/calculations';
import { TrendingUp, Flame, Zap, AlertTriangle, Filter, ArrowUpCircle, ArrowDownCircle, MinusCircle } from 'lucide-react';

interface IntelligencePanelProps {
    games: GameEvent[];
    onSelectGame: (game: GameEvent) => void;
}

const IntelligencePanel: React.FC<IntelligencePanelProps> = ({ games, onSelectGame }) => {
    const [rankedGames, setRankedGames] = useState<Array<{ game: GameEvent; intelligence: GameIntelligence }>>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'high' | 'over' | 'under'>('all');

    useEffect(() => {
        async function analyzeGames() {
            setLoading(true);
            try {
                const ranked = await intelligenceService.rankGames(games);
                setRankedGames(ranked);
            } catch (error) {
                console.error('Error ranking games:', error);
            } finally {
                setLoading(false);
            }
        }

        if (games.length > 0) {
            analyzeGames();
        }
    }, [games]);

    const filteredGames = rankedGames.filter((item) => {
        if (filter === 'high') return item.intelligence.confidence === 'High';
        if (filter === 'over') return item.intelligence.recommendation === 'OVER';
        if (filter === 'under') return item.intelligence.recommendation === 'UNDER';
        return true;
    });

    const getConfidenceIcon = (confidence: string) => {
        switch (confidence) {
            case 'High':
                return <Flame className="w-4 h-4 text-orange-500" />;
            case 'Medium':
                return <Zap className="w-4 h-4 text-yellow-500" />;
            default:
                return <AlertTriangle className="w-4 h-4 text-zinc-500" />;
        }
    };

    const getRecommendationIcon = (recommendation: string) => {
        switch (recommendation) {
            case 'OVER':
                return <ArrowUpCircle className="w-5 h-5 text-emerald-500" />;
            case 'UNDER':
                return <ArrowDownCircle className="w-5 h-5 text-blue-500" />;
            default:
                return <MinusCircle className="w-5 h-5 text-zinc-600" />;
        }
    };

    const getRecommendationColor = (recommendation: string) => {
        switch (recommendation) {
            case 'OVER':
                return 'border-emerald-500/30 bg-emerald-500/5';
            case 'UNDER':
                return 'border-blue-500/30 bg-blue-500/5';
            default:
                return 'border-zinc-800 bg-zinc-950/50';
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-zinc-950 border border-zinc-900 rounded-2xl h-40 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-oxanium font-bold text-white tracking-tight">
                            Intelligence Center
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-500">
                            {filteredGames.length} oportunidades analisadas
                        </p>
                    </div>
                </div>

                {/* Filters - Scrollable on mobile */}
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${filter === 'all'
                            ? 'bg-emerald-500 text-black'
                            : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
                            }`}
                    >
                        Todas
                    </button>
                    <button
                        onClick={() => setFilter('high')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${filter === 'high'
                            ? 'bg-orange-500 text-black'
                            : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
                            }`}
                    >
                        Alta Confiança
                    </button>
                    <button
                        onClick={() => setFilter('over')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${filter === 'over'
                            ? 'bg-emerald-500 text-black'
                            : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
                            }`}
                    >
                        Over
                    </button>
                    <button
                        onClick={() => setFilter('under')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${filter === 'under'
                            ? 'bg-blue-500 text-black'
                            : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
                            }`}
                    >
                        Under
                    </button>
                </div>
            </div>

            {/* Game List */}
            <div className="space-y-4">
                {filteredGames.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-950/20 rounded-2xl border border-zinc-900 border-dashed">
                        <Filter className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                        <p className="text-zinc-600 text-lg font-medium">
                            Nenhum jogo encontrado com este filtro
                        </p>
                    </div>
                ) : (
                    filteredGames.map(({ game, intelligence }, index) => (
                        <div
                            key={game.eventId}
                            onClick={() => onSelectGame(game)}
                            className={`relative border-2 rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.02] ${getRecommendationColor(
                                intelligence.recommendation
                            )} group`}
                        >
                            {/* Rank Badge */}
                            <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center border-4 border-black shadow-lg">
                                <span className="text-sm font-black text-black">#{index + 1}</span>
                            </div>

                            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                {/* Teams Section */}
                                <div className="flex-1">
                                    <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6 mb-4">
                                        <div className="flex items-center gap-3 flex-1 sm:flex-none">
                                            <img
                                                src={getTeamLogo(game.bottom.seoIdentifier)}
                                                alt={game.bottom.name}
                                                className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                                            />
                                            <div className="min-w-0">
                                                <p className="text-white font-bold text-sm sm:text-base truncate">{game.bottom.shortName}</p>
                                                <p className="text-zinc-600 text-[10px] sm:text-xs truncate">{game.bottom.record}</p>
                                                <p className="text-emerald-500/50 text-[8px] font-black uppercase">CASA</p>
                                            </div>
                                        </div>

                                        <span className="text-zinc-700 font-bold text-xs sm:text-sm italic">x</span>

                                        <div className="flex items-center gap-3 flex-1 sm:flex-none justify-end sm:justify-start">
                                            <div className="min-w-0 text-right sm:text-left">
                                                <p className="text-white font-bold text-sm sm:text-base truncate">{game.top.shortName}</p>
                                                <p className="text-zinc-600 text-[10px] sm:text-xs truncate">{game.top.record}</p>
                                                <p className="text-zinc-500 text-[8px] font-black uppercase">FORA</p>
                                            </div>
                                            <img
                                                src={getTeamLogo(game.top.seoIdentifier)}
                                                alt={game.top.name}
                                                className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                                            />
                                        </div>
                                    </div>

                                    {/* Reasons - Grid on mobile/tablet */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1">
                                        {intelligence.reasons.slice(0, 3).map((reason, i) => (
                                            <p key={i} className="text-[10px] sm:text-xs text-zinc-400 flex items-center gap-2">
                                                <span className="w-1 h-1 bg-emerald-500 rounded-full shrink-0" />
                                                {reason}
                                            </p>
                                        ))}
                                    </div>
                                </div>

                                {/* Intelligence Metrics - Dynamic Layout */}
                                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-4 lg:pt-0 border-t border-zinc-800/50 lg:border-t-0 lg:ml-auto">

                                    {/* Over Probability */}
                                    <div className="text-left sm:text-right flex-1 sm:flex-none min-w-[80px]">
                                        <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5 sm:mb-1">
                                            Prob. Over
                                        </p>
                                        <p className="text-base sm:text-xl font-oxanium font-bold text-emerald-500">
                                            {intelligence.overUnderProbability}%
                                        </p>
                                    </div>

                                    {/* Intelligence Score */}
                                    <div className="text-center sm:text-right flex-1 sm:flex-none min-w-[80px]">
                                        <div className="flex items-center sm:justify-end gap-1.5 mb-0.5 sm:mb-1">
                                            {getConfidenceIcon(intelligence.confidence)}
                                            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                                {intelligence.confidence}
                                            </span>
                                        </div>
                                        <div className="text-xl sm:text-3xl font-oxanium font-bold text-white">
                                            {intelligence.intelligenceScore}
                                            <span className="text-xs sm:text-sm text-zinc-600 font-normal">/100</span>
                                        </div>
                                    </div>

                                    {/* Recommendation Box */}
                                    <div className="flex items-center gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-black/40 rounded-xl border border-zinc-800 w-full sm:w-auto mt-2 sm:mt-0">
                                        <div className="shrink-0">
                                            {getRecommendationIcon(intelligence.recommendation)}
                                        </div>
                                        <div className="flex-1 sm:text-right">
                                            <p className="text-[8px] sm:text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                                                DICA
                                            </p>
                                            <p
                                                className={`text-xs sm:text-sm font-black uppercase tracking-tight ${intelligence.recommendation === 'OVER'
                                                    ? 'text-emerald-500'
                                                    : intelligence.recommendation === 'UNDER'
                                                        ? 'text-blue-500'
                                                        : 'text-zinc-600'
                                                    }`}
                                            >
                                                {intelligence.recommendation}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Sub-metrics/Trends Tags */}
                                <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                                    <div className="px-2 py-0.5 bg-zinc-900/80 rounded text-[9px] sm:text-[10px] border border-zinc-800 whitespace-nowrap">
                                        <span className="text-zinc-500">{intelligence.trends.recentOverUnder}</span>
                                    </div>
                                    <div className="px-2 py-0.5 bg-zinc-900/80 rounded text-[9px] sm:text-[10px] border border-zinc-800 whitespace-nowrap">
                                        <span className="text-zinc-500">{intelligence.trends.teamPace}</span>
                                    </div>
                                    {intelligence.trends.playerHotStreak && (
                                        <div className="px-2 py-0.5 bg-orange-500/10 rounded text-[9px] sm:text-[10px] border border-orange-500/20 whitespace-nowrap">
                                            <span className="text-orange-500 font-bold">🔥 HOT</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Hover Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default IntelligencePanel;
