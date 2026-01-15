import React, { useState, useEffect, useMemo } from 'react';
import MatchCard from './LIVE/components/MatchCard';
import MatchAnalysisModal from './LIVE/components/MatchAnalysisModal';
import LoadingSpinner from './LIVE/components/LoadingSpinner';
import FilterBar from './LIVE/components/FilterBar';
import { liveApi, LiveScore } from '../services/liveApi';

interface LiveModuleProps {
    onBack: () => void;
    onLogout: () => void;
}

const LiveModule: React.FC<LiveModuleProps> = ({ onBack, onLogout }) => {
    const [matches, setMatches] = useState<LiveScore[]>([]);
    const [selectedMatch, setSelectedMatch] = useState<LiveScore | null>(null);
    const [matchData, setMatchData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMatch, setLoadingMatch] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filtros
    const [selectedLeague, setSelectedLeague] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState('ALL');

    // Buscar lista de jogos
    useEffect(() => {
        const fetchMatches = async () => {
            try {
                // setLoading(true); // Don't trigger full loading on refresh
                const data = await liveApi.getLiveScores();

                // Processar os jogos por liga
                const allMatches: LiveScore[] = [];
                if (data.data?.sortedCategorizedFixtures) {
                    data.data.sortedCategorizedFixtures.forEach((league: any) => {
                        if (league.fixtures) {
                            league.fixtures.forEach((fixture: any) => {
                                allMatches.push({
                                    ...fixture,
                                    leagueName: league.leagueName,
                                    countryName: league.countryName,
                                    countryImagePath: league.countryImagePath
                                });
                            });
                        }
                    });
                }

                // Process matches and calculate HT scores (logic ported from App.jsx)
                const processedMatches = allMatches.map(match => {
                    let htScoreLocal = null;
                    let htScoreVisitor = null;

                    if (match.timeline || match.events) {
                        // Simplified processing for typescript port
                        // In full impl, copying the regex logic from App.jsx is ideal
                    }

                    // For now returning as is, adding placeholders
                    return {
                        ...match,
                        calculatedHTLocal: htScoreLocal,
                        calculatedHTVisitor: htScoreVisitor
                    };
                });

                setMatches(processedMatches);
                setError(null);
            } catch (err) {
                if (err instanceof Error) setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMatches();

        const interval = setInterval(fetchMatches, 30000);
        return () => clearInterval(interval);
    }, []);

    // Update selectedMatch when matches array updates
    useEffect(() => {
        if (selectedMatch) {
            const updatedMatch = matches.find(m => m.fixtureId === selectedMatch.fixtureId);
            if (updatedMatch) {
                setSelectedMatch(updatedMatch);
            }
        }
    }, [matches, selectedMatch]);

    const leagues = useMemo(() => {
        const uniqueLeagues = [...new Set(matches.map(m => m.leagueName))].sort();
        return uniqueLeagues;
    }, [matches]);

    const filteredMatches = useMemo(() => {
        return matches.filter(match => {
            if (selectedLeague !== 'ALL' && match.leagueName !== selectedLeague) return false;
            if (selectedStatus !== 'ALL') {
                if (selectedStatus === 'LIVE') return match.status !== 'FT' && match.status !== 'NS';
                return match.status === selectedStatus;
            }
            return true;
        });
    }, [matches, selectedLeague, selectedStatus]);

    const groupedMatches = useMemo(() => {
        const groups: Record<string, LiveScore[]> = {};
        if (selectedLeague !== 'ALL') {
            return { [selectedLeague]: filteredMatches };
        }
        filteredMatches.forEach(match => {
            if (!groups[match.leagueName]) groups[match.leagueName] = [];
            groups[match.leagueName].push(match);
        });
        // Sort keys
        return Object.keys(groups).sort().reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {} as Record<string, LiveScore[]>);
    }, [filteredMatches, selectedLeague]);

    const fetchMatchDetails = async (fixtureId: number) => {
        try {
            setLoadingMatch(true);
            const data = await liveApi.getFixtureDetails(fixtureId);
            setMatchData(data);
        } catch (err) {
            console.error('Erro ao carregar partida:', err);
        } finally {
            setLoadingMatch(false);
        }
    };

    const handleMatchClick = (match: LiveScore) => {
        setSelectedMatch(match);
        fetchMatchDetails(match.fixtureId);
    };

    const closeModal = () => {
        setSelectedMatch(null);
        setMatchData(null);
    };

    return (
        <div className="min-h-screen text-white p-4 md:p-6 pb-20">
            <div className="max-w-7xl mx-auto">
                {/* Header with Navigation */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 backdrop-blur-md">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <h1 className="text-2xl font-black italic tracking-tighter text-white">
                            LIVE <span className="text-emerald-500">SCORES</span>
                        </h1>
                        <div className="px-3 py-1 bg-zinc-800 rounded-full border border-zinc-700">
                            <span className="text-xs font-mono text-emerald-400 font-bold">{matches.length} JOGOS</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <button
                            onClick={onBack}
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group"
                        >
                            <span className="group-hover:-translate-x-1 transition-transform">←</span>
                            Módulos
                        </button>
                        <button
                            onClick={onLogout}
                            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-500 transition-all flex items-center gap-2"
                        >
                            Sair
                            <span>✕</span>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                {(() => {
                    if (loading && matches.length === 0) {
                        return (
                            <div className="flex items-center justify-center py-20">
                                <LoadingSpinner text="Carregando jogos..." />
                            </div>
                        );
                    }

                    if (error && matches.length === 0) {
                        return (
                            <div className="flex items-center justify-center py-20">
                                <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-8 max-w-md backdrop-blur-sm">
                                    <h2 className="text-2xl font-bold text-red-400 mb-4">Erro ao Carregar</h2>
                                    <p className="text-zinc-400">{error}</p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <>
                            {/* Header Stats */}
                            <div className="mb-6 flex flex-col items-center animate-fade-in">
                                <p className="text-center text-zinc-500 text-sm font-medium tracking-wide">
                                    {matches.length} jogos monitorados em tempo real
                                </p>
                            </div>

                            {/* Filtros */}
                            <FilterBar
                                leagues={leagues}
                                selectedLeague={selectedLeague}
                                onLeagueChange={setSelectedLeague}
                                selectedStatus={selectedStatus}
                                onStatusChange={setSelectedStatus}
                            />

                            {/* Lista de Jogos Agrupada */}
                            <div className="space-y-8">
                                {Object.entries(groupedMatches).map(([leagueName, leagueMatches]: [string, LiveScore[]]) => (
                                    <div key={leagueName} className="animate-slide-up">
                                        {/* League Header */}
                                        <div className="flex items-center gap-3 mb-4 px-2">
                                            <div className="h-4 w-1 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                                            <div className="flex items-center gap-2">
                                                {leagueMatches[0]?.countryImagePath && (
                                                    <img
                                                        src={leagueMatches[0].countryImagePath}
                                                        alt={leagueMatches[0].countryName}
                                                        className="h-5 w-auto object-contain opacity-80"
                                                    />
                                                )}
                                                <h2 className="text-lg font-bold text-zinc-100 tracking-wide uppercase">
                                                    {leagueName}
                                                </h2>
                                            </div>
                                            <div className="text-xs font-mono text-zinc-500 bg-zinc-900/50 px-2 py-0.5 rounded border border-zinc-800">
                                                {leagueMatches.length}
                                            </div>
                                        </div>

                                        {/* Grid de Jogos */}
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {leagueMatches.map((match) => (
                                                <MatchCard
                                                    key={match.fixtureId}
                                                    match={match}
                                                    onClick={handleMatchClick}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {filteredMatches.length === 0 && (
                                <div className="text-center py-24 bg-zinc-900/30 rounded-3xl border border-zinc-800/50 border-dashed backdrop-blur-sm">
                                    <div className="text-6xl mb-4 opacity-50">🔍</div>
                                    <p className="text-2xl font-bold text-zinc-400 mb-2">Nenhum jogo encontrado</p>
                                    <p className="text-zinc-600">Tente ajustar seus filtros de busca</p>
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>

            {/* Modal de Análise */}
            {selectedMatch && (
                <MatchAnalysisModal
                    match={selectedMatch}
                    matchData={matchData}
                    loading={loadingMatch}
                    onClose={closeModal}
                />
            )}
        </div>
    );
}

export default LiveModule;
