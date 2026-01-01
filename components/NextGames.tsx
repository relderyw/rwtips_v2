import React, { useEffect, useState } from 'react';

interface NextGame {
    id: string;
    home: { name: string; team: string; image: string };
    away: { name: string; team: string; image: string };
    time: string;
    league: { name: string };
}

export const NextGames: React.FC = () => {
    const [games, setGames] = useState<NextGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [nextUpdateIn, setNextUpdateIn] = useState(120); // 2 minutes seconds

    const fetchGames = async () => {
        setLoading(true);
        try {
            // Adjust URL if running on a different port/proxy, but relative path should work if proxied or same origin
            // In dev mode (vite), we might need to point to localhost:8080 if proxy isn't set up. 
            // For now assuming localhost:8080 based on server-bot.ts
            const res = await fetch('http://localhost:8080/api/next-games');
            const data = await res.json();
            if (data.success) {
                setGames(data.results);
                setLastUpdate(new Date());
                setNextUpdateIn(120);
            }
        } catch (error) {
            console.error("Erro ao buscar próximos jogos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGames();

        const interval = setInterval(() => {
            fetchGames();
        }, 120000); // 2 minutes

        const countdown = setInterval(() => {
            setNextUpdateIn(prev => (prev > 0 ? prev - 1 : 120));
        }, 1000);

        return () => {
            clearInterval(interval);
            clearInterval(countdown);
        };
    }, []);

    if (loading && games.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-white/50">
                <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="uppercase tracking-widest text-xs font-black">Buscando Próximos Jogos...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white/[0.01] border border-white/[0.05] p-6 rounded-[2.5rem] backdrop-blur-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                <div className="flex flex-col">
                    <h3 className="text-xl font-black italic text-white tracking-tighter">PRÓXIMOS <span className="text-emerald-500">JOGOS</span></h3>
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em] mt-1">Monitoramento em Tempo Real - Update em {nextUpdateIn}s</p>
                </div>
                <button onClick={fetchGames} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white flex items-center gap-2">
                    <i className={`fa-solid fa-rotate ${loading ? 'animate-spin' : ''}`}></i> Atualizar Agora
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {games.map((game, idx) => (
                    <div key={idx} className="bg-[#0c0c0e] rounded-xl overflow-hidden border border-white/5 hover:border-emerald-500/30 transition-all group">

                        {/* Desktop Layout - Adapted from provided HTML */}
                        <div className="hidden lg:flex justify-between relative h-[144px]">
                            {/* P1 Image */}
                            <div className="relative w-[128px] h-full shrink-0">
                                <img src={game.home.image} alt={game.home.name} className="w-full h-full object-cover rounded-tl-xl rounded-bl-xl opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0c0c0e]"></div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-2">
                                <div className="grid grid-cols-3 w-full items-center">
                                    {/* Home Name */}
                                    <div className="text-right flex flex-col items-end">
                                        <span className="text-xl font-black uppercase italic leading-none truncate w-full">{game.home.name}</span>
                                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest truncate w-full text-right">{game.home.team}</span>
                                    </div>

                                    {/* VS / Time */}
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-mono font-bold text-white/30">{game.time.split(' ')[1]}</span>
                                        <div className="text-emerald-500 text-2xl font-black italic my-1">VS</div>
                                        <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">{game.id}</span>
                                    </div>

                                    {/* Away Name */}
                                    <div className="text-left flex flex-col items-start">
                                        <span className="text-xl font-black uppercase italic leading-none truncate w-full">{game.away.name}</span>
                                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest truncate w-full text-left">{game.away.team}</span>
                                    </div>
                                </div>
                                <div className="mt-2 text-[8px] font-black uppercase tracking-[0.2em] text-white/10">{game.time.split(' ')[0]}</div>
                            </div>

                            {/* P2 Image */}
                            <div className="relative w-[128px] h-full shrink-0">
                                <img src={game.away.image} alt={game.away.name} className="w-full h-full object-cover rounded-tr-xl rounded-br-xl opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0c0c0e]"></div>
                            </div>
                        </div>

                        {/* Mobile Layout */}
                        <div className="flex lg:hidden justify-between relative h-[100px]">
                            <div className="relative w-[60px] h-full">
                                <img src={game.home.image} alt="" className="w-full h-full object-cover opacity-60" />
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0c0c0e]"></div>
                            </div>

                            <div className="flex-1 flex items-center justify-between px-2 gap-2">
                                <div className="flex flex-col items-center w-1/3">
                                    <span className="text-sm font-black uppercase italic truncate w-full text-center">{game.home.name}</span>
                                </div>
                                <div className="flex flex-col items-center w-1/3">
                                    <span className="text-[8px] font-bold text-emerald-500 uppercase">VS</span>
                                    <span className="text-[8px] font-bold text-white/40 mt-1">{game.time.split(' ')[1]}</span>
                                </div>
                                <div className="flex flex-col items-center w-1/3">
                                    <span className="text-sm font-black uppercase italic truncate w-full text-center">{game.away.name}</span>
                                </div>
                            </div>

                            <div className="relative w-[60px] h-full">
                                <img src={game.away.image} alt="" className="w-full h-full object-cover opacity-60" />
                                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0c0c0e]"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {games.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-white/30">
                    <i className="fa-solid fa-calendar-xmark text-4xl mb-4"></i>
                    <p className="uppercase tracking-widest text-xs font-black">Nenhum jogo encontrado</p>
                </div>
            )}
        </div>
    );
};
