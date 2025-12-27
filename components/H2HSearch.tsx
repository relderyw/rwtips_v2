import React, { useState, useEffect, useRef } from 'react';
import { fetchConfronto, fetchPlayers } from '../services/api';

interface H2HStats {
    player1: string; player2: string; wins_p1: number; wins_p2: number; draws: number;
    wins_p1_pct: number; wins_p2_pct: number; draws_pct: number;
    outcome_dots: any[]; player1_recent_dots: any[]; player2_recent_dots: any[];
    matches: any[]; btts_pct: number; avg_goals: number;
}

interface ParsedMatch {
    ftHome: number; ftAway: number; htHome: number; htAway: number; btts: boolean; htBtts: boolean;
}

const parseDotsToMatches = (dots: any[], playerName: string): ParsedMatch[] => {
    if (!dots) return [];
    return dots.map(dot => {
        const toolStr = dot.tooltip || "", htStr = dot.half_time || "";

        // Robust extraction: Split by common delimiters
        const parts = toolStr.split(/\s*-\s*|\s*[xX]\s*/).map(p => p.trim());
        if (parts.length < 2) return { ftHome: 0, ftAway: 0, htHome: 0, htAway: 0, btts: false, htBtts: false };

        const extractScore = (s: string) => {
            // Pick only the LAST number in the string part (the score) to avoid dates
            const nums = s.match(/\d+/g);
            return nums ? parseInt(nums[nums.length - 1]) : 0;
        };

        const sideA = parts[0], sideB = parts[parts.length - 1];
        const scoreA = extractScore(sideA), scoreB = extractScore(sideB);
        const pNameNorm = playerName.toLowerCase().trim();

        // Perspective: is player on Side A?
        const isPlayerA = sideA.toLowerCase().includes(pNameNorm) || pNameNorm.includes(sideA.toLowerCase());

        const ftHome = isPlayerA ? scoreA : scoreB;
        const ftAway = isPlayerA ? scoreB : scoreA;

        // HT parsing from "X-Y" format
        const htNums = (htStr.match(/\d+/g) || [0, 0]).map(Number);
        let htHome = isPlayerA ? htNums[0] : htNums[1];
        let htAway = isPlayerA ? htNums[1] : htNums[0];

        // SANITY CHECK: Impossible scores? (HT > FT)
        // If impossible, try swapping HT perspective
        if (htHome > ftHome || htAway > ftAway) {
            const swappedHtHome = htAway;
            const swappedHtAway = htHome;
            // If swapping fixes it (and original was broken), use swap
            if (swappedHtHome <= ftHome && swappedHtAway <= ftAway) {
                htHome = swappedHtHome;
                htAway = swappedHtAway;
            }
        }

        return { ftHome, ftAway, htHome, htAway, btts: ftHome > 0 && ftAway > 0, htBtts: htHome > 0 && htAway > 0 };
    });
};

const calculateMetrics = (matches: ParsedMatch[]) => {
    const total = matches.length;
    if (total === 0) return {
        ht_05: 0, ht_15: 0, ht_25: 0, ht_btts: 0,
        ft_15: 0, ft_25: 0, ft_35: 0, ft_45: 0, ft_55: 0, ft_btts: 0,
        avgGoals: "0.0", avgGoalsHT: "0.0",
        avgScored: "0.0", avgConceded: "0.0",
        avgScoredHT: "0.0", avgConcededHT: "0.0",
        winPct: 0, drawPct: 0, lossPct: 0,
        wins: 0, draws: 0, losses: 0
    };

    const count = (fn: (m: ParsedMatch) => boolean) => matches.filter(fn).length;
    const sum = (fn: (m: ParsedMatch) => number) => matches.reduce((s, m) => s + fn(m), 0);

    return {
        ht_05: (count(m => (m.htHome + m.htAway) > 0.5) / total) * 100,
        ht_15: (count(m => (m.htHome + m.htAway) > 1.5) / total) * 100,
        ht_25: (count(m => (m.htHome + m.htAway) > 2.5) / total) * 100,
        ht_btts: (count(m => m.htBtts) / total) * 100,
        ft_15: (count(m => (m.ftHome + m.ftAway) > 1.5) / total) * 100,
        ft_25: (count(m => (m.ftHome + m.ftAway) > 2.5) / total) * 100,
        ft_35: (count(m => (m.ftHome + m.ftAway) > 3.5) / total) * 100,
        ft_45: (count(m => (m.ftHome + m.ftAway) > 4.5) / total) * 100,
        ft_55: (count(m => (m.ftHome + m.ftAway) > 5.5) / total) * 100,
        ft_btts: (count(m => m.btts) / total) * 100,
        avgGoals: (sum(m => m.ftHome + m.ftAway) / total).toFixed(1),
        avgGoalsHT: (sum(m => m.htHome + m.htAway) / total).toFixed(1),
        avgScored: (sum(m => m.ftHome) / total).toFixed(1),
        avgConceded: (sum(m => m.ftAway) / total).toFixed(1),
        avgScoredHT: (sum(m => m.htHome) / total).toFixed(1),
        avgConcededHT: (sum(m => m.htAway) / total).toFixed(1),
        wins: count(m => m.ftHome > m.ftAway),
        draws: count(m => m.ftHome === m.ftAway),
        losses: count(m => m.ftHome < m.ftAway),
        winPct: (count(m => m.ftHome > m.ftAway) / total) * 100,
        drawPct: (count(m => m.ftHome === m.ftAway) / total) * 100,
        lossPct: (count(m => m.ftHome < m.ftAway) / total) * 100
    };
};

