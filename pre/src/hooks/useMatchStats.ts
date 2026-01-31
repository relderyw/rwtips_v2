
import { useState, useEffect, useMemo } from 'react';
import { PreGameStat } from '../types';
import { fetchPreGameStats } from '../services/api';

export function useMatchStats(gameId: number) {
  const [stats, setStats] = useState<PreGameStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
        setLoading(true);
        try {
            const s = await fetchPreGameStats(gameId);
            setStats(s.statistics || []);
        } catch (e) {
            console.error("Erro ao carregar inteligência:", e);
        } finally {
            setLoading(false);
        }
    }
    loadData();
  }, [gameId]);

  return { stats, loading };
}
