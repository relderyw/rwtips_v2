
import { HistoryMatch, LiveEvent } from '../types';
import { normalizeHistoryData } from './analyzer';

const HISTORY_API_BASE = "/api/history";
const LIVE_API_URL = "https://sb2frontend-altenar2.biahosted.com/api/widget/GetLiveEvents?culture=pt-BR&timezoneOffset=-180&integration=estrelabet&deviceType=1&numFormat=en-GB&countryCode=BR&eventCount=0&sportId=66&catIds=2085,1571,1728,1594,2086,1729,2130";
const API_BASE = "https://rwtips-r943.onrender.com";

const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    try {
        return localStorage.getItem('authToken');
    } catch {
        return null;
    }
};

const extractPlayerName = (str: string): string => {
    if (!str) return "";
    
    // Check for "Team (Player)" or "Player (Team)" format
    const parenMatch = str.match(/(.*?)\((.*?)\)/);
    if (parenMatch) {
        const part1 = parenMatch[1].trim();
        const part2 = parenMatch[2].trim();
        
        // Detailed heuristic for nicknames vs team names
        const isPart1Caps = /^[A-Z0-9\s]+$/.test(part1) && part1.length > 1;
        const isPart2Caps = /^[A-Z0-9\s]+$/.test(part2) && part2.length > 1;
        
        // If one is caps and other isn't, prefer caps (usually the nick)
        if (isPart2Caps && !isPart1Caps) return part2;
        if (isPart1Caps && !isPart2Caps) return part1;
        
        // Common team names check
        const commonTeams = [
            'Spain', 'France', 'Germany', 'Italy', 'Brazil', 'Argentina', 'Portugal', 'Netherlands', 'England', 'Belgium',
            'Real Madrid', 'Barcelona', 'FC Bayern', 'Man City', 'Man Utd', 'Liverpool', 'PSG', 'Juventus'
        ];
        
        if (commonTeams.some(team => part1.includes(team))) return part2;
        if (commonTeams.some(team => part2.includes(team))) return part1;
        
        // Default to inside parentheses for standard "Team (Nick)" format
        return part2;
    }
    
    // If no parentheses, just clean up
    return str.trim();
};

export const loginDev3 = async (force: boolean = false): Promise<string | null> => {
    return "ok";
};

const INTERNAL_SECRET = import.meta.env.VITE_API_INTERNAL_SECRET;

export const fetchHistoryGames = async (numPages: number = 10): Promise<HistoryMatch[]> => {
    try {
        console.log(`📡 Buscando histórico via Múltiplas APIs (${numPages} páginas) em paralelo...`);

        // Usa o secret do env ou fallback hardcoded
        const apiKey = INTERNAL_SECRET || 'rw_secret_key_v2_2026';
        const token = getAuthToken();

        const internalPromises = Array.from({ length: numPages }, (_, i) => {
            const page = i + 1;
            const url = `${HISTORY_API_BASE}?page=${page}&limit=50`;
            return fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            }).then(async res => {
                if (!res.ok) return [];
                const json = await res.json();
                return json.results || [];
            }).catch(() => []);
        });

        // Aguarda todas as requisições
        const internalResults = await Promise.all(internalPromises);
        
        // Flatten e normalização
        const allInternalRaw = internalResults.flat();
        const allMatches = normalizeHistoryData(allInternalRaw);
        
        if (allMatches.length === 0) {
            console.log('Sem resultados disponíveis no Histórico');
            return [];
        }

        // Remover duplicatas por data e jogadores (opcional, mas recomendado)
        const uniqueMatches = allMatches.filter((match, index, self) =>
            index === self.findIndex((m) => (
                m.data_realizacao === match.data_realizacao &&
                m.home_player === match.home_player &&
                m.away_player === match.away_player
            ))
        );

        // Ordenar por data (recente primeiro)
        uniqueMatches.sort((a, b) => new Date(b.data_realizacao).getTime() - new Date(a.data_realizacao).getTime());
        
        console.log(`📊 Histórico: ${uniqueMatches.length} jogos carregados.`);
        
        return uniqueMatches;
        
    } catch (e) { 
        console.error("History fetch error:", e); 
        return [];
    }
};

import { AltenarResponse, AltenarCompetitor, AltenarChampionship } from '../types';

