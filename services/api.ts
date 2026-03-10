
import { HistoryMatch, LiveEvent } from '../types';
import { normalizeHistoryData } from './analyzer';

const HISTORY_API_BASE = "/api/history";
const LIVE_API_URL = "https://sb2frontend-altenar2.biahosted.com/api/widget/GetLiveEvents?culture=pt-BR&timezoneOffset=-180&integration=estrelabet&deviceType=1&numFormat=en-GB&countryCode=BR&eventCount=0&sportId=66&catIds=2085,1571,1728,1594,2086,1729,2130";
const SUPERBET_LIVE_URL = "/api/superbet-live";
const SUPERBET_STRUCT_URL = "/api/superbet-struct";
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
    
    // 1. Check for "Team (Player)" or "Player (Team)" format
    const parenMatch = str.match(/(.*?)\((.*?)\)/);
    
    // Common team names check to help differentiate
    const commonTeams = [
        'Spain', 'France', 'Germany', 'Italy', 'Brazil', 'Argentina', 'Portugal', 'Netherlands', 'England', 'Belgium',
        'Real Madrid', 'Barcelona', 'FC Bayern', 'Man City', 'Man Utd', 'Liverpool', 'PSG', 'Juventus', 'Arsenal', 'Chelsea',
        'Borussia Dortmund', 'Bayer Leverkusen', 'Napoli', 'AC Milan', 'Inter', 'Inter de Milão', 'Atletico Madrid', 'Sevilla',
        'Piemonte Calcio', 'Latium', 'Genoa', 'Roma', 'RB Leipzig', 'Real Sociedad', 'Athletic Club', 'Aston Villa', 'Spurs',
        'PAOK', 'Benfica', 'Sporting', 'Porto', 'Ajax', 'Bayern de Munique', 'Bayer de Munique', 'Inglaterra', 'França', 'Espanha',
        'Alemanha', 'Itália', 'Argentina', 'Holanda', 'Bélgica', 'Suíça', 'Escócia', 'Áustria', 'Grécia', 'Turquia'
    ];
    
    const knownClubAcronyms = ['PSG', 'RMA', 'FCB', 'MCI', 'MUN', 'LIV', 'CHE', 'ARS', 'TOT', 'JUV', 'MIL', 'INT', 'NAP', 'BVB', 'ATM', 'FC', 'CF', 'SC', 'PAOK'];

    if (parenMatch) {
        const part1 = parenMatch[1].trim();
        const part2 = parenMatch[2].trim();
        
        const part2Upper = part2.toUpperCase();
        const part1Upper = part1.toUpperCase();

        // If explicitly part2 is a recognized team name, return part1 as the player
        if (commonTeams.some(team => part2Upper.includes(team.toUpperCase()))) return part1;
        if (knownClubAcronyms.includes(part2Upper)) return part1;
        
        if (commonTeams.some(team => part1Upper.includes(team.toUpperCase()))) return part2;
        if (knownClubAcronyms.includes(part1Upper)) return part2;
        
        // Default to inside parentheses for standard "Team (Nick)" format
        // This avoids bugs like "PAOK" (caps) overriding "Eros" (titlecase)
        return part2;
    }
    
    // 2. Fallback for strings without parentheses (e.g., "PSG DANGERDIM77" or "Bayern Munich BECKHAM")
    let cleanStr = str.trim();
    
    // Split if there's an explicit separator like " vs " or " - " or "·"
    // Usually, the raw string here represents ONE side of the match (e.g., "PSG BECKHAM") 
    // because it was already split by "·" before calling this function in Superbet fetching.
    
    // First, let's remove any known team name or acronym from the string
    const teamWordsToRemove = [...commonTeams, ...knownClubAcronyms].sort((a, b) => b.length - a.length); // Longest first
    
    for (const team of teamWordsToRemove) {
        const regex = new RegExp(`\\b${team}\\b`, 'i');
        if (regex.test(cleanStr)) {
            cleanStr = cleanStr.replace(regex, '').trim();
            // If replacing it left us with a valid string, we keep going (there might be multiple team words, though unlikely)
        }
    }
    
    // Clean up any stray hyphens or extra spaces left behind
    cleanStr = cleanStr.replace(/^[-·]+|[-·]+$/g, '').replace(/\s+/g, ' ').trim();
    
    // If we've successfully isolated a string, return it
    if (cleanStr && cleanStr.length > 0) {
        return cleanStr;
    }
    
    // 3. Absolute Last Resort if the above wiped everything out (e.g., the string was literally just "PSG")
    const originalParts = str.trim().split(/\s+/);
    if (originalParts.length > 1) {
        // Assume the last word is the player
        return originalParts[originalParts.length - 1];
    }
    
    return str.trim();
};

