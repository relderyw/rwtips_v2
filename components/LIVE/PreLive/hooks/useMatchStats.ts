
import { useState, useEffect, useMemo } from 'react';
import { fetchMatchHistory, fetchPreGameStats } from '../services/api';
import { calculateDetailedStatistics, calculateComparisonMetrics, DetailedStatistics, ComparisonMetrics } from '../services/statistics';

export function useMatchStats(
    homeTeamId: number, 
    awayTeamId: number, 
    tournamentId: number,
    statisticType: string = 'goals',
    timePeriod: string = 'fullTime',
    numberOfMatches: number = 10
) {
  const [homeHistory, setHomeHistory] = useState<any[]>([]);
  const [awayHistory, setAwayHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
        setLoading(true);
        try {
            const [home, away] = await Promise.all([
                fetchMatchHistory(homeTeamId, tournamentId, numberOfMatches, statisticType, timePeriod),
                fetchMatchHistory(awayTeamId, tournamentId, numberOfMatches, statisticType, timePeriod)
            ]);
            setHomeHistory(home.data || []);
            setAwayHistory(away.data || []);
        } catch (e) {
            console.error("Erro ao carregar histórico:", e);
        } finally {
            setLoading(false);
        }
    }
    loadData();
  }, [homeTeamId, awayTeamId, tournamentId, statisticType, timePeriod, numberOfMatches]);

  const getStats = (type: string, period: string, comparison: string, value: number) => {
    const home = calculateDetailedStatistics(homeHistory, String(homeTeamId), type, period, comparison, value);
    const away = calculateDetailedStatistics(awayHistory, String(awayTeamId), type, period, comparison, value);
    return { home, away };
  };

  const comparisonMetrics = useMemo(() => {
    if (loading || !homeHistory.length) return null;
    return calculateComparisonMetrics(homeHistory, awayHistory, String(homeTeamId), String(awayTeamId));
  }, [homeHistory, awayHistory, homeTeamId, awayTeamId, loading]);

  return { homeHistory, awayHistory, getStats, comparisonMetrics, loading };
}
