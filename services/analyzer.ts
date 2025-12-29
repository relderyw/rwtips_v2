// src/services/analyzer.ts

import { HistoryMatch, PlayerStats, LeagueStats } from '../types';

// Normaliza nomes de jogadores para comparação consistente
export const normalize = (name: string) => {
    if (!name) return "";
    return name.toString().trim().toLowerCase();
};

export const STRATEGY_THEMES: Record<string, { label: string, color: string, icon: string, secondary: string }> = {
  ht_pro: { label: "HT PRO SNIPER", color: "#6366f1", secondary: "rgba(99, 102, 241, 0.15)", icon: "fa-crosshairs" },
  ft_pro: { label: "FT PRO ENGINE", color: "#f97316", secondary: "rgba(249, 115, 22, 0.15)", icon: "fa-fire-flame-simple" },
  btts_pro_ht: { label: "BTTS HT PRO", color: "#ec4899", secondary: "rgba(236, 72, 153, 0.15)", icon: "fa-arrows-rotate" },
  casa_pro: { label: "CASA DOMINANTE", color: "#10b981", secondary: "rgba(16, 185, 129, 0.15)", icon: "fa-house-circle-check" },
  fora_pro: { label: "FORA DOMINANTE", color: "#10b981", secondary: "rgba(16, 185, 129, 0.15)", icon: "fa-plane-arrival" },
  casa_engine_pro: { label: "CASA ENGINE", color: "#06b6d4", secondary: "rgba(6, 182, 212, 0.15)", icon: "fa-gears" },
  fora_engine_pro: { label: "FORA ENGINE", color: "#06b6d4", secondary: "rgba(6, 182, 212, 0.15)", icon: "fa-microchip" },
  top_clash: { label: "ELITE CLASH", color: "#eab308", secondary: "rgba(234, 179, 8, 0.15)", icon: "fa-crown" },
  none: { label: "", color: "transparent", secondary: "transparent", icon: "" }
};

export const LEAGUE_MAP: Record<string, { name: string, color: string, image: string }> = {
    "Esoccer Battle - 8 mins play": { 
      name: "BATTLE - 8 MIN", 
      color: "#ef4444", 
      image: "https://football.esportsbattle.com/favicon.ico" 
    },
    "Esoccer Battle Volta - 6 mins play": { 
      name: "VOLTA - 6 MIN", 
      color: "#FACC15", 
      image: "https://football.esportsbattle.com/favicon.ico" 
    },
    "Esoccer GT Leagues": { 
      name: "GT LEAGUES", 
      color: "#22C55E", 
      image: "https://img1.wsimg.com/isteam/ip/8a6541ea-9c44-481b-bcea-c4fbc17257e9/gt2.png/:/cr=t:25%25,l:0%25,w:100%25,h:50%25/rs=w:400,h:200,cg:true" 
    },
    "Esoccer H2H GG League": { 
      name: "H2H GG LEAGUE", 
      color: "#A855F7", 
      image: "https://h2h.cdn-hudstats.com/assets/H2H-ltFU8AWE.svg" 
    },
    "Esoccer Adriatic League": { 
      name: "ADRIATIC", 
      color: "#ef4444", 
      image: "https://images.leaguerepublic.com/data/images/311929616/107.png" 
    }
};

export const getLeagueInfo = (fullName: string) => {
    const found = Object.entries(LEAGUE_MAP).find(([key]) => fullName.includes(key));
    if (found) return found[1];
    return { name: fullName.replace("Esoccer ", "").toUpperCase(), color: "#10B981", image: "https://cdn-icons-png.flaticon.com/512/33/33736.png" };
};