export const loginDev3 = async (force: boolean = false): Promise<string | null> => {
    return "ok";
};

const INTERNAL_SECRET = import.meta.env.VITE_API_INTERNAL_SECRET;

// === FETCH HISTÓRICO DA SUPERBET ===
const fetchSuperbetHistoryGames = async (): Promise<HistoryMatch[]> => {
    try {
        const now = new Date();
        const past = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago
        
        const pad = (n: number) => String(n).padStart(2, '0');
        const formatSuperbetDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}+${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        
        const startDate = formatSuperbetDate(past);
        const endDate = formatSuperbetDate(now);
        
        const url = `${SUPERBET_LIVE_URL}?compression=true&sportId=75&currentStatus=finished&startDate=${startDate}&endDate=${endDate}`;
        
        const [tournamentsMap, response] = await Promise.all([
            getSuperbetTournaments(),
            fetch(url, { headers: { 'Accept': 'application/json' } })
        ]);

        if (!response.ok) {
            console.warn(`Superbet History API Error: ${response.status}`);
            return [];
        }

        const json = await response.json();
        const events = json.data || [];

        return events.map((evt: any): HistoryMatch => {
            const parts = (evt.matchName || '').split('·');
            const homeNameFull = (parts[0] || 'Player 1').trim();
            const awayNameFull = (parts[1] || 'Player 2').trim();

            const homePlayer = extractPlayerName(homeNameFull);
            const awayPlayer = extractPlayerName(awayNameFull);

            const meta = evt.metadata || {};
            
            // Gols FT (Full Time) - The total match score is directly in metadata
            const scoreHome = parseInt(meta.homeTeamScore) || 0;
            const scoreAway = parseInt(meta.awayTeamScore) || 0;
            
            // Gols HT (Half Time) - Found in periods array where num === 1
            let htHome = 0;
            let htAway = 0;
            
            if (Array.isArray(meta.periods)) {
                const firstHalf = meta.periods.find((p: any) => p.num === 1);
                if (firstHalf) {
                    htHome = parseInt(firstHalf.homeTeamScore) || 0;
                    htAway = parseInt(firstHalf.awayTeamScore) || 0;
                }
            }

            const tournamentId = evt.tournamentId;
            const tData = tournamentsMap[tournamentId];
            const leagueName = tData ? tData.name : `Liga ${tournamentId}`;

            // Standardize date: Use as-is, let the browser handle existing offsets
            // or treat untagged strings as local time.
            let rawDate = evt.utcDate || evt.matchDate || new Date().toISOString();
            let finalDate = String(rawDate).trim();

            return {
                home_player: homePlayer,
                away_player: awayPlayer,
                league_name: leagueName,
                score_home: scoreHome,
                score_away: scoreAway,
                halftime_score_home: htHome,
                halftime_score_away: htAway,
                data_realizacao: finalDate
            };
        });

    } catch (error) {
        console.error("Superbet History Error:", error);
        return [];
    }
}

// === FETCH HISTÓRICO DA ALTENAR (Apenas Valhalla/Valkyrie) ===
const fetchAltenarHistoryGames = async (numPages: number = 10): Promise<HistoryMatch[]> => {
    try {
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

        const internalResults = await Promise.all(internalPromises);
        const allInternalRaw = internalResults.flat();
        
        // Filtra para as ligas que nos interessam no Histórico "Interno" (que vem do Altenar)
        const allowedAltenarKeywords = ['valhalla', 'valkyrie', 'cla', 'cyber live arena', 'adriatic', 'eal', 'h2h', 'battle', 'volta'];
        const filteredRaw = allInternalRaw.filter((m: any) => {
            const leagueLower = (m.league_mapped || m.competition?.name || m.competitionName || m.league || m.league_name || '').toLowerCase();
            return allowedAltenarKeywords.some(keyword => leagueLower.includes(keyword));
        });
        
        return normalizeHistoryData(filteredRaw);
    } catch (e) { 
        console.error("Altenar History fetch error:", e); 
        return [];
    }
}

