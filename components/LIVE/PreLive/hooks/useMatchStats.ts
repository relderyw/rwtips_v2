
import { useState, useEffect, useMemo } from 'react';
import { fetchMatchHistory, fetchPerformanceHistory } from '../services/api';
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

  // Performance data (for ComparisonTable metrics - has all stats in one call)
  const [perfHome, setPerfHome] = useState<any[]>([]);
  const [perfAway, setPerfAway] = useState<any[]>([]);
  const [perfLoading, setPerfLoading] = useState(true);

  // Fetch event-statistics data (for Assertividade + Histórico tabs)
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

  // Fetch performance data (for Métricas tab - returns all stats: corners, cards, shots, fouls, etc.)
  useEffect(() => {
    async function loadPerformance() {
        setPerfLoading(true);
        try {
            const [home, away] = await Promise.all([
                fetchPerformanceHistory(homeTeamId, numberOfMatches, timePeriod),
                fetchPerformanceHistory(awayTeamId, numberOfMatches, timePeriod)
            ]);
            setPerfHome(home.data || []);
            setPerfAway(away.data || []);
        } catch (e) {
            console.error("Erro ao carregar performance:", e);
        } finally {
            setPerfLoading(false);
        }
    }
    loadPerformance();
  }, [homeTeamId, awayTeamId, timePeriod, numberOfMatches]);

  const getStats = (type: string, period: string, comparison: string, value: number) => {
    const home = calculateDetailedStatistics(homeHistory, String(homeTeamId), type, period, comparison, value);
    const away = calculateDetailedStatistics(awayHistory, String(awayTeamId), type, period, comparison, value);
    return { home, away };
  };

  // Use performance data for comparison metrics (has all stats)
  const comparisonMetrics = useMemo(() => {
    if (perfLoading || !perfHome.length) return null;
    return calculateComparisonMetrics(perfHome, perfAway, String(homeTeamId), String(awayTeamId));
  }, [perfHome, perfAway, homeTeamId, awayTeamId, perfLoading]);

  return { homeHistory, awayHistory, getStats, comparisonMetrics, loading };
}