// === MÉTRICAS RECENTES DO JOGADOR (CORRIGIDA PARA ACEITAR QUALQUER FORMATO) ===
const calculateRecentMetrics = (playerName: string, gamesData: any, limit: number = 5) => {
  // Extrai o array de jogos de qualquer formato possível
  let games: HistoryMatch[] = [];

  if (Array.isArray(gamesData)) {
    games = gamesData;
  } else if (gamesData && typeof gamesData === 'object') {
    games = gamesData.results || gamesData.data || gamesData.matches || gamesData.games || [];
  }

  if (!games || games.length === 0) {
    return null;
  }

  const targetName = normalize(playerName);
  const playerGames = games
    .filter(g => normalize(g.home_player) === targetName || normalize(g.away_player) === targetName)
    .sort((a, b) => new Date(b.data_realizacao).getTime() - new Date(a.data_realizacao).getTime())
    .slice(0, limit);

  if (playerGames.length < limit) return null;

  let wins = 0, goalsHT = 0, goalsFT = 0, goalsConcededFT = 0, goalsConcededHT = 0;
  let over05HT = 0, over15HT = 0, over25HT = 0, over25FT = 0, over35FT = 0, bttsHT = 0, bttsFT = 0;

  playerGames.forEach(g => {
    const isHome = normalize(g.home_player) === targetName;
    const pFT = Number(isHome ? g.score_home || 0 : g.score_away || 0);
    const oFT = Number(isHome ? g.score_away || 0 : g.score_home || 0);
    const pHT = Number(isHome ? g.halftime_score_home || 0 : g.halftime_score_away || 0);
    const oHT = Number(isHome ? g.halftime_score_away || 0 : g.halftime_score_home || 0);
    
    if (pFT > oFT) wins++;
    goalsHT += pHT;
    goalsFT += pFT;
    goalsConcededFT += oFT;
    goalsConcededHT += oHT;

    if ((pHT + oHT) > 0.5) over05HT++;
    if ((pHT + oHT) > 1.5) over15HT++;
    if ((pHT + oHT) > 2.5) over25HT++;
    if ((pFT + oFT) > 2.5) over25FT++;
    if ((pFT + oFT) > 3.5) over35FT++;
    if (pHT > 0 && oHT > 0) bttsHT++;
    if (pFT > 0 && oFT > 0) bttsFT++;
  });

  const last3Results: string[] = playerGames.slice(0, 3).map(g => {
    const isHome = normalize(g.home_player) === targetName;
    const pFT = Number(isHome ? g.score_home || 0 : g.score_away || 0);
    const oFT = Number(isHome ? g.score_away || 0 : g.score_home || 0);
    return pFT > oFT ? 'W' : pFT === oFT ? 'D' : 'L';
  });

  return {
    winRate: (wins / limit) * 100,
    avgGoalsHT: goalsHT / limit,
    avgGoalsFT: goalsFT / limit,
    avgGoalsConcededHT: goalsConcededHT / limit,
    avgGoalsConcededFT: goalsConcededFT / limit,
    over05HT: (over05HT / limit) * 100,
    over15HT: (over15HT / limit) * 100,
    over25HT: (over25HT / limit) * 100,
    over25FT: (over25FT / limit) * 100,
    over35FT: (over35FT / limit) * 100,
    bttsHT: (bttsHT / limit) * 100,
    bttsFT: (bttsFT / limit) * 100,
    last3Results
  };
};

