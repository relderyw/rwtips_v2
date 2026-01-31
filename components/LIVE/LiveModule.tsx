// LiveModule.tsx

import React, { useState, useEffect } from 'react';
import MatchCard from './components/MatchCard';
import MatchAnalysisModal from './components/MatchAnalysisModal';
import LoadingSpinner from './components/LoadingSpinner';
import FilterBar from './components/FilterBar';
import StrategyConfigModal from './components/StrategyConfigModal';
import { liveApi, LiveScore } from './services/liveApi';
import { calculateStrategies, StrategyConfig, defaultStrategyConfig } from './utils/liveStrategies';

// Pre-Live Imports
import MatchList from './PreLive/components/MatchList';
import AnalysisView from './PreLive/components/AnalysisView';
import DateHeader from './PreLive/components/DateHeader';
import { useFixtures } from './PreLive/hooks/useFixtures';

interface LiveModuleProps {
    onBack?: () => void;
    onLogout?: () => void;
}

const LiveModule: React.FC<LiveModuleProps> = ({ onBack, onLogout }) => {
    // Live State
    const [matches, setMatches] = useState<LiveScore[]>([]);
    const [activeTab, setActiveTab] = useState<'LIVE' | 'PRELIVE'>('LIVE');
    const [selectedMatch, setSelectedMatch] = useState<LiveScore | null>(null);
    const [matchData, setMatchData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMatch, setLoadingMatch] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Pre-Live State
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedPreLiveMatch, setSelectedPreLiveMatch] = useState<any>(null);
    const { data: preLiveData, loading: preLiveLoading, refresh: refreshPreLive } = useFixtures(selectedDate);

    // Filters
    const [selectedLeague, setSelectedLeague] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState('ALL');

    // Strategy Config
    const [showStrategyModal, setShowStrategyModal] = useState(false);
    const [strategyConfig, setStrategyConfig] = useState<StrategyConfig>(defaultStrategyConfig);

    useEffect(() => {
        const savedConfig = localStorage.getItem('strategyConfig');
        if (savedConfig) {
            try {
                setStrategyConfig(JSON.parse(savedConfig));
            } catch (e) {
                console.error("Failed to parse saved strategy config", e);
            }
        }
    }, []);

    const handleSaveConfig = (newConfig: StrategyConfig) => {
        setStrategyConfig(newConfig);
        localStorage.setItem('strategyConfig', JSON.stringify(newConfig));
    };

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

            const processedMatches = allMatches.map(match => {
                const finalId = match.id || (match.fixtureId ? parseInt(match.fixtureId) : 0);
                return {
                    ...match,
                    id: finalId,
                    calculatedHTLocal: null,
                    calculatedHTVisitor: null
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
        const interval = setInterval(fetchMatches, 30000);
        return () => clearInterval(interval);
    }, []);

    // LIVE Match Detail Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (selectedMatch?.id) {
            const fetchDetails = async () => {
                try {
                    const details = await liveApi.getFixtureDetails(selectedMatch.id);
                    setMatchData(details.data);
                } catch (err) {
                    console.error("Error updating match details:", err);
                }
            };
            interval = setInterval(fetchDetails, 20000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [selectedMatch?.id]);

    const handleMatchClick = async (match: LiveScore) => {
        setSelectedMatch(match);
        setLoadingMatch(true);
        try {
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

    // Filter Logic for LIVE
    const filteredMatches = matches.filter(match => {
        const leagueMatch = selectedLeague === 'ALL' || match.leagueName === selectedLeague;
        let statusMatch = true;

        if (selectedStatus === 'LIVE') {
            statusMatch = match.status === '1st' || match.status === '2nd' || match.status === 'HT';
        } else if (selectedStatus === 'FT') {
            statusMatch = match.status === 'FT';
        } else if (selectedStatus === 'NS') {
            statusMatch = match.status === 'NS';
        } else if (selectedStatus === 'OPPORTUNITY') {
            const stats = {
                time: match.minute || 0,
                homeScore: match.scoresLocalTeam || 0,
                awayScore: match.scoresVisitorTeam || 0,
                homeAttacks: match.localAttacksAttacks || 0,
                awayAttacks: match.visitorAttacksAttacks || 0,
                homeDangerousAttacks: match.localAttacksDangerousAttacks || 0,
                awayDangerousAttacks: match.visitorAttacksDangerousAttacks || 0,
                homeShootsOn: match.localShotsOnGoal || 0,
                awayShootsOn: match.visitorShotsOnGoal || 0,
                homeShootsOff: match.localShotsOffGoal || 0,
                awayShootsOff: match.visitorShotsOffGoal || 0,
                homeCorners: match.localCorners || 0,
                awayCorners: match.visitorCorners || 0,
                homeName: match.localTeamName,
                awayName: match.visitorTeamName
            };
            const strategies = calculateStrategies(stats, strategyConfig);
            statusMatch = strategies.length > 0;
        }
        return leagueMatch && statusMatch;
    });

    const uniqueLeagues = Array.from(new Set(matches.map(m => m.leagueName))).sort();

    // RENDER
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
                                {activeTab === 'LIVE' ? 'Monitoramento em Tempo Real' : 'Análise Pré-Jogo'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-zinc-900 rounded-xl p-1 border border-white/5">
                            <button
                                onClick={() => setActiveTab('LIVE')}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'LIVE'
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    : 'text-zinc-500 hover:text-white'
                                    }`}
                            >
                                Ao Vivo
                            </button>
                            <button
                                onClick={() => setActiveTab('PRELIVE')}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'PRELIVE'
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    : 'text-zinc-500 hover:text-white'
                                    }`}
                            >
                                Pré-Live
                            </button>
                        </div>

                        {activeTab === 'LIVE' && (
                            <button
                                onClick={() => setShowStrategyModal(true)}
                                className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-all text-xs font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 flex items-center gap-2"
                            >
                                <i className="fa-solid fa-crosshairs"></i>
                                <span className="hidden md:inline">Estratégias</span>
                            </button>
                        )}

                        {activeTab === 'PRELIVE' ? (
                            <DateHeader selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
                        ) : (
                            <button
                                onClick={() => fetchMatches()}
                                disabled={loading}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2"
                            >
                                <i className={`fa-solid fa-rotate ${loading ? 'animate-spin' : ''}`}></i>
                                <span className="hidden md:inline">Atualizar</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* CONTENT AREA */}
                {activeTab === 'LIVE' ? (
                    <>
                        <FilterBar
                            leagues={uniqueLeagues}
                            selectedLeague={selectedLeague}
                            onLeagueChange={setSelectedLeague}
                            selectedStatus={selectedStatus}
                            onStatusChange={setSelectedStatus}
                        />

                        {loading ? (
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

                        {/* Live Match Modal */}
                        {selectedMatch && (
                            <MatchAnalysisModal
                                isOpen={!!selectedMatch}
                                onClose={handleCloseModal}
                                match={selectedMatch}
                                matchData={matchData}
                                loading={loadingMatch}
                                strategyConfig={strategyConfig}
                            />
                        )}
                    </>
                ) : (
                    // PRE-LIVE TAB CONTENT
                    selectedPreLiveMatch ? (
                        <AnalysisView match={selectedPreLiveMatch} onBack={() => setSelectedPreLiveMatch(null)} />
                    ) : (
                        <MatchList
                            data={preLiveData}
                            activeView="PRE_LIVE"
                            onMatchClick={setSelectedPreLiveMatch}
                            loading={preLiveLoading}
                        />
                    )
                )}

                <StrategyConfigModal
                    isOpen={showStrategyModal}
                    onClose={() => setShowStrategyModal(false)}
                    currentConfig={strategyConfig}
                    onSave={handleSaveConfig}
                />

            </div>
        </div>
    );
};

export default LiveModule;