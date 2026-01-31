
export interface Competitor {
  id: number;
  countryId?: number;
  name: string;
  score: number;
  imageVersion: number;
  isWinner?: boolean;
  color?: string;
}

export interface Game {
  id: number;
  startTime: string;
  statusGroup: number;
  statusText: string;
  gameTimeDisplay: string;
  competitionId: number;
  competitionDisplayName: string;
  homeCompetitor: Competitor;
  awayCompetitor: Competitor;
  odds?: any;
}

export interface Competition {
  id: number;
  name: string;
  imageVersion: number;
  countryId: number;
  isWorldCup?: boolean; // Added optional just in case
}

export interface PreGameStat {
  id: number;
  name: string;
  competitorId: number;
  value: string;
  valuePercentage?: number;
  statisticGroup?: number; // Added to match usage in AnalysisView
  bettingOpportunity?: {
    text: string;
    textCTA: string;
    link: string;
  };
}

export interface ApiResponse {
  games: Game[];
  competitions: Competition[];
  competitors: Competitor[];
  countries: any[];
}

export type ViewType = 'LIVE' | 'PRE_LIVE' | 'FINISHED';
