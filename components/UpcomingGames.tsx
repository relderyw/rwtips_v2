import React, { useState, useEffect } from 'react';
import { fetchUpcomingGames } from '../services/api';
import { UpcomingMatch } from '../types';
import { getLeagueInfo } from '../services/analyzer';
import axios from 'axios';
import * as cheerio from 'cheerio';

const scrapeDraftedCup = async (url: string, leagueName: string): Promise<UpcomingMatch[]> => {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
        const matches: UpcomingMatch[] = [];
        
        // Extract real match dates from Next.js data payload
        const isoDates = html.match(/202[4-9]-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/g) || [];
        const uniqueDates = Array.from(new Set(isoDates)).sort();
        
        $('.grid.grid-cols-3.items-center.w-full').each((i, el) => {
            const card = $(el);
            const players = card.find('div.uppercase, .text-3\\.5xl')
                .map((_, d) => $(d).text().trim())
                .get()
                .filter(txt => txt.length > 0 && txt.toLowerCase() !== 'vs' && !txt.includes('Match'));
            
            const uniquePlayers = players.filter((val, idx, arr) => val !== arr[idx-1]);

            if (uniquePlayers.length >= 2) {
                // Use the extracted date if available, otherwise current time
                const matchDateStr = uniqueDates[i] || new Date().toISOString();

                matches.push({
                    id: `drafted-${leagueName.replace(/[^a-zA-Z0-9]/g, '-')}-${i}-${Date.now()}`,
                    homePlayer: uniquePlayers[0],
                    awayPlayer: uniquePlayers[1],
                    leagueName: leagueName,
                    matchDate: matchDateStr
                } as UpcomingMatch);
            }
        });
        return matches;
    } catch (e) {
        console.error("Erro no scraping do Drafted:", e);
        return [];
    }
};

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
                // Carrega jogos da Superbet
                const superbetGames = await fetchUpcomingGames();
                
                // Carrega jogos do Drafted.gg diretamente via scraping
                const draftedValkyrie = await scrapeDraftedCup('/api/drafted-proxy/en/valkyrie-cup/upcoming-matches', 'VALKYRIE CUP - 12 MIN').catch(() => []);
                const draftedValhalla = await scrapeDraftedCup('/api/drafted-proxy/en/valhalla-cup/upcoming-matches', 'VALHALLA CUP - 12 MIN').catch(() => []);

                const allGames = [...superbetGames, ...draftedValkyrie, ...draftedValhalla];
                
                // Sort games chronologically
                allGames.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
                
                if (isMounted) {
                    setGames(allGames);
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
                <div className="bg-[#111115] border border-[#25252a] rounded-2xl overflow-hidden flex flex-col">
                    {/* Cabeçalho da Lista */}
                    <div className="hidden md:flex items-center px-6 py-4 bg-[#16161b] border-b border-[#25252a] text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <div className="w-32">Horário</div>
                        <div className="w-48">Liga</div>
                        <div className="flex-1 text-right pr-4">Mandante</div>
                        <div className="w-12 text-center"></div>
                        <div className="flex-1 text-left pl-4">Visitante</div>
                    </div>

                    {/* Lista de Jogos */}
                    <div className="flex flex-col divide-y divide-[#25252a]/50">
                        {filteredGames.map((game, index) => {
                            const info = getLeagueInfo(game.leagueName);
                            
                            return (
                                <div 
                                    key={game.id || index} 
                                    className="flex flex-col md:flex-row md:items-center px-4 md:px-6 py-4 hover:bg-[#16161b]/80 transition-colors group relative"
                                >
                                    {/* Faixa lateral colorida visível no desktop */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: info.color }}></div>

                                    {/* Mobile: Header (Hora e Liga) */}
                                    <div className="flex items-center justify-between mb-3 md:hidden">
                                        <div className="bg-[#16161b] px-2.5 py-1 rounded-md text-[10px] font-medium text-slate-300 border border-[#25252a] flex items-center gap-1.5">
                                            <i className="fa-regular fa-clock text-indigo-400"></i>
                                            {formatMatchDate(game.matchDate)}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: info.color }}></div>
                                            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: info.color }}>
                                                {info.name}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Desktop: Horário */}
                                    <div className="hidden md:flex w-32 text-sm font-medium text-slate-300 items-center gap-2">
                                        <i className="fa-regular fa-clock text-slate-500 text-xs"></i>
                                        {formatMatchDate(game.matchDate)}
                                    </div>

                                    {/* Desktop: Liga */}
                                    <div className="hidden md:flex w-48 items-center gap-2">
                                        <div className="w-1.5 h-4 rounded-full shadow-sm" style={{ backgroundColor: info.color, boxShadow: `0 0 8px ${info.color}40` }}></div>
                                        <span className="text-xs font-black uppercase tracking-wider truncate" style={{ color: info.color }}>
                                            {info.name}
                                        </span>
                                    </div>

                                    {/* Times */}
                                    <div className="flex-1 flex items-center justify-between md:justify-center gap-2 md:gap-4 mb-3 md:mb-0">
                                        <div className="flex-1 text-left md:text-right">
                                            <span className="text-sm md:text-base font-bold text-white block truncate md:group-hover:text-indigo-400 transition-colors">
                                                {game.homePlayer}
                                            </span>
                                            {game.homeTeamName && (
                                                <span className="text-[10px] text-slate-500 truncate block">
                                                    {game.homeTeamName}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="flex-shrink-0 px-3 py-1 bg-black/40 border border-[#25252a] rounded-lg shadow-inner">
                                            <span className="text-[10px] font-black text-slate-600 italic uppercase">VS</span>
                                        </div>

                                        <div className="flex-1 text-right md:text-left">
                                            <span className="text-sm md:text-base font-bold text-white block truncate md:group-hover:text-indigo-400 transition-colors">
                                                {game.awayPlayer}
                                            </span>
                                            {game.awayTeamName && (
                                                <span className="text-[10px] text-slate-500 truncate block">
                                                    {game.awayTeamName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
