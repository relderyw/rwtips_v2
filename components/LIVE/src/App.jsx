import React, { useState, useEffect, useMemo } from 'react';
import MatchCard from './components/MatchCard';
import MatchAnalysisModal from './components/MatchAnalysisModal';
import LoadingSpinner from './components/LoadingSpinner';
import FilterBar from './components/FilterBar';
import { api } from './services/api';

function App() {
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [error, setError] = useState(null);

  // Filtros
  const [selectedLeague, setSelectedLeague] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const devParam = params.get('devMode');
    const devEnabled = devParam === 'rw_admin_2026';

    if (devEnabled) return;

    const handleKeyDown = (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, []);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const data = await api.getLiveScores();

        // Processar os jogos por liga
        const allMatches = [];
        if (data.data?.sortedCategorizedFixtures) {
          data.data.sortedCategorizedFixtures.forEach(league => {
            if (league.fixtures) {
              league.fixtures.forEach(fixture => {
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

        // Process matches and calculate HT scores from timeline if available
        const processedMatches = allMatches.map(match => {
          // Try to calculate HT score from timeline/events if available
          let htScoreLocal = null;
          let htScoreVisitor = null;

          // Check if match has timeline or events data
          if (match.timeline || match.events) {
            const events = match.timeline || match.events;
            let eventsArray = [];

            // Parse events if it's a JSON string
            if (typeof events === 'string') {
              try {
                eventsArray = JSON.parse(events);
              } catch (e) {
                // If parsing fails, events might be in a different format
              }
            } else if (Array.isArray(events)) {
              eventsArray = events;
            }

            // Find the last goal scored in first half (minute <= 45)
            if (Array.isArray(eventsArray)) {
              const firstHalfGoals = eventsArray.filter(event => {
                const minute = parseInt(event.minute || event.min || 0);
                const isGoal = event.type === 'goal' || event.type_id === 14 || event.event === 'goal';
                return isGoal && minute > 0 && minute <= 45;
              });

              // Get the score from the last first-half goal
              if (firstHalfGoals.length > 0) {
                const lastHTGoal = firstHalfGoals[firstHalfGoals.length - 1];
                // Try to extract score from result field (e.g., "0-1", "1-1", etc.)
                const scoreMatch = (lastHTGoal.result || lastHTGoal.score || '').match(/(\d+)-(\d+)/);
                if (scoreMatch) {
                  htScoreLocal = parseInt(scoreMatch[1]);
                  htScoreVisitor = parseInt(scoreMatch[2]);
                }
              }
            }
          }

          // Add calculated HT scores to match object
          return {
            ...match,
            calculatedHTLocal: htScoreLocal,
            calculatedHTVisitor: htScoreVisitor
          };
        });

        setMatches(processedMatches);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchMatches();

    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update selectedMatch when matches array updates (for live data in modal)
  useEffect(() => {
    if (selectedMatch) {
      const updatedMatch = matches.find(m => m.fixtureId === selectedMatch.fixtureId);
      if (updatedMatch) {
        setSelectedMatch(updatedMatch);
      }
    }
  }, [matches, selectedMatch?.fixtureId]);

  // Extrair ligas únicas para o filtro
  const leagues = useMemo(() => {
    const uniqueLeagues = [...new Set(matches.map(m => m.leagueName))].sort();
    return uniqueLeagues;
  }, [matches]);

  // Filtrar jogos
  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      // Filtro de Liga
      if (selectedLeague !== 'ALL' && match.leagueName !== selectedLeague) {
        return false;
      }

      // Filtro de Status
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'LIVE') {
          // Simplificação: status não é FT nem NS
          return match.status !== 'FT' && match.status !== 'NS';
        }
        return match.status === selectedStatus;
      }

      return true;
    });
  }, [matches, selectedLeague, selectedStatus]);

  // Agrupar jogos por liga para exibição
  const groupedMatches = useMemo(() => {
    if (selectedLeague !== 'ALL') {
      return { [selectedLeague]: filteredMatches };
    }

    const groups = {};
    filteredMatches.forEach(match => {
      if (!groups[match.leagueName]) {
        groups[match.leagueName] = [];
      }
      groups[match.leagueName].push(match);
    });

    // Sort leagues alphabetically
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {});
  }, [filteredMatches, selectedLeague]);

  // Buscar dados detalhados da partida
  const fetchMatchDetails = async (fixtureId) => {
    try {
      setLoadingMatch(true);
      const data = await api.getFixtureDetails(fixtureId);
      setMatchData(data.data);
      setLoadingMatch(false);
    } catch (err) {
      console.error('Erro ao carregar partida:', err);
      setLoadingMatch(false);
    }
  };

  const handleMatchClick = (match) => {
    setSelectedMatch(match);
    fetchMatchDetails(match.fixtureId);
  };

  const closeModal = () => {
    setSelectedMatch(null);
    setMatchData(null);
  };

  if (loading && matches.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <LoadingSpinner text="Carregando jogos..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-8 max-w-md backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Erro ao Carregar</h2>
          <p className="text-zinc-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-all shadow-lg shadow-red-500/20"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-4 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center animate-fade-in">
          <img
            src="https://i.ibb.co/G4Y8sHMk/Chat-GPT-Image-21-de-abr-de-2025-16-14-34-1.png"
            alt="Logo"
            className="h-20 mb-2 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          />
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
          {Object.entries(groupedMatches).map(([leagueName, leagueMatches]) => (
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

export default App;