// === PROBABILIDADE DE MÉTRICA ===
export const calculateMetricProbability = (playerName: string, gamesData: any, metric: string, isHT: boolean = false, limit: number = 5): number => {
  let games: HistoryMatch[] = [];

  if (Array.isArray(gamesData)) {
    games = gamesData;
  } else if (gamesData && typeof gamesData === 'object') {
    games = gamesData.results || gamesData.data || gamesData.matches || [];
  }

  if (!games || games.length === 0) return 0;

  const targetName = normalize(playerName);
  const playerGames = games
    .filter(g => normalize(g.home_player) === targetName || normalize(g.away_player) === targetName)
    .sort((a, b) => new Date(b.data_realizacao).getTime() - new Date(a.data_realizacao).getTime())
    .slice(0, limit);
    
  if (playerGames.length === 0) return 0;
  
  let successCount = 0;
  playerGames.forEach(g => {
    const home = isHT ? Number(g.halftime_score_home || 0) : Number(g.score_home || 0);
    const away = isHT ? Number(g.halftime_score_away || 0) : Number(g.score_away || 0);
    const total = home + away;
    const isTargetHome = normalize(g.home_player) === targetName;
    const targetGoals = isTargetHome ? home : away;

    switch (metric) {
      case 'over0.5': if (total > 0.5) successCount++; break;
      case 'over1.5': if (total > 1.5) successCount++; break;
      case 'over2.5': if (total > 2.5) successCount++; break;
      case 'over3.5': if (total > 3.5) successCount++; break;
      case 'btts': if (home > 0 && away > 0) successCount++; break;
      case '0x0': if (total === 0) successCount++; break;
      case 'target0.5': if (targetGoals >= 0.5) successCount++; break;
      case 'target1.5': if (targetGoals >= 1.5) successCount++; break;
      case 'target2.5': if (targetGoals >= 2.5) successCount++; break;
      case 'target3.5': if (targetGoals >= 3.5) successCount++; break;
    }
  });
  return (successCount / playerGames.length) * 100;
};

// === ESTATÍSTICAS POR LIGA (JÁ CORRIGIDA ANTERIORMENTE) ===
export const calculateLeagueStats = (historyData: any, sampleSize: number = 15): LeagueStats[] => {
  let allGames: HistoryMatch[] = [];

  if (Array.isArray(historyData)) {
    allGames = historyData;
  } else if (historyData && typeof historyData === 'object') {
    allGames = historyData.results || historyData.data || historyData.matches || historyData.games || [];
  }

  if (!allGames || allGames.length === 0) {
    return [];
  }

  const leaguesMap = new Map<string, HistoryMatch[]>();
  allGames.forEach(g => {
    const leagueName = g.league_name || 'Unknown League';
    if (!leaguesMap.has(leagueName)) leaguesMap.set(leagueName, []);
    leaguesMap.get(leagueName)!.push(g);
  });
  
  const stats: LeagueStats[] = [];
  leaguesMap.forEach((games, leagueName) => {
    const sortedGames = [...games].sort((a, b) => new Date(b.data_realizacao).getTime() - new Date(a.data_realizacao).getTime());
    const sample = sortedGames.slice(0, sampleSize);
    if (sample.length === 0) return;
    
    const metrics = {
      ht05: (sample.filter(g => (Number(g.halftime_score_home || 0) + Number(g.halftime_score_away || 0)) > 0.5).length / sample.length) * 100,
      ht15: (sample.filter(g => (Number(g.halftime_score_home || 0) + Number(g.halftime_score_away || 0)) > 1.5).length / sample.length) * 100,
      ht25: (sample.filter(g => (Number(g.halftime_score_home || 0) + Number(g.halftime_score_away || 0)) > 2.5).length / sample.length) * 100,
      htBtts: (sample.filter(g => Number(g.halftime_score_home || 0) > 0 && Number(g.halftime_score_away || 0) > 0).length / sample.length) * 100,
      ht0x0: (sample.filter(g => Number(g.halftime_score_home || 0) === 0 && Number(g.halftime_score_away || 0) === 0).length / sample.length) * 100,
      ft15: (sample.filter(g => (Number(g.score_home || 0) + Number(g.score_away || 0)) > 1.5).length / sample.length) * 100,
      ft25: (sample.filter(g => (Number(g.score_home || 0) + Number(g.score_away || 0)) > 2.5).length / sample.length) * 100,
      ft35: (sample.filter(g => (Number(g.score_home || 0) + Number(g.score_away || 0)) > 3.5).length / sample.length) * 100,
      ftBtts: (sample.filter(g => Number(g.score_home || 0) > 0 && Number(g.score_away || 0) > 0).length / sample.length) * 100,
      ft0x0: (sample.filter(g => Number(g.score_home || 0) === 0 && Number(g.score_away || 0) === 0).length / sample.length) * 100,
    };
    
    let temp: 'hot' | 'warm' | 'cold' = 'warm';
    if (metrics.ft25 >= 60 || metrics.ht05 >= 80) temp = 'hot';
    else if (metrics.ft15 < 50) temp = 'cold';
    
    stats.push({ 
      leagueName, 
      last5Games: sortedGames.slice(0, 5), 
      sampleGames: sample, 
      metrics, 
      temperature: temp 
    });
  });
  
  return stats;
};

