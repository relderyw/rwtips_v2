
import React, { useState } from 'react';
import Header from './components/Layout/Header';
import MatchList from './components/Match/MatchList';
import AnalysisView from './components/Analysis/AnalysisView';
import { useFixtures } from './hooks/useFixtures';
import { Game, ViewType } from './types';

const App: React.FC = () => {
    const [activeView, setActiveView] = useState<ViewType>('PRE_LIVE');
    const [selectedMatch, setSelectedMatch] = useState<Game | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const { data, loading, refresh } = useFixtures(selectedDate);

    return (
        <div className="min-h-screen bg-background text-slate-200 selection:bg-primary/20">
            <Header
                activeView={activeView}
                setActiveView={(view) => {
                    setActiveView(view);
                    setSelectedMatch(null);
                }}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                onRefresh={refresh}
            />

            <main className="max-w-[1200px] mx-auto mt-8 px-4 pb-20">
                {selectedMatch ? (
                    <AnalysisView match={selectedMatch} onBack={() => setSelectedMatch(null)} />
                ) : (
                    <MatchList
                        data={data}
                        activeView={activeView}
                        onMatchClick={setSelectedMatch}
                        loading={loading}
                    />
                )}
            </main>
        </div>
    );
};

export default App;
