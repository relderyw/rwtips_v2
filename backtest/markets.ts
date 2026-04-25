import { BacktestMarket } from './types';

export const getIndividualMarkets = (playerA: string): BacktestMarket[] => [
    { 
        id: 'ind_ht_over05', 
        label: 'HT Over 0.5 (Player)', 
        check: (m) => {
            const isHome = m.home_player === playerA || (m.home_player && m.home_player.includes(playerA));
            const goals = isHome ? m.halftime_score_home : m.halftime_score_away;
            return Number(goals) > 0.5;
        } 
    },
    { 
        id: 'ind_ht_over15', 
        label: 'HT Over 1.5 (Player)', 
        check: (m) => {
            const isHome = m.home_player === playerA || (m.home_player && m.home_player.includes(playerA));
            const goals = isHome ? m.halftime_score_home : m.halftime_score_away;
            return Number(goals) > 1.5;
        } 
    },
    { 
        id: 'ind_ft_over05', 
        label: 'FT Over 0.5 (Player)', 
        check: (m) => {
            const isHome = m.home_player === playerA || (m.home_player && m.home_player.includes(playerA));
            const goals = isHome ? m.score_home : m.score_away;
            return Number(goals) > 0.5;
        } 
    },
    { 
        id: 'ind_ft_over15', 
        label: 'FT Over 1.5 (Player)', 
        check: (m) => {
            const isHome = m.home_player === playerA || (m.home_player && m.home_player.includes(playerA));
            const goals = isHome ? m.score_home : m.score_away;
            return Number(goals) > 1.5;
        } 
    },
    { 
        id: 'ind_ft_over25', 
        label: 'FT Over 2.5 (Player)', 
        check: (m) => {
            const isHome = m.home_player === playerA || (m.home_player && m.home_player.includes(playerA));
            const goals = isHome ? m.score_home : m.score_away;
            return Number(goals) > 2.5;
        } 
    },
    { 
        id: 'ind_win', 
        label: 'Vitória (Player)', 
        check: (m) => {
            const isHome = m.home_player === playerA || (m.home_player && m.home_player.includes(playerA));
            if (isHome) return Number(m.score_home) > Number(m.score_away);
            return Number(m.score_away) > Number(m.score_home);
        } 
    }
];

export const getH2HMarkets = (playerA: string, playerB: string): BacktestMarket[] => [
    { id: 'h2h_ht_over05', label: 'HT Over 0.5 (Total)', check: (m) => (Number(m.halftime_score_home) + Number(m.halftime_score_away)) > 0.5 },
    { id: 'h2h_ht_over15', label: 'HT Over 1.5 (Total)', check: (m) => (Number(m.halftime_score_home) + Number(m.halftime_score_away)) > 1.5 },
    { id: 'h2h_ht_btts', label: 'HT BTTS', check: (m) => Number(m.halftime_score_home) > 0 && Number(m.halftime_score_away) > 0 },
    
    { id: 'h2h_ft_over15', label: 'FT Over 1.5 (Total)', check: (m) => (Number(m.score_home) + Number(m.score_away)) > 1.5 },
    { id: 'h2h_ft_over25', label: 'FT Over 2.5 (Total)', check: (m) => (Number(m.score_home) + Number(m.score_away)) > 2.5 },
    { id: 'h2h_ft_over35', label: 'FT Over 3.5 (Total)', check: (m) => (Number(m.score_home) + Number(m.score_away)) > 3.5 },
    { id: 'h2h_ft_btts', label: 'FT BTTS', check: (m) => Number(m.score_home) > 0 && Number(m.score_away) > 0 },

    { 
        id: 'h2h_win_p1', 
        label: `Vitória ${playerA}`, 
        check: (m) => {
            const isHome = m.home_player === playerA || (m.home_player && m.home_player.includes(playerA));
            if (isHome) return Number(m.score_home) > Number(m.score_away);
            return Number(m.score_away) > Number(m.score_home);
        } 
    },
    { 
        id: 'h2h_win_p2', 
        label: `Vitória ${playerB}`, 
        check: (m) => {
            const isHome = m.home_player === playerB || (m.home_player && m.home_player.includes(playerB));
            if (isHome) return Number(m.score_home) > Number(m.score_away);
            return Number(m.score_away) > Number(m.score_home);
        } 
    }
];