// === FUNC PRINCIPAL: COMBINA OS HISTÓRICOS ===
export const fetchHistoryGames = async (numPages: number = 10): Promise<HistoryMatch[]> => {
    try {
        console.log(`📡 Buscando histórico consolidado (Superbet + Altenar)...`);

        const [superbetHistory, altenarHistory] = await Promise.allSettled([
            fetchSuperbetHistoryGames(),
            fetchAltenarHistoryGames(numPages)
        ]);

        const sbMatches = superbetHistory.status === 'fulfilled' ? superbetHistory.value : [];
        const altMatches = altenarHistory.status === 'fulfilled' ? altenarHistory.value : [];

        const allMatches = [...sbMatches, ...altMatches];

        if (allMatches.length === 0) {
            console.log('Sem resultados disponíveis no Histórico consolidado');
            return [];
        }

        // Remover duplicatas por proximidade de horário (2 min) e jogadores
        const uniqueMatches = allMatches.filter((match, index, self) => {
            const matchTime = new Date(match.data_realizacao).getTime();
            const firstIdx = self.findIndex((m) => {
                const mTime = new Date(m.data_realizacao).getTime();
                const samePlayers = (m.home_player === match.home_player && m.away_player === match.away_player) ||
                                    (m.home_player === match.away_player && m.away_player === match.home_player);
                const closeInTime = Math.abs(mTime - matchTime) < 120000; // 2 minutos de tolerância
                return samePlayers && closeInTime;
            });
            return index === firstIdx;
        });

        // Ordenar por data (recente primeiro) e depois por jogadores para manter ordem estável
        uniqueMatches.sort((a, b) => {
            const timeA = new Date(a.data_realizacao).getTime();
            const timeB = new Date(b.data_realizacao).getTime();
            if (timeB !== timeA) return timeB - timeA;
            // Se o tempo for idêntico, ordena por nome de jogador para ser estável
            return (a.home_player + a.away_player).localeCompare(b.home_player + b.away_player);
        });
        
        console.log(`📊 Histórico Unificado: ${uniqueMatches.length} jogos carregados (${sbMatches.length} SB, ${altMatches.length} ALT)`);
        
        return uniqueMatches;
        
    } catch (e) { 
        console.error("fetchHistoryGames final error:", e); 
        return [];
    }
};

import { AltenarResponse, AltenarCompetitor, AltenarChampionship } from '../types';

// === IDs de torneios Superbet permitidos (fallback quando tournamentsMap falha/timeout) ===
// Usados quando o endpoint /struct não pode ser carregado a tempo.
const SUPERBET_ALLOWED_TOURNAMENT_IDS = new Set([
    80560,  // H2H - GG League
    80566,  // H2H - GG League Mixed
    49964,  // Battle - Liga dos Campeões 1
    49968,  // Battle - Europa League
    49969,  // Battle - FA Cup
    81985,  // Battle - Mundial de Clubes
    94140,  // Battle - Conference League
    49959,  // Battle - Premier League
    71851,  // Battle - Liga dos Campeões 2
    51264,  // Battle - LaLiga 1
    82545,  // Battle - LaLiga 2
    51302,  // Battle - Nations League
    94993,  // Cyber Live Arena
    67380,  // EAL - Liga dos Campeões
    67382,  // EAL - Europa League
    67383,  // EAL - Premier League
    61751,  // GT - Liga dos Campeões 1
    74950,  // GT - Liga dos Campeões 2
    61755,  // GT - Liga dos Campeões 3
    62997,  // GT - Liga dos Campeões 4
    62928,  // GT - Europa League 2
    70845,  // GT - Europa League 3
    61756,  // GT - Europa League 1
]);

// ID da categoria E-Sport Futebol na Superbet (para pré-filtro eficiente)
const SUPERBET_ESOCCER_CATEGORY_ID = 954;

// === SUPERBET TOURNAMENT METADATA CACHE ===
let superbetTournamentsCache: Record<number, { name: string, duration: string }> | null = null;
let superbetTournamentsCacheTime = 0;

