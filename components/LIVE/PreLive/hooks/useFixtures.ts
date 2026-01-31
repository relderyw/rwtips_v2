
import { useState, useEffect, useCallback } from 'react';
import { ApiResponse } from '../types';
import { fetchFixtures } from '../services/api';

export function useFixtures(selectedDate: Date) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDateForApi = (date: Date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = formatDateForApi(selectedDate);
      const response = await fetchFixtures(dateStr);
      setData(response);
    } catch (err: any) {
      setError('Erro ao carregar dados do servidor.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, refresh: loadData };
}
