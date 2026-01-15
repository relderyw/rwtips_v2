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
    [key: string]: any;
}

const PROXY_URL = 'https://api.codetabs.com/v1/proxy?quest=';
// Alternativa: 'https://corsproxy.io/?';

async function fetchJson<T>(endpoint: string, options: RequestInit = {}, timeoutMs = 30000): Promise<T> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    
    // O endpoint aqui será a URL completa do sokkerpro
    // A logica muda: em vez de chamar /api/livescores, chamamos o proxy + url externa
    const targetUrl = endpoint.startsWith('http') ? endpoint : `https://m2.sokkerpro.com${endpoint}`;
    const proxyUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;

    try {
        const res = await fetch(proxyUrl, {
            ...options,
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                // Proxies publicos geralmente nao precisam de headers complexos
            }
        });
        clearTimeout(id);
        
        if (!res.ok) {
            throw new Error(`API Error: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        clearTimeout(id);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
}

export const liveApi = {
    // Agora passamos a URL do sokkerpro (ou parte dela)
    getLiveScores: () => fetchJson<{ data: { sortedCategorizedFixtures: any[] } }>('https://m2.sokkerpro.com/livescores'),
    getFixtureDetails: (id: number | string) => fetchJson<{ data: any }>(`https://m2.sokkerpro.com/fixture/${id}`)
};
