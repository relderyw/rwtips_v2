import { HistoryMatch } from '../types';
import { normalize, calculateIndicators, calculateMomentum } from './analyzer';

export interface H2HMarket {
    id: string;
    label: string;
    check: (m: HistoryMatch, playerA: string, playerB: string) => boolean;
}

export interface H2HResult {
    id: string;
    label: string;
    wins: number;
    losses: number;
    totalBets: number;
    profit: number;
    roi: number;
    units: number;
    winRate: number;
    momentum: 'heating' | 'cooling' | 'stable';
    hits: number[];
}

export const H2H_MARKETS: H2HMarket[] = [
    { id: 'h2h_ht_over05', label: 'HT Over 0.5', check: (m) => (m.halftime_score_home + m.halftime_score_away) > 0.5 },
    { id: 'h2h_ht_over15', label: 'HT Over 1.5', check: (m) => (m.halftime_score_home + m.halftime_score_away) > 1.5 },
    { id: 'h2h_ft_over15', label: 'FT Over 1.5', check: (m) => (m.score_home + m.score_away) > 1.5 },
    { id: 'h2h_ft_over25', label: 'FT Over 2.5', check: (m) => (m.score_home + m.score_away) > 2.5 },
    { id: 'h2h_ft_btts', label: 'Ambas Marcam (FT)', check: (m) => m.score_home > 0 && m.score_away > 0 },
    { 
        id: 'h2h_win_p1', 
        label: 'Vitória P1', 
        check: (m, p1) => {
            const isHome = normalize(m.home_player) === normalize(p1);
            return isHome ? m.score_home > m.score_away : m.score_away > m.score_home;
        } 
    },
];

export const runH2HAnalysis = (
    history: HistoryMatch[],
    playerA: string,
    playerB: string,
    sampleSize: number,
    odd: number,
    unit: number
) => {
    const p1 = playerA.trim().toLowerCase();
    const p2 = playerB.trim().toLowerCase();

    const matches = history.filter(m => {
        const h = m.home_player.trim().toLowerCase();
        const a = m.away_player.trim().toLowerCase();
        return (h === p1 && a === p2) || (h === p2 && a === p1);
    }).sort((a, b) => new Date(b.data_realizacao).getTime() - new Date(a.data_realizacao).getTime())
      .slice(0, sampleSize);

    if (matches.length === 0) return { results: [], totalGames: 0 };

    const results: H2HResult[] = H2H_MARKETS.map(market => {
        let wins = 0;
        const hits: number[] = [];

        matches.forEach(m => {
            const hit = market.check(m, playerA, playerB);
            if (hit) wins++;
            hits.push(hit ? 1 : 0);
        });

        const indicators = calculateIndicators(wins, matches.length - wins, odd, unit);
        const momentum = calculateMomentum(hits.slice(0, 3), hits);

        return {
            id: market.id,
            label: market.label,
            wins,
            losses: matches.length - wins,
            totalBets: matches.length,
            profit: indicators.returnCash - (matches.length * unit), // Corrected logic: return - total invested
            roi: indicators.roi,
            units: indicators.returnUnits,
            winRate: (wins / matches.length) * 100,
            momentum,
            hits
        };
    });

    return {
        results,
        totalGames: matches.length
    };
};