const getBarColor = (value: number): string => {
    if (value >= 80) return '#10b981'; // Green
    if (value >= 40) return '#f59e0b'; // Amber/Yellow
    return '#f97316'; // Orange/Red
};

export const H2HSearch: React.FC = () => {
    const [player1, setPlayer1] = useState(''), [player2, setPlayer2] = useState(''), [loading, setLoading] = useState(false);
    const [data, setData] = useState<H2HStats | null>(null), [error, setError] = useState('');
    const [analysisMode, setAnalysisMode] = useState<'h2h' | 'individual'>('h2h'), [gameCount, setGameCount] = useState<number>(5), [stats, setStats] = useState<any>(null);

    // Autocomplete states
    const [suggestions1, setSuggestions1] = useState<string[]>([]);
    const [suggestions2, setSuggestions2] = useState<string[]>([]);
    const [showSuggestions1, setShowSuggestions1] = useState(false);
    const [showSuggestions2, setShowSuggestions2] = useState(false);
    const [loadingSuggestions1, setLoadingSuggestions1] = useState(false);
    const [loadingSuggestions2, setLoadingSuggestions2] = useState(false);

    const input1Ref = useRef<HTMLInputElement>(null);
    const input2Ref = useRef<HTMLInputElement>(null);

    // Debounce to prevent too many requests
    useEffect(() => {
        const timer = setTimeout(() => {
            if (player1.length >= 2) {
                setLoadingSuggestions1(true);
                fetchPlayers(player1).then(sugs => {
                    setSuggestions1(sugs);
                    setLoadingSuggestions1(false);
                });
            } else {
                setSuggestions1([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [player1]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (player2.length >= 2) {
                setLoadingSuggestions2(true);
                fetchPlayers(player2).then(sugs => {
                    setSuggestions2(sugs);
                    setLoadingSuggestions2(false);
                });
            } else {
                setSuggestions2([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [player2]);

    const handleSelectPlayer1 = (name: string) => {
        setPlayer1(name);
        setSuggestions1([]);
        setShowSuggestions1(false);
        input2Ref.current?.focus();
    };

    const handleSelectPlayer2 = (name: string) => {
        setPlayer2(name);
        setSuggestions2([]);
        setShowSuggestions2(false);
    };

    const handleSearch = async () => {
        if (!player1.trim() || !player2.trim()) {
            setError('Informe os dois jogadores');
            return;
        }
        setLoading(true);
        setError('');
        setData(null);
        setStats(null);
        try {
            const result = await fetchConfronto(player1.trim(), player2.trim());
            if (result && result.matches?.length > 0) {
                setData(result);
            } else {
                setError('Nenhum confronto encontrado');
            }
        } catch (err) {
            setError('Erro ao buscar confronto');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!data) return;

        // Always calculate Individual stats for Column 1 & 2
        const p1Recent = parseDotsToMatches(data.player1_recent_dots, player1).slice(0, gameCount);
        const p2Recent = parseDotsToMatches(data.player2_recent_dots, player2).slice(0, gameCount);

        // Calculate H2H stats for Column 3
        const h2hMatches = data.matches.slice(0, gameCount).map((m: any) => {
            const p1IsHome = m.home_player.toLowerCase().includes(player1.toLowerCase());
            return {
                ftHome: p1IsHome ? m.home_score_ft : m.away_score_ft,
                ftAway: p1IsHome ? m.away_score_ft : m.home_score_ft,
                htHome: p1IsHome ? m.home_score_ht : m.away_score_ht,
                htAway: p1IsHome ? m.away_score_ht : m.home_score_ht,
                btts: (m.home_score_ft > 0 && m.away_score_ft > 0),
                htBtts: (m.home_score_ht > 0 && m.away_score_ht > 0)
            };
        });

        setStats({
            p1: calculateMetrics(p1Recent),
            p2: calculateMetrics(p2Recent),
            h2h: calculateMetrics(h2hMatches)
        });
    }, [data, gameCount, player1, player2]);

    const getSmartRecommendations = () => {
        if (!stats) return { p1: [], p2: [] };
        const groups: { [key: string]: any[] } = { p1: [], p2: [] };

        // For recommendations, we always want to look at the stats of the specific column
        // But the user might want recommendations based on the active mode.
        // Let's stick to P1 and P2 individual history for their respective boxes.
        const s1 = stats.p1;
        const p1Metrics = [
            { id: 'p1_15', label: `OVER 1.5 FT`, value: s1.ft_15 },
            { id: 'p1_25', label: `OVER 2.5 FT`, value: s1.ft_25 },
            { id: 'p1_35', label: `OVER 3.5 FT`, value: s1.ft_35 },
            { id: 'p1_win', label: 'VITÓRIA', value: s1.winPct }
        ];
        groups.p1 = p1Metrics.filter(m => m.value >= 70);

        const s2 = stats.p2;
        const p2Metrics = [
            { id: 'p2_15', label: `OVER 1.5 FT`, value: s2.ft_15 },
            { id: 'p2_25', label: `OVER 2.5 FT`, value: s2.ft_25 },
            { id: 'p2_35', label: `OVER 3.5 FT`, value: s2.ft_35 },
            { id: 'p2_win', label: 'VITÓRIA', value: s2.winPct }
        ];
        groups.p2 = p2Metrics.filter(m => m.value >= 70);

        return groups;
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 max-w-[1600px] mx-auto">
            {/* HEADER */}
            <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-5 mb-4">
                <div className="grid grid-cols-3 gap-3 relative">
                    {/* INPUT PLAYER 1 COM AUTOCOMPLETE */}
                    <div className="relative">
                        <input
                            ref={input1Ref}
                            type="text"
                            value={player1}
                            onChange={(e) => setPlayer1(e.target.value)}
                            onFocus={() => setShowSuggestions1(true)}
                            placeholder="Jogador 1 (digite para buscar)"
                            className="w-full bg-black border-2 border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500 transition-all"
                        />
                        {showSuggestions1 && (suggestions1.length > 0 || loadingSuggestions1) && (
                            <div className="absolute top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                                {loadingSuggestions1 ? (
                                    <div className="px-4 py-3 text-xs text-zinc-500">Buscando...</div>
                                ) : (
                                    suggestions1.map((name, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelectPlayer1(name)}
                                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-800 transition-all"
                                        >
                                            {name}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* INPUT PLAYER 2 COM AUTOCOMPLETE */}
                    <div className="relative">
                        <input
                            ref={input2Ref}
                            type="text"
                            value={player2}
                            onChange={(e) => setPlayer2(e.target.value)}
                            onFocus={() => setShowSuggestions2(true)}
                            placeholder="Jogador 2 (digite para buscar)"
                            className="w-full bg-black border-2 border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                        />
                        {showSuggestions2 && (suggestions2.length > 0 || loadingSuggestions2) && (
                            <div className="absolute top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                                {loadingSuggestions2 ? (
                                    <div className="px-4 py-3 text-xs text-zinc-500">Buscando...</div>
                                ) : (
                                    suggestions2.map((name, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelectPlayer2(name)}
                                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-800 transition-all"
                                        >
                                            {name}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-bold py-3 rounded-xl text-sm disabled:opacity-50 transition-all"
                    >
                        {loading ? 'Analisando...' : '🚀 ANALISAR'}
                    </button>
                </div>
                {error && <div className="mt-3 text-center text-rose-400 text-sm font-bold">{error}</div>}

                {/* PLAYERS HEADER - MOVED HERE */}
                {data && (
                    <div className="mt-6 pt-6 border-t border-zinc-800/50">
                        <div className="flex items-center justify-between">
                            <div className="text-center flex-1">
                                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-bold">Jogador 1</div>
                                <div className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent leading-tight">{player1}</div>
                            </div>
                            <div className="px-6">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-800 to-black border-2 border-zinc-700 flex items-center justify-center">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase">vs</span>
                                </div>
                            </div>
                            <div className="text-center flex-1">
                                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-bold">Jogador 2</div>
                                <div className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent leading-tight">{player2}</div>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {data && stats && (<>
                {/* CONTROLS + SMART RECOMMENDATIONS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                    {/* CONTROLS */}
                    <div className="bg-black border border-zinc-800 rounded-2xl p-4">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Modo de Análise</div>
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setAnalysisMode('h2h')} className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${analysisMode === 'h2h' ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>H2H</button>
                            <button onClick={() => setAnalysisMode('individual')} className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${analysisMode === 'individual' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>INDIVIDUAL</button>
                        </div>
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Nº de Jogos</div>
                        <div className="flex gap-2">
                            {[5, 10, 15].map(c => (
                                <button key={c} onClick={() => setGameCount(c)} className={`flex-1 h-10 rounded-xl font-black text-sm transition-all ${gameCount === c ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>{c}</button>
                            ))}
                        </div>
                    </div>

                    {/* SMART RECOMMENDATIONS - PREMIUM COMPACT UI */}
                    {Object.values(getSmartRecommendations()).some(group => group.length > 0) && (
                        <div className="lg:col-span-2 bg-[#0a0a0c] border border-zinc-800/50 rounded-2xl p-4 shadow-2xl">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                                <div className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-black">Prognósticos Analíticos</div>
                            </div>

                            <div className="space-y-4">
                                {Object.entries(getSmartRecommendations()).map(([key, group]: [string, any[]]) => {
                                    if (group.length === 0) return null;
                                    const labels: { [k: string]: string } = { p1: `Análise: ${player1}`, p2: `Análise: ${player2}` };
                                    const accentColors: { [k: string]: string } = { p1: 'text-emerald-400', p2: 'text-pink-400' };
                                    const borderColors: { [k: string]: string } = { p1: 'border-emerald-500/30', p2: 'border-pink-500/30' };

                                    return (
                                        <div key={key} className="relative">
                                            <div className={`text-[9px] uppercase font-black tracking-widest mb-2 flex items-center gap-2 ${accentColors[key]}`}>
                                                <span className="opacity-50">—</span> {labels[key]}
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-2">
                                                {group.map((rec, i) => (
                                                    <div key={i} className={`relative flex items-center gap-3 bg-zinc-900/40 border ${borderColors[key]} rounded-lg px-3 py-2 transition-all hover:bg-zinc-800/60 group overflow-hidden`}>
                                                        <div className="flex-1">
                                                            <div className="text-[8px] text-zinc-500 uppercase font-black mb-0.5 tracking-tighter truncate">{rec.label}</div>
                                                            <div className={`text-lg font-black leading-none ${rec.value >= 85 ? accentColors[key] : 'text-zinc-200'}`}>{rec.value.toFixed(0)}%</div>
                                                        </div>

                                                        {/* Small Progress Ring or Bar */}
                                                        <div className="w-1 h-8 bg-zinc-900 rounded-full overflow-hidden self-center">
                                                            <div
                                                                className={`w-full rounded-full transition-all duration-1000 ${rec.value >= 85 ? (key === 'p1' ? 'bg-emerald-500' : 'bg-pink-500') : 'bg-zinc-700'}`}
                                                                style={{ height: `${rec.value}%`, marginTop: `${100 - rec.value}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>



                {/* PROBABILIDADES H2H */}
                <div className="bg-black border border-zinc-800 rounded-2xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-black">Probabilidades H2H (Histórico Direto)</span>
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-2 py-1">
                            <span className="text-[9px] text-zinc-500 uppercase font-black">{gameCount} Jogos Analisados</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-8">
                        {/* HOME WIN */}
                        <div className="space-y-3">
                            <div className="flex items-end justify-between">
                                <span className="text-[10px] text-emerald-500 font-black uppercase tracking-wider">Vitória Casa</span>
                                <span className="text-4xl font-black text-white leading-none">{stats.p1.winPct.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.p1.winPct}%` }}></div>
                            </div>
                        </div>

                        {/* DRAW */}
                        <div className="space-y-3">
                            <div className="flex items-end justify-between">
                                <span className="text-[10px] text-amber-500 font-black uppercase tracking-wider">Empate</span>
                                <span className="text-4xl font-black text-white leading-none">{stats.p1.drawPct.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${stats.p1.drawPct}%` }}></div>
                            </div>
                        </div>

                        {/* AWAY WIN */}
                        <div className="space-y-3">
                            <div className="flex items-end justify-between">
                                <span className="text-[10px] text-rose-500 font-black uppercase tracking-wider">Vitória Fora</span>
                                <span className="text-4xl font-black text-white leading-none">{stats.p1.lossPct.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${stats.p1.lossPct}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RESUMO DOS PLAYERS */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                    {/* PLAYER 1 STATS */}
                    <div className="bg-black border border-zinc-800 rounded-2xl p-3">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-bold">Resumo: {player1}</div>
                        <div className="grid grid-cols-2 gap-2">
                            {/* HT Stats */}
                            <div className="bg-[#1a1b2e]/50 border border-zinc-800/50 rounded-xl p-2.5">
                                <div className="text-[9px] text-amber-400 uppercase mb-1.5 font-black tracking-wider">Half Time</div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-500 uppercase font-bold">Gols Pro</span>
                                        <span className="text-xs font-black text-cyan-400">{stats.p1.avgScoredHT}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-500 uppercase font-bold">Gols Contra</span>
                                        <span className="text-xs font-black text-rose-400">{stats.p1.avgConcededHT}</span>
                                    </div>
                                </div>
                            </div>

                            {/* FT Stats */}
                            <div className="bg-[#1a1b2e]/50 border border-zinc-800/50 rounded-xl p-2.5">
                                <div className="text-[9px] text-cyan-400 uppercase mb-1.5 font-black tracking-wider">Full Time</div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-500 uppercase font-bold">Gols Pro</span>
                                        <span className="text-xs font-black text-cyan-400">{stats.p1.avgScored}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-500 uppercase font-bold">Gols Contra</span>
                                        <span className="text-xs font-black text-rose-400">{stats.p1.avgConceded}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PLAYER 2 STATS */}
                    <div className="bg-black border border-zinc-800 rounded-2xl p-3">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-bold">Resumo: {player2}</div>
                        <div className="grid grid-cols-2 gap-2">
                            {/* HT Stats */}
                            <div className="bg-[#1a1b2e]/50 border border-zinc-800/50 rounded-xl p-2.5">
                                <div className="text-[9px] text-amber-400 uppercase mb-1.5 font-black tracking-wider">Half Time</div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-500 uppercase font-bold">Gols Pro</span>
                                        <span className="text-xs font-black text-emerald-400">{stats.p2.avgScoredHT}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-500 uppercase font-bold">Gols Contra</span>
                                        <span className="text-xs font-black text-rose-400">{stats.p2.avgConcededHT}</span>
                                    </div>
                                </div>
                            </div>

                            {/* FT Stats */}
                            <div className="bg-[#1a1b2e]/50 border border-zinc-800/50 rounded-xl p-2.5">
                                <div className="text-[9px] text-cyan-400 uppercase mb-1.5 font-black tracking-wider">Full Time</div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-500 uppercase font-bold">Gols Pro</span>
                                        <span className="text-xs font-black text-emerald-400">{stats.p2.avgScored}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-500 uppercase font-bold">Gols Contra</span>
                                        <span className="text-xs font-black text-rose-400">{stats.p2.avgConceded}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* LINHAS CONFRONTO - HT & FT LADO A LADO */}
                <div className="bg-black border border-zinc-800 rounded-2xl p-3 mb-3">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-3.5 bg-emerald-500 rounded"></div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Linhas Confronto ({gameCount})</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* HT METRICS */}
                        <div className="bg-zinc-900/20 rounded-xl p-2.5 border border-zinc-800/50">
                            <div className="text-[10px] font-black text-amber-400 mb-2.5 uppercase tracking-widest text-center border-b border-zinc-800 pb-1.5">Half Time (HT)</div>
                            <div className="space-y-1.5">
                                {[
                                    { label: '0.5HT', value: stats.p1.ht_05 },
                                    { label: '1.5HT', value: stats.p1.ht_15 },
                                    { label: '2.5HT', value: stats.p1.ht_25 },
                                    { label: 'BTTS HT', value: stats.p1.ht_btts }
                                ].map((line, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="text-[10px] font-bold text-zinc-400 w-12">{line.label}</div>
                                        <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${line.value}%`, backgroundColor: getBarColor(line.value) }}></div>
                                        </div>
                                        <div className="text-[10px] font-black text-emerald-400 w-10 text-right">{line.value.toFixed(0)}%</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* FT METRICS */}
                        <div className="bg-zinc-900/20 rounded-xl p-2.5 border border-zinc-800/50">
                            <div className="text-[10px] font-black text-cyan-400 mb-2.5 uppercase tracking-widest text-center border-b border-zinc-800 pb-1.5">Full Time (FT)</div>
                            <div className="space-y-1.5">
                                {[
                                    { label: '1.5FT', value: stats.p1.ft_15 },
                                    { label: '2.5FT', value: stats.p1.ft_25 },
                                    { label: '3.5FT', value: stats.p1.ft_35 },
                                    { label: 'BTTS FT', value: stats.p1.ft_btts }
                                ].map((line, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="text-[10px] font-bold text-zinc-400 w-12">{line.label}</div>
                                        <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${line.value}%`, backgroundColor: getBarColor(line.value) }}></div>
                                        </div>
                                        <div className="text-[10px] font-black text-emerald-400 w-10 text-right">{line.value.toFixed(0)}%</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAIN GRID - 3 COLUMNS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start pb-10">
                    {/* PLAYER 1 MATCHES */}
                    <div className="bg-[#0a0a0c] border-2 border-cyan-500/20 rounded-2xl p-4 shadow-xl">
                        <div className="flex flex-col gap-3 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-3 bg-cyan-500 rounded-full"></div>
                                <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Histórico: {player1}</div>
                            </div>

                            {/* STATS SUMMARY P1 */}
                            <div className="grid grid-cols-4 gap-2 bg-zinc-900/50 rounded-xl p-2 border border-zinc-800/50">
                                <div className="text-center">
                                    <div className="text-[8px] text-zinc-500 font-bold uppercase">Marcados</div>
                                    <div className="text-[10px] font-black text-cyan-400">{(stats.p1.avgScoredHT || "0.0")} <span className="text-[8px] text-zinc-600">/</span> {(stats.p1.avgScored || "0.0")}</div>
                                </div>
                                <div className="text-center border-x border-zinc-800/50">
                                    <div className="text-[8px] text-zinc-500 font-bold uppercase">Sofridos</div>
                                    <div className="text-[10px] font-black text-rose-400">{(stats.p1.avgConcededHT || "0.0")} <span className="text-[8px] text-zinc-600">/</span> {(stats.p1.avgConceded || "0.0")}</div>
                                </div>
                                <div className="text-center pr-2 border-r border-zinc-800/50">
                                    <div className="text-[8px] text-zinc-500 font-bold uppercase">BTTS %</div>
                                    <div className="text-[10px] font-black text-emerald-400">{(stats.p1.ft_btts || 0).toFixed(0)}%</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[8px] text-zinc-500 font-bold uppercase">Win %</div>
                                    <div className="text-[10px] font-black text-blue-400">{(stats.p1.winPct || 0).toFixed(0)}%</div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {data.player1_recent_dots.slice(0, 5).map((dot, i) => {
                                const parsed = parseDotsToMatches([dot], player1)[0];
                                if (!parsed) return null;

                                const { ftHome, ftAway, htHome, htAway } = parsed;
                                // Determine opponent name from tooltip for display
                                const parts = (dot.tooltip || "").split(/\s*-\s*|\s*[xX]\s*/);
                                const sideA = parts[0] || "???";
                                const sideB = parts[parts.length - 1] || "???";
                                const pNameNorm = player1.toLowerCase().trim();
                                const isPlayerA = sideA.toLowerCase().includes(pNameNorm) || pNameNorm.includes(sideA.toLowerCase());
                                // Opponent name logic: crude extraction
                                const rawOpp = isPlayerA ? sideB : sideA;
                                const oppName = rawOpp.replace(/\d+/g, '').trim() || "Oponente";

                                return (
                                    <div key={i} className="bg-black border border-zinc-900 rounded-xl p-2 hover:border-cyan-500 transition-all">
                                        <div className="flex items-center justify-between gap-3">
                                            {/* LEFT - Player */}
                                            <div className="text-left flex-1">
                                                <div className="text-xs font-black text-cyan-400 leading-tight">{player1.slice(0, 12)}</div>
                                                <div className="text-[9px] text-zinc-600 font-bold">{dot.date_time?.split(' ')[0]}</div>
                                            </div>

                                            {/* CENTER - Score */}
                                            <div className="text-center px-2">
                                                <div className="text-xl font-black mb-0.5 leading-none">
                                                    <span className={ftHome > ftAway ? 'text-cyan-400' : 'text-white'}>{ftHome}</span>
                                                    <span className="text-white"> x </span>
                                                    <span className={ftAway > ftHome ? 'text-emerald-400' : 'text-white'}>{ftAway}</span>
                                                </div>
                                                <div className="text-[9px] text-white font-bold">HT {htHome}-{htAway}</div>
                                            </div>

                                            {/* RIGHT - Opponent */}
                                            <div className="text-right flex-1">
                                                <div className="text-xs font-black text-zinc-500 leading-tight">{oppName.slice(0, 12)}</div>
                                                <div className={`w-1.5 h-1.5 rounded-full ml-auto mt-0.5 ${dot.color === 'p1' ? 'bg-emerald-500' : dot.color === 'p2' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* PLAYER 2 MATCHES */}
                    <div className="bg-[#0a0a0c] border-2 border-pink-500/20 rounded-2xl p-4 shadow-xl">
                        <div className="flex flex-col gap-3 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-3 bg-pink-500 rounded-full"></div>
                                <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Histórico: {player2}</div>
                            </div>

                            {/* STATS SUMMARY P2 */}
                            <div className="grid grid-cols-4 gap-2 bg-zinc-900/50 rounded-xl p-2 border border-zinc-800/50">
                                <div className="text-center">
                                    <div className="text-[8px] text-zinc-500 font-bold uppercase">Marcados</div>
                                    <div className="text-[10px] font-black text-pink-400">{(stats.p2.avgScoredHT || "0.0")} <span className="text-[8px] text-zinc-600">/</span> {(stats.p2.avgScored || "0.0")}</div>
                                </div>
                                <div className="text-center border-x border-zinc-800/50">
                                    <div className="text-[8px] text-zinc-500 font-bold uppercase">Sofridos</div>
                                    <div className="text-[10px] font-black text-rose-400">{(stats.p2.avgConcededHT || "0.0")} <span className="text-[8px] text-zinc-600">/</span> {(stats.p2.avgConceded || "0.0")}</div>
                                </div>
                                <div className="text-center pr-2 border-r border-zinc-800/50">
                                    <div className="text-[8px] text-zinc-500 font-bold uppercase">BTTS %</div>
                                    <div className="text-[10px] font-black text-emerald-400">{(stats.p2.ft_btts || 0).toFixed(0)}%</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[8px] text-zinc-500 font-bold uppercase">Win %</div>
                                    <div className="text-[10px] font-black text-rose-400">{(stats.p2.winPct || 0).toFixed(0)}%</div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {data.player2_recent_dots.slice(0, 5).map((dot, i) => {
                                const parsed = parseDotsToMatches([dot], player2)[0];
                                if (!parsed) return null;

                                const { ftHome, ftAway, htHome, htAway } = parsed;
                                const parts = (dot.tooltip || "").split(/\s*-\s*|\s*[xX]\s*/);
                                const sideA = parts[0] || "???";
                                const sideB = parts[parts.length - 1] || "???";
                                const pNameNorm = player2.toLowerCase().trim();
                                const isPlayerA = sideA.toLowerCase().includes(pNameNorm) || pNameNorm.includes(sideA.toLowerCase());
                                const rawOpp = isPlayerA ? sideB : sideA;
                                const oppName = rawOpp.replace(/\d+/g, '').trim() || "Oponente";

                                return (
                                    <div key={i} className="bg-black border border-zinc-900 rounded-xl p-2 hover:border-emerald-500 transition-all">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-left flex-1">
                                                <div className="text-xs font-black text-emerald-400 leading-tight">{player2.slice(0, 12)}</div>
                                                <div className="text-[9px] text-zinc-600 font-bold">{dot.date_time?.split(' ')[0]}</div>
                                            </div>

                                            <div className="text-center px-2">
                                                <div className="text-xl font-black mb-0.5 leading-none">
                                                    <span className={ftHome > ftAway ? 'text-emerald-400' : 'text-white'}>{ftHome}</span>
                                                    <span className="text-white"> x </span>
                                                    <span className={ftAway > ftHome ? 'text-cyan-400' : 'text-white'}>{ftAway}</span>
                                                </div>
                                                <div className="text-[9px] text-white font-bold">HT {htHome}-{htAway}</div>
                                            </div>

                                            <div className="text-right flex-1">
                                                <div className="text-xs font-black text-zinc-500 leading-tight">{oppName.slice(0, 12)}</div>
                                                <div className={`w-1.5 h-1.5 rounded-full ml-auto mt-0.5 ${dot.color === 'p1' ? 'bg-emerald-500' : dot.color === 'p2' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* H2H CONFRONTOS */}
                    <div className="bg-[#0a0a0c] border-2 border-zinc-800/80 rounded-2xl p-4 shadow-xl">
                        <div className="flex flex-col gap-3 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-3 bg-zinc-600 rounded-full"></div>
                                <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Confrontos Diretos</div>
                            </div>

                            {/* STATS SUMMARY H2H */}
                            <div className="grid grid-cols-4 gap-2 bg-zinc-900/50 rounded-xl p-2 border border-zinc-800/50">
                                <div className="text-center">
                                    <div className="text-[8px] text-zinc-500 font-bold uppercase whitespace-nowrap">Avg Goals HT/FT</div>
                                    <div className="text-[10px] font-black text-white">{stats.h2h.avgGoalsHT} <span className="text-[8px] text-zinc-600">/</span> {stats.h2h.avgGoals}</div>
                                </div>
                                <div className="text-center border-x border-zinc-800/50">
                                    <div className="text-[8px] text-zinc-500 font-bold uppercase">BTTS %</div>
                                    <div className="text-[10px] font-black text-emerald-400">{stats.h2h.ft_btts.toFixed(0)}%</div>
                                </div>
                                <div className="text-center col-span-2">
                                    <div className="text-[8px] text-zinc-500 font-bold uppercase">Win P1 / P2</div>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-[10px] font-black text-cyan-400">{stats.h2h.winPct.toFixed(0)}%</span>
                                        <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-cyan-500" style={{ width: `${stats.h2h.winPct}%` }}></div>
                                            <div className="h-full bg-pink-500" style={{ width: `${stats.h2h.lossPct}%` }}></div>
                                        </div>
                                        <span className="text-[10px] font-black text-pink-400">{stats.h2h.lossPct.toFixed(0)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {data.matches.slice(0, 5).map((m, i) => {
                                const p1IsHome = m.home_player.toLowerCase().includes(player1.toLowerCase());
                                const p1Name = p1IsHome ? m.home_player : m.away_player;
                                const p2Name = p1IsHome ? m.away_player : m.home_player;
                                const p1Score = p1IsHome ? m.home_score_ft : m.away_score_ft;
                                const p2Score = p1IsHome ? m.away_score_ft : m.home_score_ft;
                                const htP1 = p1IsHome ? m.home_score_ht : m.away_score_ht;
                                const htP2 = p1IsHome ? m.away_score_ht : m.home_score_ht;

                                return (
                                    <div key={i} className="bg-black border border-zinc-900 rounded-xl p-2 hover:border-zinc-700 transition-all">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-left flex-1">
                                                <div className={`text-xs font-black leading-tight ${p1Score > p2Score ? 'text-cyan-400' : 'text-zinc-500'}`}>{p1Name.slice(0, 10)}</div>
                                                <div className="text-[9px] text-zinc-600 font-semibold">{new Date(m.match_date).toLocaleDateString()}</div>
                                            </div>

                                            <div className="text-center px-2">
                                                <div className="text-xl font-black mb-0.5 leading-none">
                                                    <span className={p1Score > p2Score ? 'text-cyan-400' : p1Score < p2Score ? 'text-rose-400' : 'text-white'}>{p1Score}</span>
                                                    <span className="text-white"> x </span>
                                                    <span className={p2Score > p1Score ? 'text-emerald-400' : p2Score < p1Score ? 'text-rose-400' : 'text-white'}>{p2Score}</span>
                                                </div>
                                                <div className="text-[9px] text-white font-bold">HT {htP1}-{htP2}</div>
                                            </div>

                                            <div className="text-right flex-1">
                                                <div className={`text-xs font-black leading-tight ${p2Score > p1Score ? 'text-emerald-400' : 'text-zinc-500'}`}>{p2Name.slice(0, 10)}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </>)}
        </div>
    );
};