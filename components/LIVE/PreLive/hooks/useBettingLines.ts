
import { useState, useEffect } from 'react';
import { BettingLine } from '../types';
import { fetchBettingLines } from '../services/api';

export function useBettingLines(gameId: number) {
    const [lines, setLines] = useState<BettingLine[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const response = await fetchBettingLines(gameId);
                // Filter duplicated lines or process if needed
                // The API implementation might return many bookmakers. 
                // For now, let's just use what comes back, or filter by a specific bookmaker if it's too noisy
                // Usually bookmakerId 156 (Bet365?) or 161 are popular.
                // Let's filter for 156 if available, or just take the first reasonable set.
                
                if (response.lines) {
                    setLines(response.lines);
                }
            } catch (e) {
                console.error("Erro ao carregar odds:", e);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [gameId]);

    return { lines, loading };
}