// === ESTATÍSTICAS DO JOGADOR ===
export const calculatePlayerStats = (playerName: string, gamesData: any, limit: number = 5): PlayerStats & { lastMatches: any[] } => {
  let games: HistoryMatch[] = [];

  if (Array.isArray(gamesData)) {
    games = gamesData;
  } else if (gamesData && typeof gamesData === 'object') {
    games = gamesData.results || gamesData.data || gamesData.matches || [];
  }

  const targetName = normalize(playerName);
  const playerGames = games
    .filter(g => normalize(g.home_player) === targetName || normalize(g.away_player) === targetName)
    .sort((a, b) => new Date(b.data_realizacao).getTime() - new Date(a.data_realizacao).getTime());
  
  if (playerGames.length === 0) {
    return {
      name: playerName, matchesPlayed: 0, wins: 0, draws: 0, losses: 0,
      avgGoalsScoredHT: 0, avgGoalsScoredFT: 0, avgGoalsConceded: 0, winRate: 0,
      last5: [], lastMatches: [], htOver05Rate: 0, htOver15Rate: 0, htOver25Rate: 0, htBttsRate: 0,
      ht0x0Rate: 0, ft15Rate: 0, ftOver25Rate: 0, ft35Rate: 0, ftBttsRate: 0, ft0x0Rate: 0
    };
  }

  const sampleLimit = Math.min(limit, playerGames.length);
  const recentSample = playerGames.slice(0, sampleLimit);
  
  let goalsHT = 0, goalsFT = 0, concededFT = 0, wins = 0;
  const last5: string[] = [];
  const lastMatches: any[] = [];
  
  recentSample.forEach((g) => {
    const isHome = normalize(g.home_player) === targetName;
    const pFT = Number(isHome ? g.score_home || 0 : g.score_away || 0);
    const oFT = Number(isHome ? g.score_away || 0 : g.score_home || 0);
    const pHT = Number(isHome ? g.halftime_score_home || 0 : g.halftime_score_away || 0);
    const oHT = Number(isHome ? g.halftime_score_away || 0 : g.halftime_score_home || 0);
    
    goalsHT += pHT;
    goalsFT += pFT;
    concededFT += oFT;
    
    const res = pFT > oFT ? 'W' : pFT === oFT ? 'D' : 'L';
    last5.push(res);
    lastMatches.push({ 
      ...g, 
      result: res, 
      targetScore: pFT, 
      opponentScore: oFT,
      targetHT: pHT,
      opponentHT: oHT
    });
    if (pFT > oFT) wins++;
  });

  return {
    name: playerName,
    matchesPlayed: playerGames.length,
    wins, draws: 0, losses: recentSample.length - wins,
    avgGoalsScoredHT: goalsHT / recentSample.length,
    avgGoalsScoredFT: goalsFT / recentSample.length,
    avgGoalsConceded: concededFT / recentSample.length,
    winRate: (wins / recentSample.length) * 100,
    last5: last5.reverse(),
    lastMatches: lastMatches.reverse(),
    htOver05Rate: calculateMetricProbability(playerName, games, 'over0.5', true, limit),
    htOver15Rate: calculateMetricProbability(playerName, games, 'over1.5', true, limit),
    htOver25Rate: calculateMetricProbability(playerName, games, 'over2.5', true, limit),
    htBttsRate: calculateMetricProbability(playerName, games, 'btts', true, limit),
    ht0x0Rate: calculateMetricProbability(playerName, games, '0x0', true, limit),
    ft15Rate: calculateMetricProbability(playerName, games, 'over1.5', false, limit),
    ftOver25Rate: calculateMetricProbability(playerName, games, 'over2.5', false, limit),
    ft35Rate: calculateMetricProbability(playerName, games, 'over3.5', false, limit),
    ftBttsRate: calculateMetricProbability(playerName, games, 'btts', false, limit),
    ft0x0Rate: calculateMetricProbability(playerName, games, '0x0', false, limit),
  };
};

