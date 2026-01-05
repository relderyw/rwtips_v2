
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
  drawRate: number;
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
  temperature: 'hot' | 'ht_pro' | 'ft_pro' | 'normal' | 'warm' | 'cold';
}

export interface Prediction {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  suggestedBet: string;
  reasoning: string;
}

export interface NBAGame {
  id: string;
  dateET: string;
  homeTeam: {
    name: string;
    shortName: string;
    nameCode: string;
    id: number;
  };
  awayTeam: {
    name: string;
    shortName: string;
    nameCode: string;
    id: number;
  };
  homeScore?: number;
  awayScore?: number;
  status: string;
  homeRecord?: string;
  awayRecord?: string;
}

export interface NBATeamStats {
  pointsForPerGame: number;
  pointsAgainstPerGame: number;
  fieldGoalsPercentage: number;
  freeThrowsPercentage: number;
  threePointPercentage: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  blocksPerGame: number;
  stealsPerGame: number;
  turnoverPerGame: number;
}

export interface NBAInjury {
  playerName: string;
  position: string;
  description: string;
  status: 'OUT' | 'QUESTIONABLE' | 'PROBABLE';
}

export interface NBALeader {
  category: string;
  players: {
    name: string;
    position: string;
    value: number;
    seoId: string;
  }[];
}

export interface NBAProProjection {
  total: number;
  spread: string;
  homeProb: number;
  awayProb: number;
  homePts: string;
  awayPts: string;
  confidence: 'high' | 'medium' | 'low';
}

// ============================================
// NBA INTELLIGENT SCORING SYSTEM
// ============================================

export interface NBARecentForm {
  wins: number;
  losses: number;
  avgPointsScored: number;
  avgPointsAllowed: number;
  overUnder: {
    over: number;
    under: number;
  };
  last5Results: ('W' | 'L')[];
  streak: {
    type: 'W' | 'L';
    count: number;
  };
}

export interface NBABettingAlert {
  type: 'injury' | 'value' | 'pace' | 'rest' | 'streak' | 'mismatch';
  severity: 'high' | 'medium' | 'low';
  message: string;
  impact: string;
}

export interface NBAGameEdge {
  betType: 'spread' | 'total' | 'moneyline';
  suggestedBet: string;
  edge: number; // Percentage edge
  confidence: number; // 0-100
  reasoning: string[];
}

export interface NBAOpportunityScore {
  total: number; // 0-100
  breakdown: {
    spreadAnalysis: number; // 0-20
    totalConsistency: number; // 0-20
    recentForm: number; // 0-20
    injuryImpact: number; // 0-20
    restAdvantage: number; // 0-10
    paceMatch: number; // 0-10
  };
  category: 'hot' | 'value' | 'caution';
  bestBet: NBAGameEdge;
  alerts: NBABettingAlert[];
}

export interface NBAEnhancedGame extends NBAGame {
  opportunityScore?: NBAOpportunityScore;
  recentForm?: {
    home: NBARecentForm;
    away: NBARecentForm;
  };
}
