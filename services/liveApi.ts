export interface LiveScore {
    fixtureId: number;
    leagueName: string;
    countryName: string;
    countryImagePath?: string;
    homeTeam: { name: string; score: number };
    awayTeam: { name: string; score: number };
    status: string;
    time: string;
    [key: string]: any;
}

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001"; // Fallback para compatibilidade
// Mas para o servidor local do bot é 8080 ou a url de produção
// Vamos usar uma lógica similar ao api.ts original, mas adaptada

const getApiUrl = () => {
    // Se existir VITE_API_URL definida (produção), usa ela
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    // Se não, assume localhost:8080 (backend local)
    return "http://localhost:8080";
};

const BASE_URL = getApiUrl();

async function fetchJson<T>(endpoint: string, options: RequestInit = {}, timeoutMs = 30000): Promise<T> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        const res = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                ...(options.headers || {})
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
    getLiveScores: () => fetchJson<{ data: { sortedCategorizedFixtures: any[] } }>('/api/livescores'),
    getFixtureDetails: (id: number | string) => fetchJson<{ data: any }>(`/api/fixture/${id}`)
};
