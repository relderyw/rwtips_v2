
import React, { useState } from 'react';
import { UpcomingMatches } from './components/upcoming-matches';
import { MatchAnalysis } from './components/match-analysis';
import { Trophy, Info } from 'lucide-react';

interface SelectedMatch {
    matchId: string;
    homeTeamId: string;
    awayTeamId: string;
    tournamentId: string;
}

const FUTDashboard: React.FC = () => {
    const [selectedMatch, setSelectedMatch] = useState<SelectedMatch | null>(null);

    const handleSelectMatch = (matchData: SelectedMatch) => {
        setSelectedMatch(matchData);
    };

    const handleBackToList = () => {
        setSelectedMatch(null);
    };

    return (
        <div className="w-full flex flex-col selection:bg-blue-500 selection:text-white">
            <main className="flex-1 p-4 md:p-6">
                <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 max-w-7xl mx-auto">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <Trophy className="w-5 h-5 text-blue-500" />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black italic text-white tracking-tighter uppercase">
                                FUTEBOL <span className="text-blue-500">ANALYSIS</span>
                            </h1>
                        </div>
                        <p className="text-zinc-500 font-medium tracking-tight">
                            {selectedMatch
                                ? "Análise detalhada do confronto selecionado."
                                : "Análise estratégica e probabilística para as principais ligas de futebol do mundo."}
                        </p>
                    </div>

                    <div className="hidden lg:flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl backdrop-blur-3xl shadow-2xl">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Data Source</span>
                            <span className="text-xs font-bold text-white/60">Statshub Global API</span>
                        </div>
                        <div className="w-px h-8 bg-white/10 mx-2"></div>
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Info className="w-5 h-5 text-blue-500" />
                        </div>
                    </div>
                </header>

                <div className="max-w-7xl mx-auto w-full">
                    {selectedMatch ? (
                        <MatchAnalysis
                            matchId={selectedMatch.matchId}
                            homeTeamId={selectedMatch.homeTeamId}
                            awayTeamId={selectedMatch.awayTeamId}
                            tournamentId={selectedMatch.tournamentId}
                            onBack={handleBackToList}
                        />
                    ) : (
                        <UpcomingMatches onSelectMatch={handleSelectMatch} />
                    )}
                </div>
            </main>
        </div>
    );
};

export default FUTDashboard;
