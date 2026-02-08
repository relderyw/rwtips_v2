
import { HistoryMatch, LiveEvent } from '../types';
import { normalizeHistoryData } from './analyzer';

const isDev = import.meta.env.MODE === 'development';
const API_BASE = import.meta.env.VITE_API_BASE || (isDev ? "http://localhost:8080" : "https://rwtips-r943.onrender.com");
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

export const fetchHistoryGames = async (numPages: number = 15): Promise<any[]> => {
    let all: any[] = [];
    
    for (let i = 0; i < numPages; i++) {
        try {
            const page = i + 1;
            const page_size = 20;
            const url = `${API_BASE}/api/app3/matches/recent/?page=${page}&page_size=${page_size}&sort=-time`;
            const res = await fetch(url, {
                method: 'GET',
                headers: { "Content-Type": "application/json" }
            });

            if (!res.ok) break;

            const d = await res.json();
            // The API now returns a direct array of results
            const results = Array.isArray(d) ? d : (d.results || d?.data?.results || []);
            if (!results || results.length === 0) break;

            const normalizedResults = normalizeHistoryData(results);
            all = all.concat(normalizedResults);
        } catch (e) { console.error("History fetch error:", e); break; }
    }
    return all;
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
    const altenarUrl = "https://sb2frontend-altenar2.biahosted.com/api/widget/GetLiveOverview?culture=pt-BR&timezoneOffset=240&integration=estrelabet&deviceType=1&numFormat=en-GB&countryCode=BR&sportId=66";
    const altenarAuth = "V2xoc1MyRkhTa2haTW14UVlWVndTbFpZY0VwTlZUVndVMWhPU21Kc1NURlpNRTVLVG10c2NtTkdhRmRSTUc4MVRHMVdOVk51UW1wUk1Hc3lVMWR3U2s1Rk1VVlZWRnBoVWtaS2NGUXlNVTVPUlRGSVZGUmFUbVZyYkROVVZWSjJUa1V4VldGNldsQlNSV3QzVjFod2RrMUdiRmhXVkZKUVlsWmFjMVJxU2twaFZYaEVVMjEwYVUxcVJtOVpWbU13WVZVNWNGTnRPV3RUUmtveldUTndkbVJyZDNwYVJFNXJaVlRXYzFsNlRsTmxWbkJZWlVkb1dtSldXWGRVUnpGTFlrZFNSRTVYYkdwaFZXeDZVMWN4YzJSWFVraFdiVFZxWWxWWmQxbFdZelZrVld4eFlqSnNZVmRGTkhkWk1qRlhZekZzV0ZOdGVHdFJNR3g2VTFjMVYyVnNjRmxUYTBwaFRXeGFNVnBGVGtwT2EyeHlUVmhhYkdKWGVIcFphMlJHWkdzMVZFNUlaRXBSTW1oWldWWmpNV0V5U1hwYVNIQktVbFJXVmxOVlVrWmtNSGh4VVZSa1NsSnRVbmRaYlhCYVRVVTVOVkZxVWs5aGJFWjNVMVZXUjJReVRraGxSM2hYVFd4YWNGVjZTbk5OUlhnMlZsaHdUMlZVVWpaVWJXeENZakZOZDJGR1ZsVldXR1I2VTFWa05HTkhSWGxXVjJSVFRXeGFjVmxVU1RSalJXeEdWRzA1YW1KVWJEQlhiRTAwWlVVMVJWTllWazVSZWxJelZFZHdRbG94VlhsU2JURmFWMFZ3ZDFSSWNGWmxhelUxVGtod1QyRlZTbEZXVlZwS1pHc3hWVk5VU2sxaGEwWXhWRlZOTUdRd2JIQmtNbXhwVFRBeGNGUXliRXRaTUd4eldraENhV0pXU2pKYVJFNVBXVEJzY0ZOWVRrcGlWbGt3V1RCT1NrNXJNVlZaZWs1T1VrWkdOVlJ0Y0ZaTlJURjFUVU0xUjJSVVZsWmpNMmhhV1Zad2EwOVZiekZpYXpsVlZta3hVMDlXUm01a1ZuQXpVVEJ3UkZKdFpFdFNWa0pWVFRCNE5WTllRbGRoU0ZaYQ==";

    try {
        console.log("[FETCH] Buscando jogos ao vivo da Altenar...");
        const response = await fetch(altenarUrl, {
            headers: {
                "Authorization": altenarAuth,
                "Origin": "https://www.estrelabet.bet.br",
                "Referer": "https://www.estrelabet.bet.br/"
            }
        });

        if (!response.ok) throw new Error(`Altenar API error: ${response.status}`);
        
        const data = await response.json();
        const events = data.events || [];
        const champsMap = new Map((data.champs || []).map((c: any) => [c.id, c.name]));

        return events.map((ev: any) => {
            const leagueName = champsMap.get(ev.champId) || "Futebol";
            const nameParts = ev.name.split(/ vs\. | vs /);
            const home = nameParts[0] || "Home";
            const away = nameParts[1] || "Away";

            const minuteMatch = ev.liveTime?.match(/(\d+)/);
            const minute = minuteMatch ? parseInt(minuteMatch[1]) : 0;

            return {
                id: String(ev.id),
                leagueName,
                eventName: ev.name,
                stage: ev.ls || "Live",
                timer: {
                    minute,
                    second: 0,
                    formatted: ev.liveTime || "00:00"
                },
                score: {
                    home: ev.score?.[0] ?? 0,
                    away: ev.score?.[1] ?? 0
                },
                homePlayer: extractPlayerName(home),
                awayPlayer: extractPlayerName(away),
                homeTeamName: home,
                awayTeamName: away,
                isLive: ev.status === 1 || ev.liveTime !== "Por iniciar",
                bet365EventId: undefined
            };
        });

    } catch (error) {
        console.warn("Altenar API failed, falling back to Render API...", error);
        try {
            const response = await fetch(`${API_BASE}/api/app3/live-events`);
            if (!response.ok) throw new Error("Fallback API failed");
            const json = await response.json();
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
        } catch (fallbackError) {
            console.error("All Live APIs failed:", fallbackError);
            return [];
        }
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
