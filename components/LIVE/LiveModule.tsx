
import React, { useState, useEffect } from 'react';
import MatchCard from './components/MatchCard';
import MatchAnalysisModal from './components/MatchAnalysisModal';
import LoadingSpinner from './components/LoadingSpinner';
import FilterBar from './components/FilterBar';
import { liveApi, LiveScore } from './services/liveApi';

interface LiveModuleProps {
    onBack?: () => void;
    onLogout?: () => void;
}

const LiveModule: React.FC<LiveModuleProps> = ({ onBack, onLogout }) => {
    const [matches, setMatches] = useState<LiveScore[]>([]);
    const [selectedMatch, setSelectedMatch] = useState<LiveScore | null>(null);
    const [matchData, setMatchData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMatch, setLoadingMatch] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [selectedLeague, setSelectedLeague] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState('ALL');

    const fetchMatches = async () => {
        try {
            setLoading(true);
            const data = await liveApi.getLiveScores();

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

            // LOG FOR DEBUGGING
            if (allMatches.length > 0) {
                console.log("DEBUG: Sample Match Data:", allMatches[0]);
                console.log("DEBUG: Sample Match ID:", allMatches[0].id);
            }

            // Process matches to calculate HT scores
            // Process matches to calculate HT scores
            const processedMatches = allMatches.map(match => {
                let htScoreLocal = null;
                let htScoreVisitor = null;
                // ... logic ...

                // Ensure ID is set (mapped from fixtureId if id is missing)
                const finalId = match.id || (match.fixtureId ? parseInt(match.fixtureId) : 0);

                return {
                    ...match,
                    id: finalId, // Override/Ensure ID is set
                    calculatedHTLocal: htScoreLocal,
                    calculatedHTVisitor: htScoreVisitor
                };
            });

            setMatches(processedMatches);
            setLoading(false);
        } catch (err: any) {
            console.error("Error loading matches:", err);
            setError(err.message || "Failed to load matches");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches();
        const interval = setInterval(fetchMatches, 30000); // Poll list every 30s
        return () => clearInterval(interval);
    }, []);

    // Poll for selected match details
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (selectedMatch?.id) {
            const fetchDetails = async () => {
                try {
                    // Don't set loadingMatch to true here to avoid UI flicker
                    const details = await liveApi.getFixtureDetails(selectedMatch.id);
                    setMatchData(details.data);
                } catch (err) {
                    console.error("Error updating match details:", err);
                }
            };

            // Initial fetch is already handled by handleMatchClick, but we set interval for updates
            interval = setInterval(fetchDetails, 20000); // Poll details every 20s
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [selectedMatch?.id]);


    const handleMatchClick = async (match: LiveScore) => {
        console.log("DEBUG: Clicked match:", match);
        console.log("DEBUG: Match ID:", match.id);

        setSelectedMatch(match);
        setLoadingMatch(true);
        try {
            if (!match.id) {
                console.error("ERROR: Match ID is undefined!");
                return;
            }
            const details = await liveApi.getFixtureDetails(match.id);
            setMatchData(details.data);
        } catch (err) {
            console.error("Error loading match details:", err);
        } finally {
            setLoadingMatch(false);
        }
    };

    const handleCloseModal = () => {
        setSelectedMatch(null);
        setMatchData(null);
    };

    // Filter Logic
    const filteredMatches = matches.filter(match => {
        const leagueMatch = selectedLeague === 'ALL' || match.leagueName === selectedLeague;
        let statusMatch = true;

        if (selectedStatus === 'LIVE') {
            statusMatch = match.status === '1st' || match.status === '2nd' || match.status === 'HT';
        } else if (selectedStatus === 'FINISHED') {
            statusMatch = match.status === 'FT';
        } else if (selectedStatus === 'SCHEDULED') {
            statusMatch = match.status === 'NS';
        }

        return leagueMatch && statusMatch;
    });

    const uniqueLeagues = Array.from(new Set(matches.map(m => m.leagueName))).sort();

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white"
                            >
                                <i className="fa-solid fa-arrow-left"></i>
                            </button>
                        )}
                        <div>
                            <h1 className="text-2xl font-black italic tracking-tighter">
                                LIVE <span className="text-emerald-500">FOOTBALL</span>
                            </h1>
                            <p className="text-xs text-white/40 font-bold tracking-widest uppercase mt-1">
                                Monitoramento em Tempo Real
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => fetchMatches()}
                            disabled={loading}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2"
                        >
                            <i className={`fa-solid fa-rotate ${loading ? 'animate-spin' : ''}`}></i>
                            Atualizar
                        </button>

                        {onLogout && (
                            <button
                                onClick={onLogout}
                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all text-xs font-black uppercase tracking-widest text-red-400 hover:text-red-300 flex items-center gap-2"
                            >
                                <i className="fa-solid fa-power-off"></i>
                                Sair
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Bar */}
                <FilterBar
                    leagues={uniqueLeagues}
                    selectedLeague={selectedLeague}
                    onLeagueChange={setSelectedLeague}
                    selectedStatus={selectedStatus}
                    onStatusChange={setSelectedStatus}
                />

                {/* Content */}
                {loading && matches.length === 0 ? (
                    <LoadingSpinner />
                ) : error ? (
                    <div className="text-center py-20 text-red-400 font-bold">{error}</div>
                ) : filteredMatches.length === 0 ? (
                    <div className="text-center py-20 text-white/30 font-bold uppercase tracking-widest">
                        Nenhum jogo encontrado
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredMatches.map(match => (
                            <MatchCard
                                key={match.id}
                                match={match}
                                onClick={handleMatchClick}
                            />
                        ))}
                    </div>
                )}

                {/* Modal */}
                {selectedMatch && (
                    <MatchAnalysisModal
                        isOpen={!!selectedMatch}
                        onClose={handleCloseModal}
                        match={selectedMatch}
                        matchData={matchData}
                        loading={loadingMatch}
                    />
                )}

            </div>
        </div>
    );
};

export default LiveModule;
