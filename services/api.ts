
import { HistoryMatch, LiveEvent } from '../types';
import { normalizeHistoryData } from './analyzer';

const API_BASE = import.meta.env.VITE_API_BASE || ""; 
const API_BACKUP = "https://api-v2.green365.com.br/api/v2/sport-events?page=1&limit=50&sport=esoccer&status=inplay";

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

export const fetchHistoryGames = async (numPages: number = 10): Promise<any[]> => {
    try {
        console.log(`📡 Buscando histórico via Green365 (${numPages} páginas) em paralelo...`);

        // Cria array de promessas para buscar todas as páginas simultaneamente
        const promises = Array.from({ length: numPages }, (_, i) => {
            const page = i + 1;
            const url = `https://api-v2.green365.com.br/api/v2/sport-events?page=${page}&limit=24&sport=esoccer&status=ended`;
            return fetch(url, {
                method: 'GET',
                headers: { "Content-Type": "application/json" }
            }).then(async res => {
                if (!res.ok) {
                    console.error(`Erro ao buscar Green365 página ${page}: ${res.status}`);
                    return [];
                }
                const json = await res.json();
                return json.items || [];
            }).catch(err => {
                console.error(`Erro na requisição da página ${page}:`, err);
                return [];
            });
        });

        // Aguarda todas as requisições
        const results = await Promise.all(promises);
        
        // Flatten array de arrays em um único array
        const allItems = results.flat();
        
        if (allItems.length === 0) {
            console.log('Sem resultados disponíveis na Green365');
            return [];
        }

        // Map Green365 data to HistoryMatch format
        const mappedResults: HistoryMatch[] = allItems.map((item: any) => {
            const leagueName = item.competition?.name || "";
            const homeScore = item.score?.home ?? 0;
            const awayScore = item.score?.away ?? 0;
            const homeScoreHT = item.scoreHT?.home ?? 0;
            const awayScoreHT = item.scoreHT?.away ?? 0;
            const matchTime = item.startTime || new Date().toISOString();

            return {
                home_player: extractPlayerName(item.home?.name || ""),
                away_player: extractPlayerName(item.away?.name || ""),
                league_name: leagueName,
                score_home: homeScore,
                score_away: awayScore,
                halftime_score_home: homeScoreHT,
                halftime_score_away: awayScoreHT,
                data_realizacao: matchTime,
                home_team: item.home?.teamName || "",
                away_team: item.away?.teamName || "",
                home_team_logo: item.home?.imageUrl || "",
                away_team_logo: item.away?.imageUrl || ""
            };
        });

        // Ensure data is sorted by date descending (most recent first)
        const sortedResults = mappedResults.sort((a, b) => {
            const timeA = new Date(a.data_realizacao).getTime();
            const timeB = new Date(b.data_realizacao).getTime();
            return timeB - timeA;
        });

        // RE-NORMALIZE to ensure league names regularizations from analyzer.ts are applied!
        const normalizedResults = normalizeHistoryData(sortedResults);
        
        console.log(`📊 Green365: ${normalizedResults.length} jogos carregados (Total de ${numPages} páginas).`);
        
        return normalizedResults;
        
    } catch (e) { 
        console.error("Green365 fetch error:", e); 
        return [];
    }
};

const adaptFallbackLiveEvents = (data: any[]): LiveEvent[] => {
    return data.map((item: any) => ({
        id: String(item.eventId || item.id),
        leagueName: item.competition?.name || item.league?.name || "Esoccer",
        eventName: `${item.home?.name || "Player 1"} vs ${item.away?.name || "Player 2"}`,
        stage: "Live", 
        timer: {
            minute: Number(item.timer?.tm || 0),
            second: Number(item.timer?.ts || 0),
            formatted: "00:00" // Green365 might not send detailed timer in this endpoint
        },
        score: {
            home: Number(item.score?.home ?? item.ss?.split('-')[0] ?? 0),
            away: Number(item.score?.away ?? item.ss?.split('-')[1] ?? 0)
        },
        homePlayer: extractPlayerName(item.home?.name || ""),
        awayPlayer: extractPlayerName(item.away?.name || ""),
        homeTeamName: item.home?.teamName || "",
        awayTeamName: item.away?.teamName || "",
        isLive: true,
        bet365EventId: undefined
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
            const backupData = backupJson.items || backupJson.data || [];
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
