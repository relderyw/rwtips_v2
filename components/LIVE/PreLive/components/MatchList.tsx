
import React, { useMemo } from 'react';
import { ApiResponse, Game, ViewType } from '../types';
import { getCountryLogo } from '../services/api';
import MatchRow from './MatchRow';
import clsx from 'clsx';
import { Trophy } from 'lucide-react';

interface MatchListProps {
    data: ApiResponse | null;
    activeView: ViewType;
    onMatchClick: (match: Game) => void;
    loading: boolean;
}

const MatchList: React.FC<MatchListProps> = ({ data, activeView, onMatchClick, loading }) => {
    const groupedMatches = useMemo(() => {
        if (!data || !data.games) return [];

        const filtered = data.games.filter(game => {
            const status = game.statusGroup;
            if (activeView === 'LIVE') return status === 3;
            if (activeView === 'FINISHED') return status === 4;
            return status === 1 || status === 2;
        });

        const groups: any = {};
        filtered.forEach(game => {
            const comp = data.competitions.find(c => c.id === game.competitionId);
            const country = data.countries?.find((c: any) => c.id === comp?.countryId) || { id: 1, name: 'Internacional' };

            const countryKey = country.name;
            if (!groups[countryKey]) {
                groups[countryKey] = { country, leagues: {} };
            }

            const leagueKey = game.competitionDisplayName;
            if (!groups[countryKey].leagues[leagueKey]) {
                groups[countryKey].leagues[leagueKey] = { name: leagueKey, compId: game.competitionId, matches: [] };
            }

            groups[countryKey].leagues[leagueKey].matches.push(game);
        });

        return Object.values(groups);
    }, [data, activeView]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-6">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] animate-pulse">Sincronizando Jogos...</p>
            </div>
        )
    }

    if (groupedMatches.length === 0) {
        return (
            <div className="text-center py-40 bg-white/5 rounded-3xl border border-dashed border-white/10 m-4">
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhuma partida encontrada.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {groupedMatches.map((countryGroup: any, idx: number) => (
                <div key={idx} className="space-y-4">
                    {Object.values(countryGroup.leagues).map((leagueGroup: any, lIdx: number) => (
                        <div key={lIdx} className="overflow-hidden rounded-2xl border border-white/5 bg-[#0f141e]/40 shadow-xl backdrop-blur-sm">
                            <div className="flex items-center gap-3 py-3 px-5 bg-white/[0.02] border-b border-white/[0.02]">
                                <img src={getCountryLogo(countryGroup.country.id)} className="w-4 h-4 rounded-full object-cover opacity-80" alt="" />
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{countryGroup.country.name}</span>
                                    <span className="text-slate-600 text-[10px]">•</span>
                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">{leagueGroup.name}</span>
                                </div>
                            </div>
                            <div className="divide-y divide-white/[0.02]">
                                {leagueGroup.matches.map((game: Game) => (
                                    <MatchRow key={game.id} match={game} onClick={onMatchClick} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default MatchList;
