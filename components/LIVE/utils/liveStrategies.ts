
export interface StrategyResult {
    name: string;
    description: string;
    confidence?: number; // Optional, as the py script strictly triggers or not
    type: 'GOLS' | 'CANTOS' | 'AMBAS';
}

interface MatchStats {
    time: number;
    homeScore: number;
    awayScore: number;
    homeAttacks: number;
    awayAttacks: number;
    homeDangerousAttacks: number;
    awayDangerousAttacks: number;
    homeShootsOn: number;
    awayShootsOn: number;
    homeShootsOff: number;
    awayShootsOff: number;
    homeCorners: number;
    awayCorners: number;
    homeName: string;
    awayName: string;
}

export const calculateStrategies = (stats: MatchStats): StrategyResult[] => {
    const strategies: StrategyResult[] = [];
    const {
        time,
        homeScore,
        awayScore,
        homeDangerousAttacks,
        awayDangerousAttacks,
        homeShootsOn,
        awayShootsOn,
        homeShootsOff,
        awayShootsOff,
        homeCorners,
        awayCorners,
        homeName,
        awayName
    } = stats;

    if (time <= 0) return [];

    // Basic Metrics
    const appmHome = homeDangerousAttacks / time;
    const appmAway = awayDangerousAttacks / time;
    const appmTotal = appmHome + appmAway;

    const cgHome = homeCorners + homeShootsOn + homeShootsOff;
    const cgAway = awayCorners + awayShootsOn + awayShootsOff;
    const cgTotal = cgHome + cgAway;

    const scoreTotal = homeScore + awayScore;
    const cornersTotal = homeCorners + awayCorners;

    // Time Phases
    const isT1 = time <= 43; // 1st Half window
    const isT2 = time >= 50 && time <= 85; // 2nd Half window (py uses specific limits per strategy, normalizing here mostly)
    
    // --- Strategies from live.py ---

    // 1. Over 0.5 HT (Home Pressure)
    if (appmHome >= 1.3 && cgHome >= 10 && homeScore <= awayScore && isT1 && time <= 39) {
        strategies.push({
            name: `Over ${homeScore}.5 Goal (HT) - Casa`,
            description: `${homeName} pressionando muito no 1º tempo.`,
            type: 'GOLS'
        });
    }

    // 2. Over 0.5 HT (Away Pressure)
    if (appmAway >= 1.3 && cgAway >= 10 && awayScore <= homeScore && isT1 && time <= 39) {
        strategies.push({
            name: `Over ${awayScore}.5 Goal (HT) - Fora`,
            description: `${awayName} pressionando muito no 1º tempo.`,
            type: 'GOLS'
        });
    }

    // 3. BTTS HT (Home Pressure, Trailing/Drawing with goals involved logic adjusted)
    // Py: sc_home <= 0 (0 goals) AND sc_away >= 1 ...
    if (appmHome >= 1.3 && cgHome >= 10 && homeScore === 0 && awayScore >= 1 && isT1 && time <= 39) {
        strategies.push({
            name: 'Ambas Marcam - SIM (HT)',
            description: 'Casa pressionando para empatar ainda no 1º tempo.',
            type: 'AMBAS'
        });
    }

    // 4. BTTS HT (Away Pressure)
    if (appmAway >= 1.3 && cgAway >= 10 && awayScore === 0 && homeScore >= 1 && isT1 && time <= 39) {
        strategies.push({
            name: 'Ambas Marcam - SIM (HT)',
            description: 'Visitante pressionando para empatar ainda no 1º tempo.',
            type: 'AMBAS'
        });
    }

    // 5. BTTS FT (Home Pressure) - Time limit 85
    if (appmHome >= 1.1 && cgHome >= 20 && homeScore === 0 && awayScore >= 1 && isT2) {
        strategies.push({
            name: 'Ambas Marcam - SIM (FT)',
            description: 'Pressão forte da casa para buscar o empate.',
            type: 'AMBAS'
        });
    }

    // 6. BTTS FT (Away Pressure)
    if (appmAway >= 1.1 && cgAway >= 20 && awayScore === 0 && homeScore >= 1 && isT2) {
        strategies.push({
            name: 'Ambas Marcam - SIM (FT)',
            description: 'Pressão forte do visitante para buscar o empate.',
            type: 'AMBAS'
        });
    }

    // 7. Over Goals FT (Home)
    if (appmHome >= 1.1 && cgHome >= 15 && homeScore <= awayScore && isT2) {
        strategies.push({
            name: `Over ${homeScore}.5 Goal (FT) - Casa`,
            description: 'Casa buscando gol no 2º tempo.',
            type: 'GOLS'
        });
    }

    // 8. Over Goals FT (Away)
    if (appmAway >= 1.1 && cgAway >= 15 && awayScore <= homeScore && isT2) {
        strategies.push({
            name: `Over ${awayScore}.5 Goal (FT) - Fora`,
            description: 'Visitante buscando gol no 2º tempo.',
            type: 'GOLS'
        });
    }

    // 9. Over 0.5 HT (General High Activity)
    // Py: appmT >= 1.3 and cgT >= 17 and scT <= 0
    if (appmTotal >= 1.3 && cgTotal >= 17 && scoreTotal === 0 && isT1 && time <= 39) {
        strategies.push({
            name: `Over 0.5 Goal (HT)`,
            description: 'Jogo muito movimentado, alta chance de gol no HT.',
            type: 'GOLS'
        });
    }

    // 10. Over Goals FT (General)
    // Py: appmT >= 1.1 and cgT >= 20 and scT <= 2
    if (appmTotal >= 1.1 && cgTotal >= 20 && scoreTotal <= 2 && isT2 && time <= 85) {
        strategies.push({
            name: `Over ${scoreTotal}.5 Goal (FT)`,
            description: 'Jogo aberto no final, tendência de mais gols.',
            type: 'GOLS'
        });
    }

    // 11. Cornes HT (General)
    // Py: t1 and tempo_int <= 41
    if (appmTotal >= 1.3 && cgTotal >= 10 && isT1 && time <= 41) {
        strategies.push({
            name: `Over ${cornersTotal}.5 Cantos (HT)`,
            description: 'Jogo intenso, chance de escanteio no fim do HT.',
            type: 'CANTOS'
        });
    }

    // 12. Corners FT (General)
    // Py: tempo_int <= 87
    if (appmTotal >= 1.1 && cgTotal >= 20 && isT2 && time <= 87) {
        strategies.push({
            name: `Over ${cornersTotal}.5 Cantos (FT)`,
            description: 'Pressão final, chance de escanteios.',
            type: 'CANTOS'
        });
    }

    // 13. Corners HT (Home specific)
    const shotsTotalHome = homeShootsOn + homeShootsOff;
    const shotsTotalAway = awayShootsOn + awayShootsOff;
    
    if (appmHome >= 1.3 && cgHome >= 10 && homeScore <= awayScore && shotsTotalHome > shotsTotalAway && isT1 && time <= 37) {
        strategies.push({
            name: `Over ${homeCorners}.5 Cantos (HT) - Casa`,
            description: 'Casa pressionando e chutando mais.',
            type: 'CANTOS'
        });
    }

    // 14. Corners HT (Away specific)
    if (appmAway >= 1.3 && cgAway >= 10 && awayScore <= homeScore && shotsTotalAway > shotsTotalHome && isT1 && time <= 37) {
        strategies.push({
            name: `Over ${awayCorners}.5 Cantos (HT) - Fora`,
            description: 'Visitante pressionando e chutando mais.',
            type: 'CANTOS'
        });
    }

    // 15. Corners FT (Home specific)
    if (appmHome >= 1.1 && cgHome >= 15 && homeScore <= awayScore && shotsTotalHome > shotsTotalAway && isT2 && time <= 85) {
        strategies.push({
            name: `Over ${homeCorners}.5 Cantos (FT) - Casa`,
            description: 'Blitz da casa no 2º tempo.',
            type: 'CANTOS'
        });
    }

    // 16. Corners FT (Away specific)
    if (appmAway >= 1.1 && cgAway >= 15 && awayScore <= homeScore && shotsTotalAway > shotsTotalHome && isT2 && time <= 85) {
        strategies.push({
            name: `Over ${awayCorners}.5 Cantos (FT) - Fora`,
            description: 'Blitz do visitante no 2º tempo.',
            type: 'CANTOS'
        });
    }

    return strategies;
};
