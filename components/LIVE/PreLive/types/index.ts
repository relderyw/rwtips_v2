
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
  isWorldCup?: boolean; 
}

export interface PreGameStat {
  id: number;
  name: string;
  competitorId: number;
  value: string;
  valuePercentage?: number;
  statisticGroup?: number;
  bettingOpportunity?: {
    gameId?: number;
    lineId?: number;
    text: string;
    textCTA?: string;
    link: string;
    bookmakerId?: number;
  };
}

export interface ApiResponse {
  games: Game[];
  competitions: Competition[];
  competitors: Competitor[];
  countries: any[];
}

export type ViewType = 'LIVE' | 'PRE_LIVE' | 'FINISHED';

// Betting / Odds Types
export interface LineType {
    id: number;
    name: string;
    shortName: string;
    title: string;
    transValid?: boolean;
}

export interface LineOption {
    num: number;
    name: string;
    rate: {
        decimal: number;
        fractional: string;
        american: string;
    };
    bookmakerId: number;
    trend?: number; // 1=down, 2=same?, 3=up (assumption based on colors)
    lead?: number; // for asian handicap
}

export interface BettingLine {
    lineId: number;
    gameId: number;
    bookmakerId: number;
    lineTypeId: number;
    lineType: LineType;
    options: LineOption[];
    internalOption?: string; // e.g. "2.5 Goals"
}
