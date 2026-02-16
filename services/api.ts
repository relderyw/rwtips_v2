
import { HistoryMatch, LiveEvent } from '../types';
import { normalizeHistoryData } from './analyzer';

const HISTORY_API_BASE = "https://rwtips-r943.onrender.com/api/app3/history";
const LIVE_API_URL = "https://sb2frontend-altenar2.biahosted.com/api/widget/GetLiveEvents?culture=pt-BR&timezoneOffset=-180&integration=estrelabet&deviceType=1&numFormat=en-GB&countryCode=BR&eventCount=0&sportId=66&catIds=2085,1571,1728,1594,2086,1729,2130";
const API_BASE = "https://rwtips-r943.onrender.com";

const extractPlayerName = (str: string): string => {
    if (!str) return "";
    const parenMatch = str.match(/\((.*?)\)/);
    if (parenMatch && parenMatch[1]) return parenMatch[1].trim();
    return str.trim();
};

export const loginDev3 = async (force: boolean = false): Promise<string | null> => {
    return "ok";
};

export const fetchHistoryGames = async (numPages: number = 10): Promise<HistoryMatch[]> => {
    try {
        console.log(`📡 Buscando histórico via Nova API (${numPages} páginas) em paralelo...`);

        // Cria array de promessas para buscar todas as páginas simultaneamente
        const promises = Array.from({ length: numPages }, (_, i) => {
            const page = i + 1;
            const url = `${HISTORY_API_BASE}?page=${page}&page_size=20`;
            return fetch(url).then(async res => {
                if (!res.ok) {
                    console.error(`Erro ao buscar Histórico página ${page}: ${res.status}`);
                    return [];
                }
                const json = await res.json();
                return json.results || [];
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
            console.log('Sem resultados disponíveis no Histórico');
            return [];
        }

        // Normalize History Data using the sanitizer in analyzer.ts
        const normalizedResults = normalizeHistoryData(allItems);
        
        console.log(`📊 Histórico: ${normalizedResults.length} jogos carregados (Total de ${numPages} páginas).`);
        
        return normalizedResults;
        
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
        });

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
