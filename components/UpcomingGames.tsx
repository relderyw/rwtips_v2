import React, { useState, useEffect } from 'react';
import { fetchUpcomingGames } from '../services/api';
import { UpcomingMatch } from '../types';
import { getLeagueInfo } from '../services/analyzer';

export const UpcomingGames: React.FC = () => {
    const [games, setGames] = useState<UpcomingMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLeague, setSelectedLeague] = useState<string>('all');
    const [refreshTime, setRefreshTime] = useState<Date>(new Date());

    useEffect(() => {
        let isMounted = true;
        const loadGames = async () => {
            setLoading(true);
            try {
                const upcoming = await fetchUpcomingGames();
                if (isMounted) {
                    setGames(upcoming);
                    setRefreshTime(new Date());
                }
            } catch (err) {
                console.error("Failed to load upcoming games", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadGames();
        
        // Auto refresh every 5 minutes
        const interval = setInterval(loadGames, 300000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const leagues = Array.from(new Set(games.map(g => {
        const info = getLeagueInfo(g.leagueName);
        return info.name;
    }))).sort();

    const filteredGames = games.filter(g => {
        if (selectedLeague === 'all') return true;
        return getLeagueInfo(g.leagueName).name === selectedLeague;
    });

    const formatMatchDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let dayString = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        if (date.toDateString() === today.toDateString()) {
            dayString = "Hoje";
        } else if (date.toDateString() === tomorrow.toDateString()) {
            dayString = "Amanhã";
        }

        const timeString = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `${dayString} às ${timeString}`;
    };

    return (
        <div className="space-y-6 slide-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111115] p-5 rounded-2xl border border-[#25252a] card-glow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
                        <i className="fa-solid fa-calendar-days text-indigo-500"></i>
                        Próximos Jogos (Prematch)
                    </h2>
                    <p className="text-sm text-slate-400 mt-1.5 flex items-center gap-2">
                        <i className="fa-solid fa-bolt text-indigo-400"></i>
                        Eventos programados para as próximas 48 horas
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto relative z-10">
                    {loading && (
                        <div className="text-sm text-slate-400 flex items-center gap-2">
                            <i className="fa-solid fa-circle-notch fa-spin text-indigo-500"></i>
                            Atualizando...
                        </div>
                    )}
                    {!loading && (
                        <div className="text-xs text-slate-500 hidden sm:block">
                            Última atualização: {refreshTime.toLocaleTimeString('pt-BR')}
                        </div>
                    )}
                    <select
                        value={selectedLeague}
                        onChange={(e) => setSelectedLeague(e.target.value)}
                        className="w-full sm:w-auto bg-[#16161b] border border-[#25252a] text-white text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                    >
                        <option value="all">Todas as Ligas ({games.length})</option>
                        {leagues.map(l => {
                            const count = games.filter(g => getLeagueInfo(g.leagueName).name === l).length;
                            return (
                                <option key={l} value={l}>{l} ({count})</option>
                            );
                        })}
                    </select>
                </div>
            </div>

            {loading && games.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-[#111115] border border-[#25252a] rounded-2xl">
                    <div className="w-12 h-12 border-4 border-[#16161b] border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-400 font-medium">Carregando eventos futuros...</p>
                </div>
            ) : filteredGames.length === 0 ? (
                <div className="bg-[#111115] border border-[#25252a] rounded-2xl p-10 text-center">
                    <div className="w-16 h-16 bg-[#16161b] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#25252a]">
                        <i className="fa-solid fa-calendar-xmark text-slate-500 text-2xl"></i>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Nenhum jogo encontrado</h3>
                    <p className="text-slate-400 max-w-md mx-auto">
                        Não há eventos programados para esta liga nas próximas 48 horas.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredGames.map((game, index) => {
                        const info = getLeagueInfo(game.leagueName);
                        
                        return (
                            <div 
                                key={game.id || index} 
                                className="bg-[#111115] border border-[#25252a] rounded-xl overflow-hidden hover:border-[#35353a] transition-all duration-300 flex flex-col group relative"
                            >
                                {/* Faixa colorida da liga */}
                                <div 
                                    className="h-1 w-full absolute top-0 left-0"
                                    style={{ backgroundColor: info.color }}
                                />
                                
                                <div className="p-4 flex-grow flex flex-col">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            {info.image ? (
                                                <img src={info.image} alt={info.name} className="w-5 h-5 object-contain" />
                                            ) : (
                                                <i className="fa-solid fa-trophy text-slate-400 text-sm"></i>
                                            )}
                                            <span className="text-xs font-semibold tracking-wider text-slate-300" style={{ color: info.color }}>
                                                {info.name}
                                            </span>
                                        </div>
                                        <div className="bg-[#16161b] px-2.5 py-1 rounded-md text-[10px] font-medium text-slate-400 border border-[#25252a] flex items-center gap-1.5">
                                            <i className="fa-regular fa-clock text-indigo-400"></i>
                                            {formatMatchDate(game.matchDate)}
                                        </div>
                                    </div>

                                    <div className="flex-grow flex flex-col justify-center gap-3 mt-2">
                                        <div className="flex items-center justify-between group/player">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded bg-[#16161b] border border-[#25252a] flex items-center justify-center text-[10px] text-slate-500 font-bold">
                                                    1
                                                </div>
                                                <div>
                                                    <span className="text-sm font-bold text-white block truncate max-w-[140px] group-hover/player:text-indigo-400 transition-colors">
                                                        {game.homePlayer}
                                                    </span>
                                                    {game.homeTeamName && (
                                                        <span className="text-[10px] text-slate-500 truncate max-w-[140px] block">
                                                            {game.homeTeamName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {game.odds.home > 0 && (
                                                <div className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                                                    {game.odds.home.toFixed(2)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#25252a] to-transparent"></div>

                                        <div className="flex items-center justify-between group/player">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded bg-[#16161b] border border-[#25252a] flex items-center justify-center text-[10px] text-slate-500 font-bold">
                                                    2
                                                </div>
                                                <div>
                                                    <span className="text-sm font-bold text-white block truncate max-w-[140px] group-hover/player:text-indigo-400 transition-colors">
                                                        {game.awayPlayer}
                                                    </span>
                                                    {game.awayTeamName && (
                                                        <span className="text-[10px] text-slate-500 truncate max-w-[140px] block">
                                                            {game.awayTeamName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {game.odds.away > 0 && (
                                                <div className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                                                    {game.odds.away.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Empate Odd */}
                                {game.odds.draw > 0 && (
                                    <div className="px-4 py-2 bg-[#16161b] border-t border-[#25252a] flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Empate (X)</span>
                                        <span className="font-semibold text-slate-300 bg-[#25252a] px-2 py-0.5 rounded">
                                            {game.odds.draw.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
