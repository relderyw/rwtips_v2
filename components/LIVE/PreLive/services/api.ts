
import { ApiResponse, Game, Competition, Competitor } from '../types';

const STATS_HUB_API = '/api/statshub';

export async function fetchFixtures(date: string): Promise<ApiResponse> {
  // Convert date string (DD/MM/YYYY) to timestamp
  const [day, month, year] = date.split('/').map(Number);
  const selectedDate = new Date(year, month - 1, day);
  selectedDate.setHours(0, 0, 0, 0);
  const startOfDay = Math.floor(selectedDate.getTime() / 1000);
  
  const endOfDayDate = new Date(selectedDate);
  endOfDayDate.setHours(23, 59, 59, 999);
  const endOfDay = Math.floor(endOfDayDate.getTime() / 1000);

  const response = await fetch(`${STATS_HUB_API}/event/by-date?startOfDay=${startOfDay}&endOfDay=${endOfDay}`);
  if (!response.ok) throw new Error(`StatsHub API Error: ${response.status}`);
  
  const rawData = await response.json();
  const data = rawData.data || [];

  // Transform to existing ApiResponse format
  const games: Game[] = data.map((item: any) => ({
    id: item.events.id,
    startTime: new Date(item.events.timeStartTimestamp * 1000).toISOString(),
    statusGroup: item.events.status === 'notstarted' ? 1 : (item.events.status === 'finished' ? 4 : 3),
    statusText: item.events.status,
    gameTimeDisplay: new Date(item.events.timeStartTimestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    competitionId: item.tournaments.id,
    competitionDisplayName: item.tournaments.name,
    homeCompetitor: {
      id: item.homeTeam.id,
      name: item.homeTeam.name,
      score: item.events.homeScoreCurrent || 0,
      imageVersion: 1
    },
    awayCompetitor: {
      id: item.awayTeam.id,
      name: item.awayTeam.name,
      score: item.events.awayScoreCurrent || 0,
      imageVersion: 1
    }
  }));

  const competitions: Competition[] = Array.from(new Set(data.map((item: any) => JSON.stringify(item.tournaments)))).map((s: any) => {
    const t = JSON.parse(s);
    return {
      id: t.id,
      name: t.name,
      imageVersion: 1,
      countryId: 1
    };
  });

  return {
    games,
    competitions,
    competitors: [],
    countries: []
  };
}

export async function fetchPreGameStats(gameId: number) {
  // StatsHub doesn't have a direct "preGame" equivalent in the same format
  // We'll return an empty structure and use detailed statistics instead
  return { statistics: [] };
}

const statisticKeyMap: Record<string, string> = {
    goals: "goals",
    corners: "cornerKicks",
    cards: "cards"
};

const eventHalfMap: Record<string, string> = {
    fullTime: "ALL",
    firstHalf: "1ST",
    secondHalf: "2ND"
};

export async function fetchMatchHistory(
    teamId: number, 
    tournamentId?: number, 
    numberOfMatches: number = 10,
    statisticType: string = 'goals',
    timePeriod: string = 'fullTime'
) {
    const statKey = statisticKeyMap[statisticType as keyof typeof statisticKeyMap] || "goals";
    const half = eventHalfMap[timePeriod as keyof typeof eventHalfMap] || "ALL";
    
    // We use event-statistics because it pre-calculates the stats for the given period
    const url = new URL(`${window.location.origin}${STATS_HUB_API}/team/${teamId}/event-statistics`);
    url.searchParams.set("eventType", "all");
    url.searchParams.set("statisticKey", statKey);
    url.searchParams.set("eventHalf", half);
    url.searchParams.set("limit", String(numberOfMatches));
    
    // Default to NOT filtering by tournament to get more data, unless specified
    if (tournamentId) {
        // url.searchParams.set("tournamentIds", String(tournamentId));
    }

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`History API Error: ${response.status}`);
    return response.json();
}

export function getCompetitorLogo(id: number) {
  return `https://pcvvirceciavsxxfinvv.supabase.co/storage/v1/object/public/images/team/${id}.png`;
}

export function getCountryLogo(id: number) {
  return `https://pcvvirceciavsxxfinvv.supabase.co/storage/v1/object/public/images/unique-tournament/${id}.png`;
}

export async function fetchBettingLines(gameId: number) {
    // Mock or implement if StatsHub has betting lines
    return { data: [] };
}
