
import { HistoryMatch, LiveEvent } from '../types';
import { normalizeHistoryData } from './analyzer';

const API_BASE = import.meta.env.VITE_API_BASE || "https://rwtips-r943.onrender.com";
const API_BACKUP = "https://rwtips-r943.onrender.com/api/matches/live";

const extractPlayerName = (str: string): string => {
    if (!str) return "";
    const parenMatch = str.match(/\((.*?)\)/);
    if (parenMatch && parenMatch[1]) return parenMatch[1].trim();
    return str.trim();
};

export const loginDev3 = async (force: boolean = false): Promise<string | null> => {
    // A autenticação agora é gerenciada pelo backend (rotas.js)
    // Mantemos a função para compatibilidade, mas ela apenas retorna "ok" ou checa o health
    return "ok";
};

export const fetchHistoryGames = async (numPages: number = 40): Promise<any[]> => {
    // SensorFIFA API returns the entire history in a single request (~80k matches).
    // We use a proxy route to avoid CORS and fetch everything at once.
    try {
        const isLocal = window.location.hostname === 'localhost';
        const url = isLocal ? '/api/sensor-matches' : `${API_BASE}/api/sensor-matches`;

        const res = await fetch(
            url,
            {
                method: 'GET',
                headers: { "Content-Type": "application/json" }
            }
        );

        if (!res.ok) {
            console.error(`Erro ao buscar SensorFIFA (${url}): ${res.status}`);
            return [];
        }

        const json = await res.json();
        const results = Array.isArray(json) ? json : (json.value || json.results || []);
        
        // Ensure data is sorted by date descending (most recent first)
        const sortedResults = results.sort((a: any, b: any) => {
            const timeA = new Date(a.matchTime || a.time || 0).getTime();
            const timeB = new Date(b.matchTime || b.time || 0).getTime();
            return timeB - timeA;
        });
        
        if (sortedResults.length === 0) {
            console.log('Sem resultados disponíveis na SensorFIFA');
            return [];
        }

        // Normalizar dados antes de retornar
        const normalizedResults = normalizeHistoryData(sortedResults);
        const limitedResults = normalizedResults.slice(0, 1000); // Limit to latest 1000 games for performance
        console.log(`📊 SensorFIFA: ${limitedResults.length} jogos carregados (Ordenados: Recentes Primeiro).`);
        
        return limitedResults;
        
    } catch (e) { 
        console.error("SensorFIFA fetch error:", e); 
        return [];
    }
};

const adaptFallbackLiveEvents = (data: any[]): LiveEvent[] => {
    return data.map((item: any) => ({
        id: String(item.id),
        leagueName: item.league?.name || "Esoccer",
        eventName: `${item.home?.name || "Player 1"} vs ${item.away?.name || "Player 2"}`,
        stage: String(item.time_status), // Mapear se necessário, ex: "1" -> "1H"
        timer: {
            minute: Number(item.timer?.tm || 0),
            second: Number(item.timer?.ts || 0),
            formatted: `${item.timer?.tm || 0}:${String(item.timer?.ts || 0).padStart(2, '0')}`
        },
        score: {
            home: Number(item.ss?.split('-')[0] || 0),
            away: Number(item.ss?.split('-')[1] || 0)
        },
        homePlayer: extractPlayerName(item.home?.name || ""),
        awayPlayer: extractPlayerName(item.away?.name || ""),
        homeTeamName: item.home?.name || "",
        awayTeamName: item.away?.name || "",
        isLive: true,
        bet365EventId: undefined // Desabilita link da Bet365
    }));
};

export const fetchLiveGames = async (): Promise<LiveEvent[]> => {
    try {
        let json;
        try {
            const response = await fetch(`${API_BASE}/api/app3/live-events`);
            if (!response.ok) throw new Error("Live events fetch failed");
            json = await response.json();
            
            const events = json.events || [];
            return events.map((m: any) => ({
                id: String(m.id),
                leagueName: m.leagueName || "Esoccer",
                eventName: m.eventName,
                stage: m.stage,
                timer: {
                    minute: m.timer?.minute ?? 0,
                    second: m.timer?.second ?? 0,
                    formatted: m.timer?.formatted ?? "00:00"
                },
                score: m.score,
                homePlayer: extractPlayerName(m.homePlayer || ""),
                awayPlayer: extractPlayerName(m.awayPlayer || ""),
                homeTeamName: m.homeTeamName,
                awayTeamName: m.awayTeamName,
                isLive: m.isLive,
                bet365EventId: m.bet365EventId
            }));

        } catch (primaryError) {
            console.warn("Primary API failed, attempting backup...", primaryError);
            const backupResponse = await fetch(API_BACKUP);
            if (!backupResponse.ok) throw new Error("Backup API fetch failed");
            
            const backupJson = await backupResponse.json();
            const backupData = backupJson.data || [];
            return adaptFallbackLiveEvents(backupData);
        }
    } catch (error) {
        console.error("Live Games Error:", error);
        return [];
    }
};

export const fetchConfronto = async (player1: string, player2: string, interval: number = 30): Promise<any | null> => {
    try {
        const url = `${API_BASE}/api/app3/confronto?player1=${encodeURIComponent(player1)}&player2=${encodeURIComponent(player2)}&interval=${interval}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Confronto fetch failed");
        return await res.json();
    } catch (err) {
        console.error("H2H Error:", err);
        return null;
    }
};

export const fetchPlayers = async (query: string): Promise<string[]> => {
    if (query.length < 2) return [];
    try {
        const res = await fetch(`${API_BASE}/api/app3/players?query=${encodeURIComponent(query)}`);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : (data.players || []);
    } catch (err) {
        console.error("Erro ao buscar jogadores:", err);
        return [];
    }
};
