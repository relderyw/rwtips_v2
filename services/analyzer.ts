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
  btts_pro_ft: { label: "BTTS FT PRO", color: "#ec4899", secondary: "rgba(236, 72, 153, 0.15)", icon: "fa-arrows-rotate" },
  casa_pro: { label: "CASA DOMINANTE", color: "#10b981", secondary: "rgba(16, 185, 129, 0.15)", icon: "fa-house-circle-check" },
  fora_pro: { label: "FORA DOMINANTE", color: "#10b981", secondary: "rgba(16, 185, 129, 0.15)", icon: "fa-plane-arrival" },
  casa_engine_pro: { label: "CASA ENGINE", color: "#06b6d4", secondary: "rgba(6, 182, 212, 0.15)", icon: "fa-gears" },
  fora_engine_pro: { label: "FORA ENGINE", color: "#06b6d4", secondary: "rgba(6, 182, 212, 0.15)", icon: "fa-microchip" },
  top_clash: { label: "ELITE CLASH", color: "#eab308", secondary: "rgba(234, 179, 8, 0.15)", icon: "fa-crown" },
  none: { label: "", color: "transparent", secondary: "transparent", icon: "" }
};

export const LEAGUE_MAP: Record<string, { name: string, color: string, image: string }> = {
    // Old English format (backward compatibility)
    "Esoccer Battle - 8 mins play": { 
      name: "BATTLE - 8 MIN", 
      color: "#ef4444", 
      image: "https://football.esportsbattle.com/favicon.ico" 
    },
    "Esoccer Battle Volta - 6 mins play": { 
      name: "VOLTA", 
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
    // Alias direto para o nome retornado pela Superbet API
    "H2H - GG League": { 
      name: "H2H GG LEAGUE", 
      color: "#A855F7", 
      image: "https://h2h.cdn-hudstats.com/assets/H2H-ltFU8AWE.svg" 
    },
    "H2H - GG League Mixed": { 
      name: "H2H GG LEAGUE", 
      color: "#A855F7", 
      image: "https://h2h.cdn-hudstats.com/assets/H2H-ltFU8AWE.svg" 
    },
    "Esoccer Adriatic League": { 
      name: "ADRIATIC", 
      color: "#5b59acff", // Azul Marinho
      image: "https://eadriaticleague.com/wp-content/uploads/2025/10/IMG_0893-e1759408719298.png" 
    },
    
    // New Portuguese format from API (exact match with proper capitalization)
    "E-Soccer - Battle - 8 minutos de jogo": { 
      name: "BATTLE - 8 MIN", 
      color: "#ef4444", 
      image: "https://football.esportsbattle.com/favicon.ico" 
    },
    "E-Soccer - Battle Volta - 6 minutos de jogo": { 
      name: "VOLTA", 
      color: "#fa9715ff", 
      image: "https://football.esportsbattle.com/favicon.ico" 
    },
    "E-Soccer - GT Leagues - 12 minutos de jogo": { 
      name: "GT LEAGUES", 
      color: "#29f500ff", 
      image: "https://img1.wsimg.com/isteam/ip/8a6541ea-9c44-481b-bcea-c4fbc17257e9/gt2.png/:/cr=t:25%25,l:0%25,w:100%25,h:50%25/rs=w:400,h:200,cg:true" 
    },
    "E-Soccer - H2H GG League - 8 minutos de jogo": { 
      name: "H2H GG LEAGUE", 
      color: "#A855F7", 
      image: "https://h2h.cdn-hudstats.com/assets/H2H-ltFU8AWE.svg" 
    },
    // New mappings for Altenar/History API
    "Valhalla": { 
      name: "VALHALLA CUP", 
      color: "#cee028ff", // Cyan
      image: "https://drafted.gg/images/valhalla_cup/valhalla_cup_logo.svg" 
    },
    "Valkyrie": { 
      name: "VALKYRIE CUP", 
      color: "#f472b6", // Pink
      image: "https://drafted.gg/images/valkyrie_cup/valkyrie_cup_logo.svg" 
    },
    "CLA": { 
      name: "CLA LEAGUE", 
      color: "#24e2fbff", // Amber
      image: "https://static.wixstatic.com/media/3f54ed_4c8dd8b8b6464226a58ad4ba09c455c7%7Emv2.png/v1/fill/w_180%2Ch_180%2Clg_1%2Cusm_0.66_1.00_0.01/3f54ed_4c8dd8b8b6464226a58ad4ba09c455c7%7Emv2.png" 
    },
    "Cyber Live Arena": { 
      name: "CLA LEAGUE", 
      color: "#24fbf0ff", // Amber 
      image: "https://static.wixstatic.com/media/3f54ed_4c8dd8b8b6464226a58ad4ba09c455c7%7Emv2.png/v1/fill/w_180%2Ch_180%2Clg_1%2Cusm_0.66_1.00_0.01/3f54ed_4c8dd8b8b6464226a58ad4ba09c455c7%7Emv2.png" 
    }
};

export const getLeagueInfo = (fullName: string) => {
    if (!fullName) return { name: "UNKNOWN", color: "#10B981", image: "" };
    
    const normalized = fullName.toLowerCase();
    const clean = normalized.replace(/[^a-z0-9]/g, ' ');
    
    // Specific pattern matching to avoid duplicates
    // H2H must be checked first to avoid matching other patterns
    // NOTE: 'H2H - GG League' normalizes to 'h2h  gg league' (double space from dash),
    // so we check 'h2h' AND 'gg' independently instead of 'h2h gg' as one string.
    if (clean.includes('h2h') && (clean.includes('gg') || clean.includes('8 min'))) {
        return LEAGUE_MAP["E-Soccer - H2H GG League - 8 minutos de jogo"];
    }
    if (clean.includes('adriatic') || clean.includes('eal')) {
        return LEAGUE_MAP["Esoccer Adriatic League"];
    }
    if (clean.includes('valhalla')) {
        return LEAGUE_MAP["Valhalla"];
    }
    if (clean.includes('valkyrie')) {
        return LEAGUE_MAP["Valkyrie"];
    }
    if (clean.includes('cla') || clean.includes('cyber live arena')) {
        return LEAGUE_MAP["CLA"];
    }
    if (clean.includes('battle') && clean.includes('12 min')) {
        return { name: "BATTLE - 12 MIN", color: "#ef4444", image: "https://football.esportsbattle.com/favicon.ico" };
    }
    if (clean.includes('battle')) {
        return LEAGUE_MAP["E-Soccer - Battle - 8 minutos de jogo"];
    }
    if (normalized.startsWith('gt ') || clean.includes('gt leagues')) {
        return LEAGUE_MAP["Esoccer GT Leagues"];
    }
    if (clean.includes('champions league')) {
        return { name: "CHAMPIONS", color: "#3b82f6", image: "" };
    }
    
    // Try exact match first
    const exactMatch = Object.entries(LEAGUE_MAP).find(([key]) => fullName.includes(key));
    if (exactMatch) return exactMatch[1];
    
    // Try case-insensitive match
    const caseInsensitiveMatch = Object.entries(LEAGUE_MAP).find(([key]) => 
        clean.includes(key.toLowerCase().replace(/[^a-z0-9]/g, ' '))
    );
    if (caseInsensitiveMatch) return caseInsensitiveMatch[1];
    
    // Fallback to generic
    return { name: fullName.replace("Esoccer ", "").replace("E-Soccer - ", "").toUpperCase(), color: "#10B981", image: "https://football.esportsbattle.com/favicon.ico" };
};

export const ALLOWED_LEAGUES = [
    "GT LEAGUES", "BATTLE - 8 MIN", "BATTLE - 12 MIN", "VOLTA", "H2H GG LEAGUE",
    "ADRIATIC", "VALHALLA CUP", "VALKYRIE CUP", "CLA LEAGUE", "CHAMPIONS",
    "E-SOCCER", "SOCCER", "FIFA"
];

// Mapeamento de nomes da API de Histórico (Inglês) para a API Live (Português)
const LEAGUE_NAME_MAPPING: Record<string, string> = {
    "Esoccer Battle - 8 mins play": "E-Soccer - Battle - 8 minutos de jogo",
    "Esoccer Battle Volta - 6 mins play": "E-Soccer - Battle Volta - 6 minutos de jogo",
    "Esoccer GT Leagues – 12 mins play": "E-Soccer - GT Leagues - 12 minutos de jogo",
    "Esoccer H2H GG League - 8 mins play": "E-Soccer - H2H GG League - 8 minutos de jogo",
    "Esoccer Adriatic League - 10 mins play": "E-Soccer - Adriatic League - 10 minutos de jogo",
    // SensorFIFA Mappings
    "Battle 8m": "E-Soccer - Battle - 8 minutos de jogo",
    "Battle 6m": "E-Soccer - Battle Volta - 6 minutos de jogo",
    "GT League": "E-Soccer - GT Leagues - 12 minutos de jogo",
    "H2H 8m": "E-Soccer - H2H GG League - 8 minutos de jogo",
    "H2H 8 MIN": "E-Soccer - H2H GG League - 8 minutos de jogo",
    "Champions League": "Champions League",
    "Valhalla Cup": "Valhalla",
    "Valkyrie Cup": "Valkyrie",
    "Adriatic League": "Esoccer Adriatic League"
};

// === DATA NORMALIZATION ===
// Converts API response format (FinishedGame) to internal format (HistoryMatch)
export const normalizeHistoryData = (apiData: any): HistoryMatch[] => {
    if (!apiData) return [];
    
    // Helper function to extract player name from "Team (PlayerName)" format
    const extractPlayerName = (str: string): string => {
        if (!str) return "";
        const parenMatch = str.match(/(.*?)\((.*?)\)/);
        if (parenMatch) {
            const part1 = parenMatch[1].trim();
            const part2 = parenMatch[2].trim();
            const isPart1Caps = /^[A-Z0-9\s]+$/.test(part1) && part1.length > 1;
            const isPart2Caps = /^[A-Z0-9\s]+$/.test(part2) && part2.length > 1;
            if (isPart2Caps && !isPart1Caps) return part2;
            if (isPart1Caps && !isPart2Caps) return part1;
            const commonTeams = [
                'Spain', 'France', 'Germany', 'Italy', 'Brazil', 'Argentina', 'Portugal', 'Netherlands', 'England', 'Belgium',
                'Real Madrid', 'Barcelona', 'FC Bayern', 'Man City', 'Man Utd', 'Liverpool', 'PSG', 'Juventus', 'Arsenal', 'Chelsea',
                'Borussia Dortmund', 'Bayer Leverkusen', 'Napoli', 'AC Milan', 'Inter', 'Inter de Milão', 'Atletico Madrid', 'Sevilla',
                'Piemonte Calcio', 'Latium', 'Genoa', 'Roma', 'RB Leipzig', 'Real Sociedad', 'Athletic Club', 'Aston Villa', 'Spurs',
                'PAOK', 'Benfica', 'Sporting', 'Porto', 'Ajax', 'Bayern de Munique', 'Bayer de Munique', 'Inglaterra', 'França', 'Espanha',
                'Alemanha', 'Itália', 'Argentina', 'Holanda', 'Bélgica', 'Suíça', 'Escócia', 'Áustria', 'Grécia', 'Turquia'
            ];
            if (commonTeams.some(t => part1.includes(t))) return part2;
            if (commonTeams.some(t => part2.includes(t))) return part1;
            return part2;
        }
        return str.trim();
    };
    
    // Handle different API response structures
    let games: any[] = [];
    if (Array.isArray(apiData)) {
        games = apiData;
    } else if (apiData.value) {
        games = Array.isArray(apiData.value) ? apiData.value : [];
    } else if (apiData.results) {
        games = apiData.results;
    } else if (apiData.data?.results) {
        games = apiData.data.results;
    } else if (apiData.data) {
        games = Array.isArray(apiData.data) ? apiData.data : [];
    }
    
    // Convert each game to HistoryMatch format
    return games.map((game: any): HistoryMatch => {
        // Support for new API (nick/raw) and legacy formats
        const home_player_source = game.home_nick || game.home_raw || game.home?.name || game.homeTeam || game.home_player || game.player_home_name || game.player_name_1 || '';
        const away_player_source = game.away_nick || game.away_raw || game.away?.name || game.awayTeam || game.away_player || game.player_away_name || game.player_name_2 || '';
        
        const home_player = extractPlayerName(home_player_source);
        const away_player = extractPlayerName(away_player_source);
        
        const rawLeague = game.league_mapped || game.competition?.name || game.competitionName || game.league || game.league_name || '';
        const mappedLeague = LEAGUE_NAME_MAPPING[rawLeague] || rawLeague;

        // Construct Date (including finished_at from new API)
        let dateStr = game.finished_at || game.eventDate || game.startTime || game.matchTime || game.time || game.data_realizacao;
        if (!dateStr && game.match_date && game.match_time) {
            dateStr = `${game.match_date}T${game.match_time}`;
        }
        if (!dateStr) dateStr = new Date().toISOString();

        // Standardize: Use raw string, let browser handle local vs offset
        let finalDate = String(dateStr).trim();

        return {
            home_player: home_player,
            away_player: away_player,
            league_name: mappedLeague,
            score_home: Number(game.home_score_ft ?? game.home?.score ?? game.score?.home ?? game.homeFT ?? game.total_goals_home ?? game.score_home ?? 0),
            score_away: Number(game.away_score_ft ?? game.away?.score ?? game.score?.away ?? game.awayFT ?? game.total_goals_away ?? game.score_away ?? 0),
            halftime_score_home: Number(game.home_score_ht ?? game.scoreHT?.home ?? game.homeHT ?? game.home_score_ht ?? game.ht_goals_home ?? game.halftime_score_home ?? 0),
            halftime_score_away: Number(game.away_score_ht ?? game.scoreHT?.away ?? game.awayHT ?? game.away_score_ht ?? game.ht_goals_away ?? game.halftime_score_away ?? 0),
            data_realizacao: finalDate,
            home_team: game.home_raw?.replace(/\(.*?\)/, '').trim() || game.home?.teamName || game.homeClub || game.home_team || game.player_home_team_name || '',
            away_team: game.away_raw?.replace(/\(.*?\)/, '').trim() || game.away?.teamName || game.awayClub || game.away_team || game.player_away_team_name || '',
            home_team_logo: game.home?.imageUrl || game.home_team_logo || game.homeTeamLogo || '',
            away_team_logo: game.away?.imageUrl || game.away_team_logo || game.awayTeamLogo || ''
        };
    });
};

// === MÉTRICAS RECENTES DO JOGADOR (CORRIGIDA PARA ACEITAR QUALQUER FORMATO) ===
const calculateRecentMetrics = (playerName: string, gamesData: any, limit: number = 5) => {
  // Normalize API data first
  const games = normalizeHistoryData(gamesData);

  if (!games || games.length === 0) {
    return null;
  }

  const targetName = normalize(playerName);
  const playerGames = games
    .filter(g => normalize(g.home_player) === targetName || normalize(g.away_player) === targetName)
    .sort((a, b) => {
      const parseTime = (dateStr: string | number) => {
        if (!dateStr) return 0;
        const s = String(dateStr);
        // data_realizacao is already standardized by normalizeHistoryData
        return new Date(s).getTime() || 0;
      };
      return parseTime(b.data_realizacao) - parseTime(a.data_realizacao);
    })
    .slice(0, limit);

  const sample = playerGames;
  if (sample.length < 3) return null;

  let wins = 0, draws = 0, goalsHT = 0, goalsFT = 0, goalsConcededFT = 0, goalsConcededHT = 0;
  let over05HT = 0, over15HT = 0, over25HT = 0, over25FT = 0, over35FT = 0, bttsHT = 0, bttsFT = 0;

  sample.forEach(g => {
    const isHome = normalize(g.home_player) === targetName;
    const pFT = Number(isHome ? g.score_home || 0 : g.score_away || 0);
    const oFT = Number(isHome ? g.score_away || 0 : g.score_home || 0);
    const pHT = Number(isHome ? g.halftime_score_home || 0 : g.halftime_score_away || 0);
    const oHT = Number(isHome ? g.halftime_score_away || 0 : g.halftime_score_home || 0);
    
    if (pFT > oFT) wins++;
    else if (pFT === oFT) draws++;

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

  const last3Results: string[] = sample.slice(0, 3).map(g => {
    const isHome = normalize(g.home_player) === targetName;
    const pFT = Number(isHome ? g.score_home || 0 : g.score_away || 0);
    const oFT = Number(isHome ? g.score_away || 0 : g.score_home || 0);
    return pFT > oFT ? 'W' : pFT === oFT ? 'D' : 'L';
  });

  return {
    winRate: (wins / sample.length) * 100,
    drawRate: (draws / sample.length) * 100,
    avgGoalsHT: goalsHT / sample.length,
    avgGoalsFT: goalsFT / sample.length,
    avgGoalsConcededHT: goalsConcededHT / sample.length,
    avgGoalsConcededFT: goalsConcededFT / sample.length,
    over05HT: (over05HT / sample.length) * 100,
    over15HT: (over15HT / sample.length) * 100,
    over25HT: (over25HT / sample.length) * 100,
    over25FT: (over25FT / sample.length) * 100,
    over35FT: (over35FT / sample.length) * 100,
    bttsHT: (bttsHT / sample.length) * 100,
    bttsFT: (bttsFT / sample.length) * 100,
    last3Results
  };
};

// === PROBABILIDADE DE MÉTRICA ===
export const calculateMetricProbability = (playerName: string, gamesData: any, metric: string, isHT: boolean = false, limit: number = 5): number => {
  // Normalize API data first
  const games = normalizeHistoryData(gamesData);

  if (!games || games.length === 0) return 0;

  const targetName = normalize(playerName);
  const playerGames = games
    .filter(g => normalize(g.home_player) === targetName || normalize(g.away_player) === targetName)
    .sort((a, b) => {
      const parseTime = (dateStr: string | number) => {
        if (!dateStr) return 0;
        const s = String(dateStr);
        // data_realizacao is already standardized by normalizeHistoryData
        return new Date(s).getTime() || 0;
      };
      return parseTime(b.data_realizacao) - parseTime(a.data_realizacao);
    })
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
  // Normalize API data first
  const allGames = normalizeHistoryData(historyData);

  if (!allGames || allGames.length === 0) {
    return [];
  }

  const leaguesMap = new Map<string, HistoryMatch[]>();
  allGames.forEach(g => {
    const info = getLeagueInfo(g.league_name || 'Unknown League');
    const normalizedName = info.name;
    
    // Only process allowed leagues
    if (!ALLOWED_LEAGUES.includes(normalizedName)) return;
    
    if (!leaguesMap.has(normalizedName)) leaguesMap.set(normalizedName, []);
    leaguesMap.get(normalizedName)!.push(g);
  });
  
  const stats: LeagueStats[] = [];
  leaguesMap.forEach((games, leagueName) => {
    const sortedGames = [...games].sort((a, b) => {
      const parseTime = (dateStr: string | number) => {
        if (!dateStr) return 0;
        const s = String(dateStr);
        // data_realizacao is already standardized by normalizeHistoryData
        return new Date(s).getTime() || 0;
      };
      return parseTime(b.data_realizacao) - parseTime(a.data_realizacao);
    });
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
    
    let temp: 'hot' | 'ht_pro' | 'ft_pro' | 'normal' | 'warm' | 'cold' = 'normal';
    
    const htAvg = (metrics.ht05 + metrics.ht15 + metrics.ht25 + metrics.htBtts) / 4;
    const ftAvg = (metrics.ft15 + metrics.ft25 + metrics.ft35 + metrics.ftBtts) / 4;

    const isHtPro = htAvg >= 85 && metrics.ht0x0 === 0;
    const isFtPro = ftAvg >= 85 && metrics.ft0x0 === 0;

    if (htAvg >= 85 && metrics.ht0x0 === 0 && ftAvg >= 85 && metrics.ft0x0 === 0) {
      temp = 'hot';
    } else if (htAvg >= 85 && metrics.ht0x0 === 0 && (ftAvg < 85 || metrics.ft0x0 > 15)) {
      temp = 'ht_pro';
    } else if (ftAvg >= 85 && metrics.ft0x0 === 0 && (htAvg < 85 || metrics.ht0x0 > 15)) {
      temp = 'ft_pro';
    } else if (metrics.ft25 >= 60 || metrics.ht05 >= 80) {
      temp = 'warm';
    } else if (metrics.ft15 < 50) {
      temp = 'cold';
    }
    
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
  // Normalize API data first
  const games = normalizeHistoryData(gamesData);

  const targetName = normalize(playerName);
  const playerGames = games
    .filter(g => normalize(g.home_player) === targetName || normalize(g.away_player) === targetName)
    .sort((a, b) => {
      const parseTime = (dateStr: string | number) => {
        if (!dateStr) return 0;
        const s = String(dateStr);
        // data_realizacao is already standardized by normalizeHistoryData
        return new Date(s).getTime() || 0;
      };
      return parseTime(b.data_realizacao) - parseTime(a.data_realizacao);
    });
  
  if (playerGames.length === 0) {
    return {
      name: playerName, matchesPlayed: 0, wins: 0, draws: 0, losses: 0,
      avgGoalsScoredHT: 0, avgGoalsScoredFT: 0, avgGoalsConceded: 0, winRate: 0, drawRate: 0,
      last5: [], lastMatches: [], htOver05Rate: 0, htOver15Rate: 0, htOver25Rate: 0, htBttsRate: 0,
      ht0x0Rate: 0, ft15Rate: 0, ftOver25Rate: 0, ft35Rate: 0, ftBttsRate: 0, ft0x0Rate: 0
    };
  }

  const sampleLimit = Math.min(limit, playerGames.length);
  const recentSample = playerGames.slice(0, sampleLimit);
  
  let goalsHT = 0, goalsFT = 0, concededFT = 0, wins = 0, draws = 0;
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
    else if (pFT === oFT) draws++;
  });

  return {
    name: playerName,
    matchesPlayed: playerGames.length,
    wins, draws: 0, losses: recentSample.length - wins,
    avgGoalsScoredHT: goalsHT / recentSample.length,
    avgGoalsScoredFT: goalsFT / recentSample.length,
    avgGoalsConceded: concededFT / recentSample.length,
    winRate: (wins / recentSample.length) * 100,
    drawRate: (draws / recentSample.length) * 100,
    last5: last5,
    lastMatches: lastMatches,
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
// === CÁLCULO DE CONFIDENCE (NOVO PLANO 4 FATORES) ===
const calculateConfidence = (playerName: string, games: HistoryMatch[], stats: any, playerLimit: number = 5) => {
    let score = 0;
    const targetName = normalize(playerName);
    const lastGames = games
        .filter(g => normalize(g.home_player) === targetName || normalize(g.away_player) === targetName)
        .slice(0, playerLimit);

    if (lastGames.length < 3) return { score: 0, cooling: false };

    // 1️⃣ Consistência (40 pontos) - Desvio Padrão
    const goalsList = lastGames.map(g => {
        const isHome = normalize(g.home_player) === targetName;
        return Number(isHome ? g.score_home : g.score_away);
    });

    const mean = goalsList.reduce((a, b) => a + b, 0) / goalsList.length;
    const variance = goalsList.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / goalsList.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev <= 0.5) score += 40;
    else if (stdDev <= 1.0) score += 30;
    else if (stdDev <= 1.5) score += 20;
    else if (stdDev <= 2.0) score += 10;

    // 2️⃣ Média de Gols (30 pontos)
    const avg = stats.avgGoalsFT;
    if (avg >= 3.5) score += 30;
    else if (avg >= 3.0) score += 25;
    else if (avg >= 2.5) score += 20;
    else if (avg >= 2.0) score += 15;
    else if (avg >= 1.5) score += 10;

    // 3️⃣ Regime/Tendência (20 pontos)
    // HEATING (últimos 3 jogos > jogos anteriores)
    const last3 = goalsList.slice(0, 3);
    const prevGames = goalsList.slice(3);
    const avgLast3 = last3.reduce((a, b) => a + b, 0) / (last3.length || 1);
    const avgPrev = prevGames.length > 0 ? prevGames.reduce((a, b) => a + b, 0) / prevGames.length : avgLast3;

    if (avgLast3 > avgPrev) score += 20; // HEATING 🔥
    else if (avgLast3 === avgPrev) score += 10; // STABLE ❄️

    // 4️⃣ Consistência no HT (10 pontos)
    const htRate = stats.over05HT;
    if (htRate >= 100) score += 10;
    else if (htRate >= 80) score += 7;
    else if (htRate >= 60) score += 5;
    else if (htRate >= 40) score += 3;

    return { score, cooling: avgLast3 < avgPrev };
};

// === ANÁLISE DE POTENCIAL DO JOGO ===
export interface AnalysisResult {
  key: string;
  confidence: number;
  reasons: string[];
}

export const analyzeMatchPotential = (p1Name: string, p2Name: string, gamesData: any, leagueName: string = ''): AnalysisResult => {
  // Normalize API data first
  const games = normalizeHistoryData(gamesData);

  const none = { key: 'none', confidence: 0, reasons: [] };
  if (!games || games.length === 0) return none;

  // --- Salvaguarda por Liga ---
  if (leagueName) {
    const targetLeagueInfo = getLeagueInfo(leagueName);
    const normalizedTargetName = targetLeagueInfo.name;
    
    const leagueGames = games.filter(g => {
        const gInfo = getLeagueInfo(g.league_name);
        return gInfo.name === normalizedTargetName;
    });

    if (leagueGames.length >= 10) {
      const sample = leagueGames.slice(0, 15);
      const uHT = (sample.filter(g => Number(g.halftime_score_home || 0) === 0 && Number(g.halftime_score_away || 0) === 0).length / sample.length) * 100;
      const uFT = (sample.filter(g => Number(g.score_home || 0) === 0 && Number(g.score_away || 0) === 0).length / sample.length) * 100;
      const o25 = (sample.filter(g => (Number(g.score_home || 0) + Number(g.score_away || 0)) > 2.5).length / sample.length) * 100;

      if (uHT > 35 || uFT > 25 || o25 < 45) return none; 
    }
  }

  const p1 = calculateRecentMetrics(p1Name, games, 5);
  const p2 = calculateRecentMetrics(p2Name, games, 5);
  
  if (!p1 || !p2) return none;

  // Validação de Amostra Mínima
  if (p1.last3Results.length < 3 || p2.last3Results.length < 3) return none;

  const conf1 = calculateConfidence(p1Name, games, p1, 5);
  const conf2 = calculateConfidence(p2Name, games, p2, 5);

  // BLOQUEIO COOLING (Opcional conforme plano)
  // if (conf1.cooling || conf2.cooling) return none;

  let resultKey = 'none';
  const reasons: string[] = [];

  // Estratégias
  if (p1.over15HT === 100 && p1.over25HT >= 88 && p1.avgGoalsHT >= 1.5 && p2.avgGoalsHT >= 1.5 && p1.over25FT <= 75) {
      resultKey = 'ht_pro';
  }
  else if (p1.over25FT === 100 && p1.over35FT >= 88 && p1.avgGoalsFT >= 2.5 && p2.avgGoalsFT >= 2.5 && p1.over25HT <= 60) {
      resultKey = 'ft_pro';
  }
  else if (p1.bttsHT === 100 && p1.avgGoalsHT >= 1.8 && p2.avgGoalsHT >= 1.8 && p1.over25HT <= 60) {
      resultKey = 'btts_pro_ht';
  }
  else if (p1.bttsFT === 100 && p1.avgGoalsFT >= 2.0 && p2.avgGoalsFT >= 2.0 && p1.over25FT <= 88) {
      resultKey = 'btts_pro_ft';
  }
  else if (p1.winRate >= 70 && p2.winRate <= 20) resultKey = 'casa_pro';
  else if (p2.winRate >= 70 && p1.winRate <= 20) resultKey = 'fora_pro';
  else if (p1.avgGoalsHT >= 2.5 && p1.avgGoalsFT >= 3.7 && p2.avgGoalsHT <= 0.7 && p2.avgGoalsFT <= 1.7) resultKey = 'casa_engine_pro';
  else if (p2.avgGoalsHT >= 2.5 && p2.avgGoalsFT >= 3.7 && p1.avgGoalsHT <= 0.7 && p1.avgGoalsFT <= 1.7) resultKey = 'fora_engine_pro';
  else if (p1.winRate >= 60 && p2.winRate >= 60 && p1.drawRate <= 25 && p2.drawRate <= 25) {
    resultKey = 'top_clash';
  }

  if (resultKey === 'none') return none;

  // Confidence final baseada na média dos dois jogadores
  let finalConfidence = (conf1.score + conf2.score) / 2;

  // Ajuste por H2H (Bonus)
  const h2h = getH2HStats(p1Name, p2Name, games);
  if (h2h.count >= 2) {
    if (resultKey.includes('casa') && h2h.p1WinProb >= 60) {
        finalConfidence += 10;
        reasons.push("H2H amplamente favorável ao mandante");
    }
    if (resultKey === 'ht_pro' && h2h.p1AvgGoalsHT + h2h.p2AvgGoalsHT >= 1.5) {
        finalConfidence += 10;
        reasons.push("H2H com alta média de gols no HT");
    }
  }

  return {
    key: resultKey,
    confidence: Math.min(finalConfidence, 100),
    reasons
  };
};

// === ESTATÍSTICAS H2H ===
export const getH2HStats = (p1: string, p2: string, gamesData: any) => {
  // Normalize API data first
  const games = normalizeHistoryData(gamesData);

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
    case 'btts_pro_ft': return Number(match.score_home) > 0 && Number(match.score_away) > 0;
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
    
    if (potential !== 'none' && analysis.confidence >= 85) {
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
