
import { GameEvent } from '../types';

const PROXY_URL = 'https://api.codetabs.com/v1/proxy?quest=';
const BASE_STATS_URL = 'https://stats.sports.bellmedia.ca/sports/basketball/leagues/nba';
const BASE_SCHEDULE_URL = 'https://next-gen.sports.bellmedia.ca/v2/schedule/sports/basketball/leagues/nba';

class NBADataService {
  private cache: Map<string, { data: any; expiry: number }> = new Map();

  private async fetchWithProxy(url: string, ttl: number = 60000) {
    if (this.cache.has(url)) {
      const cached = this.cache.get(url)!;
      if (Date.now() < cached.expiry) return cached.data;
    }

    try {
      const response = await fetch(`${PROXY_URL}${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      this.cache.set(url, { data, expiry: Date.now() + ttl });
      return data;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  async getAvailableDates(): Promise<string[]> {
    const url = `${BASE_STATS_URL}/scheduleV2/subset/dates?brand=tsn&type=json`;
    const data = await this.fetchWithProxy(url, 3600000);
    return Object.keys(data).sort().reverse();
  }

  async getScheduleForDate(date: string): Promise<GameEvent[]> {
    const url = `${BASE_STATS_URL}/scheduleV2/subset/dates?brand=tsn&type=json&dateOrId=${date}`;
    const data = await this.fetchWithProxy(url, 30000);
    return (data[date]?.events || []).map((e: any) => ({
      eventId: e.eventId,
      ...e.event
    }));
  }

  async getFinishedGames(date: string): Promise<GameEvent[]> {
    const url = `${BASE_SCHEDULE_URL}?brand=tsn&lang=en&grouping=${date}&season=2025`;
    const data = await this.fetchWithProxy(url, 300000);
    return (data[date] || []).map((e: any) => ({
      eventId: e.eventId,
      ...e.event
    }));
  }

  async getEventStats(eventId: string) {
    const url = `${BASE_STATS_URL}/event/${eventId}/stats?brand=tsn&type=json`;
    return this.fetchWithProxy(url, 60000);
  }

  async getSeasonStats(eventId: string) {
    const url = `${BASE_STATS_URL}/event/${eventId}/competitorSeasonStats?brand=tsn&type=json`;
    return this.fetchWithProxy(url, 3600000);
  }

  async getPlayerStats(eventId: string) {
    const url = `${BASE_STATS_URL}/event/${eventId}/playerSeasonStats?nbPlayersToShow=10&brand=tsn&qualifiedOnly=true&type=json&seasonType=regular_season`;
    return this.fetchWithProxy(url, 3600000);
  }

  async getInjuries() {
    const url = `${BASE_STATS_URL}/playerInjuries?brand=tsn&type=json`;
    return this.fetchWithProxy(url, 300000);
  }
}

export const nbaDataService = new NBADataService();