const getSuperbetTournaments = async () => {
    const now = Date.now();
    // Cache for 1 hour (3600000 ms)
    if (superbetTournamentsCache && (now - superbetTournamentsCacheTime < 3600000)) {
        return superbetTournamentsCache;
    }

    try {
        const response = await fetch(SUPERBET_STRUCT_URL, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) return {};

        const json = await response.json();
        const tournaments = json.data?.tournaments || [];
        
        const map: Record<number, { name: string, duration: string }> = {};
        for (const t of tournaments) {
            let duration = '';
            if (t.footer) {
                // Extrai "2x5" de frases como "As partidas serão disputadas em formato eletrônico: 2x5 minutos."
                const match = t.footer.match(/(\d+x\d+)/i);
                if (match) {
                    duration = `${match[1]} min`;
                }
            }

            map[t.id] = {
                name: t.localNames?.['pt-BR'] || t.name || `Liga ${t.id}`,
                duration: duration
            };
        }
        
        superbetTournamentsCache = map;
        superbetTournamentsCacheTime = now;
        return map;
    } catch (e) {
        console.error("Failed to fetch Superbet struct:", e);
        return superbetTournamentsCache || {};
    }
};

// === SUPERBET LIVE API ===
const fetchSuperbetLiveGames = async (): Promise<LiveEvent[]> => {
    try {
        const now = new Date();
        const past = new Date(now.getTime() - (12 * 60 * 60 * 1000)); // 12 hours ago is enough for live
        
        const pad = (n: number) => String(n).padStart(2, '0');
        const formatSuperbetDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}+${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        
        const startDate = formatSuperbetDate(past);

        const [tournamentsMap, response] = await Promise.all([
            getSuperbetTournaments(),
            fetch(`${SUPERBET_LIVE_URL}?currentStatus=active&offerState=live&startDate=${startDate}&sportId=75`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            })
        ]);

        if (!response.ok) {
            console.warn(`Superbet API Error: ${response.status}`);
            return [];
        }

        const json = await response.json();
        const events = json.data || [];

        const allowedKeywords = ['VALHALLA', 'VALKYRIE', 'ADRIATIC', 'CLA', 'BATTLE', 'VOLTA', 'H2H', 'EAL', 'CYBER LIVE ARENA', 'GG LEAGUE', 'GT'];

        return events
            .map((evt: any): LiveEvent => {
                // matchName format: "Team (Player)·Team (Player2)"
                const parts = (evt.matchName || '').split('·');
                const homeNameFull = (parts[0] || 'Player 1').trim();
                const awayNameFull = (parts[1] || 'Player 2').trim();

                const homePlayer = extractPlayerName(homeNameFull);
                const awayPlayer = extractPlayerName(awayNameFull);
                const homeTeam = homeNameFull.replace(/\(.*?\)/, '').trim();
                const awayTeam = awayNameFull.replace(/\(.*?\)/, '').trim();

                const meta = evt.metadata || {};
                const scoreHome = parseInt(meta.homeTeamScore) || 0;
                const scoreAway = parseInt(meta.awayTeamScore) || 0;
                const minute = parseInt(meta.minutes) || 0;
                const periodStatus = meta.periodStatus || meta.matchStatusLabel || 'Live';

                const tournamentId = Number(evt.tournamentId);
                const tData = tournamentsMap[tournamentId];
                // Se tournamentsMap falhou/timeout, usa nome genérico baseado no tournamentId conhecido
                let leagueName: string;
                if (tData) {
                    leagueName = tData.name;
                } else if (SUPERBET_ALLOWED_TOURNAMENT_IDS.has(tournamentId)) {
                    // Mapa de fallback com nomes conhecidos para os principais torneios
                    const fallbackNames: Record<number, string> = {
                        80560: 'H2H - GG League',
                        80566: 'H2H - GG League Mixed',
                        49964: 'Battle - Liga dos Campeões 1',
                        49968: 'Battle - Europa League',
                        49969: 'Battle - FA Cup',
                        81985: 'Battle - Mundial de Clubes',
                        94140: 'Battle - Conference League',
                        49959: 'Battle - Premier League',
                        71851: 'Battle - Liga dos Campeões 2',
                        51264: 'Battle - LaLiga 1',
                        82545: 'Battle - LaLiga 2',
                        51302: 'Battle - Nations League',
                        94993: 'Cyber Live Arena',
                        67380: 'EAL - Liga dos Campeões',
                        67382: 'EAL - Europa League',
                        67383: 'EAL - Premier League',
                        61751: 'GT - Liga dos Campeões 1',
                        74950: 'GT - Liga dos Campeões 2',
                        61755: 'GT - Liga dos Campeões 3',
                        62997: 'GT - Liga dos Campeões 4',
                        62928: 'GT - Europa League 2',
                        70845: 'GT - Europa League 3',
                        61756: 'GT - Europa League 1',
                    };
                    leagueName = fallbackNames[tournamentId] || `Liga ${tournamentId}`;
                } else {
                    leagueName = `Liga ${tournamentId}`;
                }
                const durationInfo = tData && tData.duration ? ` (${tData.duration})` : '';

                return {
                    id: `sb-${evt.eventId}`,
                    leagueName: leagueName,
                    eventName: `${homeNameFull} vs ${awayNameFull}`,
                    stage: periodStatus,
                    timer: {
                        minute,
                        second: 0,
                        formatted: `${periodStatus} ${minute}'${durationInfo}`
                    },
                    score: {
                        home: scoreHome,
                        away: scoreAway
                    },
                    homePlayer,
                    awayPlayer,
                    homeTeamName: homeTeam,
                    awayTeamName: awayTeam,
                    isLive: true,
                    bet365EventId: undefined
                };
            })
            .filter(match => {
                // Filtro duplo: por nome (quando tournamentsMap disponível) OU por ID (fallback)
                const name = match.leagueName.toUpperCase();
                return allowedKeywords.some(keyword => name.includes(keyword));
            });
    } catch (error) {
        console.error("Superbet Live Error:", error);
        return [];
    }
};