// === ANÁLISE DE POTENCIAL DO JOGO ===
export interface AnalysisResult {
  key: string;
  confidence: number;
  reasons: string[];
}

export const analyzeMatchPotential = (p1Name: string, p2Name: string, gamesData: any): AnalysisResult => {
  let games: HistoryMatch[] = [];

  if (Array.isArray(gamesData)) {
    games = gamesData;
  } else if (gamesData && typeof gamesData === 'object') {
    games = gamesData.results || gamesData.data || gamesData.matches || [];
  }

  const none = { key: 'none', confidence: 0, reasons: [] };
  if (!games || games.length === 0) return none;

  const p1 = calculateRecentMetrics(p1Name, games, 5);
  const p2 = calculateRecentMetrics(p2Name, games, 5);
  
  if (!p1 || !p2) return none;

  // Validação de Amostra Mínima
  if (p1.last3Results.length < 3 || p2.last3Results.length < 3) return none;

  let resultKey = 'none';
  let confidence = 70;
  const reasons: string[] = [];

  // 1. HT PRO SNIPER
  if (p1.over05HT === 100 && p1.avgGoalsHT >= 1.8 &&
      p2.over05HT === 100 && p2.avgGoalsHT >= 1.8) {
      resultKey = 'ht_pro';
  }

  // 2. FT PRO ENGINE
  const avgOver25 = (p1.over25FT + p2.over25FT) / 2;
  const avgOver35 = (p1.over35FT + p2.over35FT) / 2;
  const avgBtts = (p1.bttsFT + p2.bttsFT) / 2;
  const avgGoalsFT = (p1.avgGoalsFT + p2.avgGoalsFT);

  if (resultKey === 'none' && avgOver25 >= 97 && avgOver35 >= 75 && avgBtts >= 88 && avgGoalsFT >= 4.0) {
      resultKey = 'ft_pro';
  }

  // 3. BTTS HT PRO
  if (resultKey === 'none' && p1.avgGoalsHT >= 1.5 && p2.avgGoalsHT >= 1.5 && p1.bttsHT > 80 && p2.bttsHT > 80) {
      resultKey = 'btts_pro_ht';
  }

  // 4. DOMINANTE
  const isP1Dominant = p1.last3Results.filter(r => r === 'W').length === 3 || 
                      (p1.last3Results.filter(r => r === 'W').length === 2 && p1.last3Results.includes('D'));
  
  const isP2Dominant = p2.last3Results.filter(r => r === 'W').length === 3 || 
                      (p2.last3Results.filter(r => r === 'W').length === 2 && p2.last3Results.includes('D'));

  if (resultKey === 'none') {
    if (isP1Dominant) resultKey = 'casa_pro';
    else if (isP2Dominant) resultKey = 'fora_pro';
  }

  // 5. ENGINE PRO
  if (resultKey === 'none') {
    if (p1.avgGoalsHT >= 2.0 && p1.avgGoalsFT >= 2.5 && p2.avgGoalsHT <= 1.0 && p2.avgGoalsFT <= 1.8) resultKey = 'casa_engine_pro';
    else if (p2.avgGoalsHT >= 2.0 && p2.avgGoalsFT >= 2.5 && p1.avgGoalsHT <= 1.0 && p1.avgGoalsFT <= 1.8) resultKey = 'fora_engine_pro';
  }

  // 6. ELITE CLASH
  if (resultKey === 'none' && p1.winRate >= 50 && p2.winRate >= 50) {
    resultKey = 'top_clash';
  }

  if (resultKey === 'none') return none;

  // --- Sistema de Confiança e Veto por H2H ---
  const h2h = getH2HStats(p1Name, p2Name, games);
  
  // Veto ou Bônus por H2H
  if (h2h.count >= 2) {
    const p1WinProb = h2h.p1WinProb;
    const p2WinProb = h2h.p2WinProb;

    if (resultKey === 'casa_pro' || resultKey === 'casa_engine_pro') {
      if (p1WinProb >= 60) {
        confidence += 15;
        reasons.push("H2H amplamente favorável ao mandante");
      } else if (p1WinProb < 30) {
        return none; // VETO: Histórico ruim contra esse adversário
      }
    }

    if (resultKey === 'fora_pro' || resultKey === 'fora_engine_pro') {
      if (p2WinProb >= 60) {
        confidence += 15;
        reasons.push("H2H amplamente favorável ao visitante");
      } else if (p2WinProb < 30) {
        return none; // VETO
      }
    }

    if (resultKey === 'ht_pro' || resultKey === 'btts_pro_ht') {
      if (h2h.p1AvgGoalsHT + h2h.p2AvgGoalsHT >= 1.5) {
        confidence += 10;
        reasons.push("H2H com alta média de gols no HT");
      }
    }
  }

  // Bônus por Forma Recente (Last 2)
  const p1Last2 = p1.last3Results.slice(0, 2);
  const p2Last2 = p2.last3Results.slice(0, 2);
  
  if (resultKey.includes('casa') && p1Last2.every(r => r === 'W')) confidence += 5;
  if (resultKey.includes('fora') && p2Last2.every(r => r === 'W')) confidence += 5;

  return {
    key: resultKey,
    confidence: Math.min(confidence, 100),
    reasons
  };
};

