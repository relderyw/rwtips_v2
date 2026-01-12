
export interface Team {
  name: string;
  shortName: string;
  seoIdentifier: string;
  score: number | null;
  record: string;
  hasWon?: boolean;
}

export interface GameEvent {
  eventId: string;
  top: Team;
  bottom: Team;
  status: string;
  dateET: string;
  venue?: string;
  bettingData?: {
    line: string;
    total: string;
  };
}

export interface SeasonStats {
  pointsForPerGame: string;
  pointsAgainstPerGame: string;
  fieldGoalsPercentage: string;
  freeThrowsPercentage: string;
  threePointPercentage: string;
  reboundsPerGame: string;
  assistsPerGame: string;
  blocksPerGame: string;
  stealsPerGame: string;
  turnoverPerGame: string;
}

export interface Player {
  displayName: string;
  positionShort: string;
}

export interface PlayerStatEntry {
  player: Player;
  stats: Record<string, string>;
}

export interface Projections {
  total: number;
  spread: string;
  homeProb: number;
  awayProb: number;
  homePts: string;
  awayPts: string;
  confidence: 'Low' | 'Medium' | 'High';
}

export interface GameIntelligence {
  eventId: string;
  intelligenceScore: number; // 0-100
  overUnderProbability: number; // % probability of being Over
  confidence: 'Low' | 'Medium' | 'High';
  trends: {
    recentOverUnder: string; // e.g., "4/5 Over"
    teamPace: 'Fast' | 'Medium' | 'Slow';
    playerHotStreak: boolean;
    volumeIndicator: number; // Expected total points
  };
  reasons: string[]; // Main reasons for the recommendation
  recommendation: 'OVER' | 'UNDER' | 'SKIP';
  detailedAnalysis: {
    awayTeamTrend: {
      overCount: number;
      underCount: number;
      avgTotal: number;
    };
    homeTeamTrend: {
      overCount: number;
      underCount: number;
      avgTotal: number;
    };
    paceScore: number;
    h2hPattern?: string;
  };
}
