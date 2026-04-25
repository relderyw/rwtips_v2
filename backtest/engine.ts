import { HistoryMatch } from '../../types';
import { BacktestInput, BacktestResult, BacktestMarket } from './types';
import { getIndividualMarkets, getH2HMarkets } from './markets';

/**
 * Runs a backtest simulation based on historical data.
 * 
 * Logic:
 * 1. Filter matches by players and mode.
 * 2. Get applicable markets (Individual or H2H).
 * 3. Calculate financial performance for each market.
 */
export const runBacktest = (input: BacktestInput): { results: BacktestResult[], matchCount: number } => {
    const { mode, playerA, playerB, allHistory, stake, odd, gamesCount } = input;
    
    let matches: HistoryMatch[] = [];
    const p1Lower = playerA.trim().toLowerCase();

    if (mode === 'INDIVIDUAL') {
        matches = allHistory.filter(m => 
            (m.home_player || '').trim().toLowerCase() === p1Lower || 
            (m.away_player || '').trim().toLowerCase() === p1Lower
        ).slice(0, gamesCount);
    } else if (mode === 'H2H' && playerB) {
        const p2Lower = playerB.trim().toLowerCase();
        matches = allHistory.filter(m => {
            const h = (m.home_player || '').trim().toLowerCase();
            const a = (m.away_player || '').trim().toLowerCase();
            return (h === p1Lower && a === p2Lower) || (h === p2Lower && a === p1Lower);
        }).slice(0, gamesCount);
    }

    let markets: BacktestMarket[] = [];
    if (mode === 'INDIVIDUAL') {
        markets = getIndividualMarkets(playerA);
    } else if (mode === 'H2H' && playerB) {
        markets = getH2HMarkets(playerA, playerB);
    }

    const results: BacktestResult[] = markets.map(market => {
        let wins = 0;
        let losses = 0;
        let totalBets = 0;

        matches.forEach(match => {
            totalBets++;
            if (market.check(match)) {
                wins++;
            } else {
                losses++;
            }
        });

        const profit = (wins * stake * (odd - 1)) - (losses * stake);
        const roi = totalBets > 0 ? (profit / (totalBets * stake)) * 100 : 0;
        const units = profit / stake;
        const winRate = totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0;

        return { ...market, wins, losses, totalBets, profit, roi, units, winRate };
    });

    return { results, matchCount: matches.length };
};
