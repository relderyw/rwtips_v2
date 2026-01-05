
import React, { useState, useEffect, useCallback } from 'react';
// Sidebar removed
import GameCard from './components/GameCard';
import AnalysisModal from './components/AnalysisModal';
import { nbaDataService } from './services/nbaDataService';
import { GameEvent } from './types';
import { Calendar, RefreshCw, AlertCircle, TrendingUp } from 'lucide-react';

const NBADashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [games, setGames] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameEvent | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const dates = await nbaDataService.getAvailableDates();
        setAvailableDates(dates);
        if (dates.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const closestDate = dates.find(d => d >= today) || dates[0];
          setSelectedDate(closestDate);
        }
      } catch (err) {
        setError('Falha ao conectar aos servidores de dados da NBA.');
      }
    }
    init();
  }, []);

  const fetchGames = useCallback(async () => {
    if (!selectedDate) return;
    setLoading(true);
    setError(null);
    try {
      let data: GameEvent[];
      if (activeTab === 'upcoming' || activeTab === 'live') {
        data = await nbaDataService.getScheduleForDate(selectedDate);
        if (activeTab === 'live') {
          data = data.filter(g => g.status.includes('Progress'));
        }
      } else if (activeTab === 'history') {
        data = await nbaDataService.getFinishedGames(selectedDate);
      } else {
        data = await nbaDataService.getScheduleForDate(selectedDate);
      }
      setGames(data);
    } catch (err) {
      setError('Erro ao carregar dados dos jogos.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, activeTab]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return (
    <div className="w-full flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Sidebar removed */}

      <main className="flex-1 p-4 md:p-6">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 max-w-7xl mx-auto">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <h1 className="text-3xl md:text-4xl font-oxanium font-bold text-white tracking-tighter uppercase">
                NBA <span className="text-emerald-500">Analytics</span>
              </h1>
            </div>
            <p className="text-zinc-500 font-medium tracking-tight">
              Estatísticas avançadas e projeções profissionais para traders esportivos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 w-4 h-4 pointer-events-none" />
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-zinc-950 border border-zinc-900 text-white pl-10 pr-12 py-4 rounded-2xl focus:border-emerald-500 outline-none appearance-none font-bold text-xs tracking-widest cursor-pointer hover:bg-zinc-900 transition-colors uppercase"
              >
                {availableDates.map(date => (
                  <option key={date} value={date}>
                    {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchGames}
              className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl hover:bg-zinc-900 text-zinc-500 hover:text-emerald-500 transition-all shadow-xl active:scale-95"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          {error ? (
            <div className="bg-red-500/5 border border-red-500/20 p-12 rounded-3xl text-center max-w-2xl mx-auto backdrop-blur-sm">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-tighter">Sistema Indisponível</h3>
              <p className="text-zinc-500 mb-8">{error}</p>
              <button onClick={fetchGames} className="px-10 py-4 bg-white text-black font-black rounded-2xl hover:bg-zinc-200 transition-all uppercase text-xs tracking-widest">
                Tentar Reconexão
              </button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-zinc-950 border border-zinc-900 rounded-3xl h-80 animate-pulse"></div>
              ))}
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-40 bg-zinc-950/20 rounded-3xl border border-zinc-900 border-dashed">
              <p className="text-zinc-600 text-lg font-medium italic">Nenhum evento esportivo encontrado nesta data.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {games.map(game => (
                <div key={game.eventId} className="animate-fade-in" style={{ animationDelay: '50ms' }}>
                  <GameCard
                    game={game}
                    onAnalyze={setSelectedGame}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedGame && (
        <AnalysisModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </div>
  );
};

export { NBADashboard };