// === ALTENAR (ESTRELABET) LIVE API — filtrada para Valhalla/Valkyrie ===
const fetchAltenarLiveGames = async (): Promise<LiveEvent[]> => {
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

            const timerFormatted = evt.liveTime || evt.ls || "Ao Vivo";

            return {
                id: String(evt.id),
                leagueName: champ?.name || "Esoccer",
                eventName: `${homeNameFull} vs ${awayNameFull}`,
                stage: evt.ls || "Live", 
                timer: {
                    minute: 0,
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
        // Filtrar: Valhalla, Valkyrie e outras ligas de esoccer permitidas
        .filter(match => {
            const name = match.leagueName.toUpperCase();
            const allowedKeywords = ['VALHALLA', 'VALKYRIE', 'ADRIATIC', 'CLA', 'BATTLE', 'VOLTA', 'H2H', 'EAL', 'CYBER LIVE ARENA'];
            return allowedKeywords.some(keyword => name.includes(keyword));
        });

    } catch (error) {
        console.error("Altenar Live Games Error:", error);
        return [];
    }
};

// === FUNC PRINCIPAL: combina Superbet (todos) + Altenar (Valhalla/Valkyrie) ===
export const fetchLiveGames = async (): Promise<LiveEvent[]> => {
    try {
        const [superbetGames, altenarGames] = await Promise.allSettled([
            fetchSuperbetLiveGames(),
            fetchAltenarLiveGames()
        ]);

        const sb = superbetGames.status === 'fulfilled' ? superbetGames.value : [];
        const alt = altenarGames.status === 'fulfilled' ? altenarGames.value : [];

        console.log(`📡 Live: ${sb.length} jogos Superbet + ${alt.length} jogos Altenar (Valhalla/Valkyrie)`);
        return [...sb, ...alt];
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

        const deduplicate = (list: any[]) => {
            const seen = new Set();
            return list.filter(d => {
                // Key for deduplication: date + players + scores
                // We use home/away explicitly if available, otherwise fallback to the dot keys
                const h = (d.home_player || d.home_nick || "").toLowerCase().trim();
                const a = (d.away_player || d.away_nick || "").toLowerCase().trim();
                const date = d.match_date || d.finished_at || d.date_time || "";
                const key = `${date}-${h}-${a}-${d.home_score_ft ?? d.home_score}-${d.away_score_ft ?? d.away_score}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        };

        const matches = deduplicate(allMatchesRaw
            .map((m: any) => ({
                match_date: m.finished_at || new Date().toISOString(),
                home_player: extractPlayerName(m.home_nick || m.home_raw || ""),
                away_player: extractPlayerName(m.away_nick || m.away_raw || ""),
                home_score_ft: m.home_score_ft,
                away_score_ft: m.away_score_ft,
                home_score_ht: m.home_score_ht,
                away_score_ht: m.away_score_ht,
            })))
            .filter((m: any) => {
                const hNorm = m.home_player.toLowerCase().trim();
                const aNorm = m.away_player.toLowerCase().trim();
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
