import { HistoryMatch } from '../../types';

export type BacktestMode = 'INDIVIDUAL' | 'H2H';

export interface BacktestInput {
    mode: BacktestMode;
    playerA: string;
    playerB?: string;
    allHistory: HistoryMatch[];
    stake: number;
    odd: number;
    gamesCount: number;
}

export interface BacktestMarket {
    id: string;
    label: string;
    check: (m: HistoryMatch) => boolean;
}

export interface BacktestResult extends BacktestMarket {
    wins: number;
    losses: number;
    totalBets: number;
    profit: number;
    roi: number;
    units: number;
    winRate: number;
}