// === ESTATÍSTICAS H2H ===
export const getH2HStats = (p1: string, p2: string, gamesData: any) => {
  let games: HistoryMatch[] = [];

  if (Array.isArray(gamesData)) {
    games = gamesData;
  } else if (gamesData && typeof gamesData === 'object') {
    games = gamesData.results || gamesData.data || gamesData.matches || [];
  }

  const n1 = normalize(p1), n2 = normalize(p2);
  const h2h = games.filter(g => 
    (normalize(g.home_player) === n1 && normalize(g.away_player) === n2) || 
    (normalize(g.home_player) === n2 && normalize(g.away_player) === n1)
  );
  
  let p1Wins = 0, p2Wins = 0, draws = 0;
  let p1GoalsHT = 0, p2GoalsHT = 0;
  let p1GoalsFT = 0, p2GoalsFT = 0;

  h2h.forEach(g => {
    const isP1Home = normalize(g.home_player) === n1;
    const p1Score = Number(isP1Home ? g.score_home || 0 : g.score_away || 0);
    const p2Score = Number(isP1Home ? g.score_away || 0 : g.score_home || 0);
    const p1HT = Number(isP1Home ? g.halftime_score_home || 0 : g.halftime_score_away || 0);
    const p2HT = Number(isP1Home ? g.halftime_score_away || 0 : g.halftime_score_home || 0);

    if (p1Score > p2Score) p1Wins++; 
    else if (p2Score > p1Score) p2Wins++; 
    else draws++;
    
    p1GoalsHT += p1HT;
    p2GoalsHT += p2HT;
    p1GoalsFT += p1Score;
    p2GoalsFT += p2Score;
  });

  const count = h2h.length || 1;
  return { 
    count: h2h.length, 
    p1Wins, p2Wins, draws,
    p1WinProb: (p1Wins / count) * 100,
    p2WinProb: (p2Wins / count) * 100,
    drawProb: (draws / count) * 100,
    p1AvgGoalsHT: p1GoalsHT / count,
    p2AvgGoalsHT: p2GoalsHT / count,
    p1AvgGoalsFT: p1GoalsFT / count,
    p2AvgGoalsFT: p2GoalsFT / count,
    recentGames: h2h.slice(0, 5)
  };
};

