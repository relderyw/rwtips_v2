
import { HistoryMatch, LiveEvent } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

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

export const fetchHistoryGames = async (numPages: number = 15): Promise<HistoryMatch[]> => {
    let all: HistoryMatch[] = [];
    
    for (let i = 0; i < numPages; i++) {
        try {
            const res = await fetch(`${API_BASE}/api/app3/history`, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: { sort: "-time", limit: 20, offset: i * 20 },
                    filters: { status: 3, last_7_days: true, sort: "-time" }
                })
            });

            if (!res.ok) break;

            const d = await res.json();
            const results = d?.data?.results || [];
            if (results.length === 0) break;

            const mapped = results.map((m: any) => ({
                home_player: extractPlayerName(m.player_home_name || m.player_name_1 || ""),
                away_player: extractPlayerName(m.player_away_name || m.player_name_2 || ""),
                league_name: m.league_name || "Esoccer",
                score_home: Number(m.total_goals_home ?? 0),
                score_away: Number(m.total_goals_away ?? 0),
                halftime_score_home: Number(m.ht_goals_home ?? 0),
                halftime_score_away: Number(m.ht_goals_away ?? 0),
                data_realizacao: m.time
            }));
            all = all.concat(mapped);
        } catch (e) { console.error("History fetch error:", e); break; }
    }
    return all;
};

export const fetchLiveGames = async (): Promise<LiveEvent[]> => {
    try {
        const response = await fetch(`${API_BASE}/api/app3/live-events`);
        if (!response.ok) throw new Error("Live events fetch failed");

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
