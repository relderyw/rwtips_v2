
import React, { useState, useEffect } from 'react';
import Header from './components/Layout/Header';
import MatchList from './components/Match/MatchList';
import AnalysisView from './components/Analysis/AnalysisView';
import { useFixtures } from './hooks/useFixtures';
import { Game, ViewType } from './types';

const App: React.FC = () => {
    const [activeView, setActiveView] = useState<ViewType>('PRE_LIVE');
    const [selectedMatch, setSelectedMatch] = useState<Game | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        const devParam = params.get('devMode');
        const devEnabled = devParam === 'rw_admin_2026';

        if (devEnabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
                (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
            ) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('contextmenu', handleContextMenu, true);

        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('contextmenu', handleContextMenu, true);
        };
    }, []);

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