export const checkStrategySuccess = (strategyKey: string, match: HistoryMatch): boolean => {
  const totFT = (Number(match.score_home) + Number(match.score_away));
  const totHT = (Number(match.halftime_score_home) + Number(match.halftime_score_away));
  
  switch (strategyKey) {
    case 'ht_pro': return totHT > 0.5;
    case 'ft_pro': return totFT > 2.5;
    case 'btts_pro_ht': return Number(match.halftime_score_home) > 0 && Number(match.halftime_score_away) > 0;
    case 'casa_pro': return Number(match.score_home) > Number(match.score_away);
    case 'fora_pro': return Number(match.score_away) > Number(match.score_home);
    case 'casa_engine_pro': return Number(match.score_home) > 1.5;
    case 'fora_engine_pro': return Number(match.score_away) > 1.5;
    case 'top_clash': return totFT > 2.5 && Number(match.score_home) > 0 && Number(match.score_away) > 0;
    default: return false;
  }
};

export const generateStrategyReport = (history: HistoryMatch[], limitPerLeague?: number) => {
  if (!history || history.length < 20) return [];

  const sortedHistory = [...history].sort((a, b) => 
    new Date(a.data_realizacao).getTime() - new Date(b.data_realizacao).getTime()
  );

  // Mapear quais jogos são os últimos X de cada liga
  const gamesToProcess = new Set<string>();
  if (limitPerLeague) {
    const leagueCounters: Record<string, number> = {};
    // Percorrer do mais recente para o mais antigo
    for (let i = sortedHistory.length - 1; i >= 0; i--) {
      const g = sortedHistory[i];
      const l = g.league_name || "Outra";
      if (!leagueCounters[l]) leagueCounters[l] = 0;
      
      if (leagueCounters[l] < limitPerLeague) {
        gamesToProcess.add(JSON.stringify(g)); // Usar stringify como chave única simples
        leagueCounters[l]++;
      }
    }
  }

  const report: Record<string, any> = {};
  for (let i = 15; i < sortedHistory.length; i++) {
    const currentMatch = sortedHistory[i];
    
    // Se houver limite, pula se não for um dos últimos X daquela liga
    if (limitPerLeague && !gamesToProcess.has(JSON.stringify(currentMatch))) continue;

    const pastData = sortedHistory.slice(0, i);
    const analysis = analyzeMatchPotential(currentMatch.home_player, currentMatch.away_player, pastData);
    const potential = analysis.key;
    
    if (potential !== 'none') {
      const dateKey = new Date(currentMatch.data_realizacao).toLocaleDateString('pt-BR');
      const leagueName = currentMatch.league_name || "Outra";
      const key = `${dateKey}_${leagueName}`;
      if (!report[key]) {
        report[key] = { date: dateKey, league: leagueName, strategies: {} };
      }
      if (!report[key].strategies[potential]) {
        report[key].strategies[potential] = { total: 0, green: 0, red: 0, sumConfidence: 0 };
      }
      const isSuccess = checkStrategySuccess(potential, currentMatch);
      report[key].strategies[potential].total++;
      report[key].strategies[potential].sumConfidence += analysis.confidence;
      if (isSuccess) report[key].strategies[potential].green++;
      else report[key].strategies[potential].red++;
    }
  }
  return Object.values(report).sort((a: any, b: any) => {
    const dateA = a.date.split('/').reverse().join('-');
    const dateB = b.date.split('/').reverse().join('-');
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return a.league.localeCompare(b.league);
  });
};
