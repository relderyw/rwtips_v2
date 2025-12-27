
export interface HistoryMatch {
  home_player: string;
  away_player: string;
  league_name: string;
  score_home: number;
  score_away: number;
  halftime_score_home: number;
  halftime_score_away: number;
  data_realizacao: string;
  home_team?: string;
  away_team?: string;
}

export interface FinishedGame {
  id: number;
  player_home_name: string;
  player_away_name: string;
  player_home_team_name: string;
  player_away_team_name: string;
  total_goals_home: number;
  total_goals_away: number;
  ht_goals_home: number;
  ht_goals_away: number;
  total_goals: number;
  time: string;
  league_name: string;
  player_id_win: number | null;
  scored_order: string;
}

export interface LiveEvent {
  id: string;
  leagueName: string;
  eventName: string;
  stage: string;
  timer: {
    minute: number;
    second: number;
    formatted: string;
  };
  score: {
    home: number;
    away: number;
  };
  homePlayer: string;
  awayPlayer: string;
  homeTeamName: string;
  awayTeamName: string;
  isLive: boolean;
  bet365EventId?: string;
}

export interface PlayerStats {
  name: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  avgGoalsScoredHT: number;
  avgGoalsScoredFT: number;
  avgGoalsConceded: number;
  winRate: number;
  last5: string[];
  htOver05Rate: number;
  ftOver25Rate: number;
  htOver15Rate: number;
  htOver25Rate: number;
  htBttsRate: number;
  ft15Rate: number;
  ft35Rate: number;
  ftBttsRate: number;
  ht0x0Rate: number;
  ft0x0Rate: number;
}

export interface LeagueStats {
  leagueName: string;
  last5Games: HistoryMatch[];
  sampleGames: HistoryMatch[]; // Adicionado para visualização dinâmica
  metrics: {
    ht05: number;
    ht15: number;
    ht25: number;
    htBtts: number;
    ht0x0: number;
    ft15: number;
    ft25: number;
    ft35: number;
    ftBtts: number;
    ft0x0: number;
  };
  temperature: 'hot' | 'warm' | 'cold';
}

export interface Prediction {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  suggestedBet: string;
  reasoning: string;
}