export const fetchLiveGames = async (): Promise<LiveEvent[]> => {
    try {
        const response = await fetch(LIVE_API_URL, {
            method: 'GET',
            headers: {
                'Accept': '*/*',
                'Origin': 'https://www.estrelabet.bet.br',
                'Referer': 'https://www.estrelabet.bet.br/'
            }
        });

        if (!response.ok) throw new Error(`Live API Error: ${response.status}`);
        
        const data: AltenarResponse = await response.json();
        
        // Mapeamentos para lookup rápido
        const competitorsMap = new Map<number, AltenarCompetitor>();
        if (data.competitors) {
            data.competitors.forEach(c => competitorsMap.set(c.id, c));
        }

        const champsMap = new Map<number, AltenarChampionship>();
        if (data.champs) {
            data.champs.forEach(c => champsMap.set(c.id, c));
        }

        const events = data.events || [];

        return events
            .filter((evt) => evt.sportId === 66)
            .map(evt => {
            const homeId = evt.competitorIds[0];
            const awayId = evt.competitorIds[1];
            
            const homeComp = competitorsMap.get(homeId);
            const awayComp = competitorsMap.get(awayId);
            const champ = champsMap.get(evt.champId);

            const homeNameFull = homeComp?.name || "Player 1";
            const awayNameFull = awayComp?.name || "Player 2";

            const homePlayer = extractPlayerName(homeNameFull);
            const awayPlayer = extractPlayerName(awayNameFull);
            
            // Extract Team Name if available (removes the player name part)
            const homeTeam = homeNameFull.replace(/\(.*?\)/, '').trim();
            const awayTeam = awayNameFull.replace(/\(.*?\)/, '').trim();

            const scoreHome = evt.score[0] || 0;
            const scoreAway = evt.score[1] || 0;

            // Timer parsing logick? Altenar sends "lst" (last server time) and "ls" (live status)
            // Example lst: "2026-02-16T02:08:36Z"
            // We might need to correct the time based on parsing, but for now we format nicely
            const timerFormatted = evt.liveTime || evt.ls || "Ao Vivo";

            return {
                id: String(evt.id),
                leagueName: champ?.name || "Esoccer",
                eventName: `${homeNameFull} vs ${awayNameFull}`,
                stage: evt.ls || "Live", 
                timer: {
                    minute: 0, // Altenar doesn't reliably send exact minute in this summary endpoint
                    second: 0,
                    formatted: timerFormatted
                },
                score: {
                    home: scoreHome,
                    away: scoreAway
                },
                homePlayer: homePlayer,
                awayPlayer: awayPlayer,
                homeTeamName: homeTeam,
                awayTeamName: awayTeam,
                isLive: true,
                bet365EventId: undefined
            };
        })
        .filter(match => !match.leagueName.toUpperCase().includes('VIRTUAL ECOMP') && !match.leagueName.toUpperCase().includes('VIRTUAL E-COMP'));

    } catch (error) {
        console.error("Live Games Error:", error);
        return [];
    }
};

