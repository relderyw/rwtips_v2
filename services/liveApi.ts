const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function fetchJson<T>(endpoint: string, options: RequestInit = {}, timeoutMs = 30000): Promise<T> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(endpoint, {
            ...options,
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                ...(options.headers || {})
            }
        });
        clearTimeout(id);

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`Error ${response.status}: ${text}`);
        }

        return await response.json();
    } catch (error) {
        clearTimeout(id);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
}

export interface LiveScore {
    fixtureId: number;
    leagueName: string;
    countryName: string;
    countryImagePath?: string;
    localTeamName: string;
    visitorTeamName: string;
    localTeamFlag?: string;
    visitorTeamFlag?: string;
    scoresLocalTeam?: number;
    scoresVisitorTeam?: number;
    homeTeam?: { name: string; score: number };
    awayTeam?: { name: string; score: number };
    status: string;
    time: string;
    minute?: number;
    timeline?: any;
    events?: any;
    [key: string]: any;
}

export const liveApi = {
    getLiveScores: () => fetchJson<{ data: { sortedCategorizedFixtures: any[] } }>(`${API_BASE}/api/livescores`),
    getFixtureDetails: (id: number | string) => fetchJson<{ data: any }>(`${API_BASE}/api/fixture/${id}`)
};