export const fetchConfronto = async (player1: string, player2: string, interval: number = 30): Promise<any | null> => {
    try {
        const url1 = `${HISTORY_API_BASE}?home_nick=${encodeURIComponent(player1)}&away_nick=${encodeURIComponent(player2)}&limit=50`;
        const url2 = `${HISTORY_API_BASE}?home_nick=${encodeURIComponent(player2)}&away_nick=${encodeURIComponent(player1)}&limit=50`;

        const apiKey = INTERNAL_SECRET || 'rw_secret_key_v2_2026';
        const token = getAuthToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const [res1, res2] = await Promise.all([
            fetch(url1, { headers }),
            fetch(url2, { headers })
        ]);

        const data1 = res1.ok ? await res1.json() : { results: [] };
        const data2 = res2.ok ? await res2.json() : { results: [] };

        const allMatchesRaw = [...(data1.results || []), ...(data2.results || [])];
        const p1Norm = player1.toLowerCase().trim();
        const p2Norm = player2.toLowerCase().trim();

        const matches = allMatchesRaw
            .map((m: any) => ({
                match_date: m.finished_at || new Date().toISOString(),
                home_player: extractPlayerName(m.home_nick || m.home_raw || ""),
                away_player: extractPlayerName(m.away_nick || m.away_raw || ""),
                home_score_ft: m.home_score_ft,
                away_score_ft: m.away_score_ft,
                home_score_ht: m.home_score_ht,
                away_score_ht: m.away_score_ht,
            }))
            .filter(m => {
                const hNorm = m.home_player.toLowerCase().trim();
                const aNorm = m.away_player.toLowerCase().trim();
                // Match must be between P1 and P2 in any order
                return (hNorm === p1Norm && aNorm === p2Norm) || (hNorm === p2Norm && aNorm === p1Norm);
            })
            .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());

        // Fetch individual history to populate the P1 and P2 individual dots
        const p1UrlHome = `${HISTORY_API_BASE}?home_nick=${encodeURIComponent(player1)}&limit=50`;
        const p1UrlAway = `${HISTORY_API_BASE}?away_nick=${encodeURIComponent(player1)}&limit=50`;
        const p2UrlHome = `${HISTORY_API_BASE}?home_nick=${encodeURIComponent(player2)}&limit=50`;
        const p2UrlAway = `${HISTORY_API_BASE}?away_nick=${encodeURIComponent(player2)}&limit=50`;

        const [p1H, p1A, p2H, p2A] = await Promise.all([
            fetch(p1UrlHome, { headers }).then(r => r.json()).catch(() => ({ results: [] })),
            fetch(p1UrlAway, { headers }).then(r => r.json()).catch(() => ({ results: [] })),
            fetch(p2UrlHome, { headers }).then(r => r.json()).catch(() => ({ results: [] })),
            fetch(p2UrlAway, { headers }).then(r => r.json()).catch(() => ({ results: [] }))
        ]);

        const mapDot = (m: any) => {
            const h = extractPlayerName(m.home_nick || m.home_raw || "");
            const a = extractPlayerName(m.away_nick || m.away_raw || "");
            const date = m.finished_at || m.created_at || new Date().toISOString();
            return {
                id: m.id || `${date}-${h}-${a}`, // Use server ID or composite key
                date_time: date,
                home_score: m.home_score_ft,
                away_score: m.away_score_ft,
                tooltip: `${h} ${m.home_score_ft}x${m.away_score_ft} ${a}`,
                half_time: `HT ${m.home_score_ht}-${m.away_score_ht}`,
                home_player: h,
                away_player: a
            };
        };

        const deduplicate = (dots: any[]) => {
            const seen = new Set();
            return dots.filter(d => {
                const key = `${d.date_time}-${d.home_player}-${d.away_player}-${d.home_score}-${d.away_score}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        };

        const player1_recent_dots = deduplicate([...(p1H.results || []), ...(p1A.results || [])].map(mapDot))
            .filter(d => d.home_player.toLowerCase() === p1Norm || d.away_player.toLowerCase() === p1Norm)
            .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime())
            .slice(0, 15);

        const player2_recent_dots = deduplicate([...(p2H.results || []), ...(p2A.results || [])].map(mapDot))
            .filter(d => d.home_player.toLowerCase() === p2Norm || d.away_player.toLowerCase() === p2Norm)
            .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime())
            .slice(0, 15);

        return {
            player1,
            player2,
            matches,
            player1_recent_dots,
            player2_recent_dots
        };

    } catch (err) {
        console.error("H2H Error:", err);
        return null;
    }
};



export const fetchPlayers = async (query: string): Promise<string[]> => {
    if (query.length < 2) return [];
    try {
        const apiKey = INTERNAL_SECRET || 'rw_secret_key_v2_2026';
        const token = getAuthToken();
        const headers: HeadersInit = {
            'X-API-Key': apiKey,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };

        // 1. Tentar endpoint direto de players (se existir no novo server)
        const playersUrl = `/api/players?query=${encodeURIComponent(query)}`;
        const res = await fetch(playersUrl, { headers });
        
        if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.players || []);
            if (list.length > 0) return list;
        }

        // 2. Fallback: Buscar no histórico recente e extrair nicks únicos
        // Usamos o endpoint de history que já sabemos que funciona
        const searchUrl = `${HISTORY_API_BASE}?limit=100`;
        const hRes = await fetch(searchUrl, { headers });
        
        if (hRes.ok) {
            const hData = await hRes.json();
            const games = hData.results || [];
            const players = new Set<string>();
            
            const q = query.toLowerCase();
            games.forEach((g: any) => {
                const hNick = g.home_nick || "";
                const aNick = g.away_nick || "";
                if (hNick.toLowerCase().includes(q)) players.add(hNick);
                if (aNick.toLowerCase().includes(q)) players.add(aNick);
            });
            
            return Array.from(players).sort();
        }

        return [];
    } catch (err) {
        console.error("Erro ao buscar jogadores:", err);
        return [];
    }
};
