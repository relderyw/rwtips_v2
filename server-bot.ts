import express from 'express';
import { analyzeMatchPotential, calculatePlayerStats } from './services/analyzer';
import { sendTelegramAlert } from './services/telegram';
import axios from 'axios';
import * as cheerio from 'cheerio';
import cors from 'cors';

// Configurações
let API_BASE = process.env.API_BASE || "http://localhost:3001";
// Remove barras finais para evitar duplicidade //api//v1
if (API_BASE.endsWith('/')) API_BASE = API_BASE.slice(0, -1);

const PORT = process.env.PORT || 8080;
const POLL_INTERVAL = 15000;
const HEADERS: HeadersInit = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
};
let isRunning = true;

// Servidor de Health Check (Necessário para Koyeb/Render/Heroku não derrubarem o bot)
const app = express();
app.use(cors()); // Habilita CORS para todas as origens
app.get('/', (req, res) => res.send('RW TIPS BOT IS ALIVE! 🚀'));

// Endpoint para Próximos Jogos (Web Scraper)
app.get('/api/next-games', async (req, res) => {
    try {
        console.log('[API] Recebida solicitação para /api/next-games');
        const games = await scrapeNextGames();
        console.log(`[API] Retornando ${games.length} jogos`);
        res.json({ success: true, results: games });
    } catch (error) {
        console.error('[BOT] Erro no endpoint /api/next-games:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar próximos jogos' });
    }
});

const server = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[SERVER] Health check rodando na porta ${PORT}`);
    console.log(`[SERVER] URL de health check monitorada localmente: http://localhost:${PORT}`);
});

const extractPlayerName = (str: string): string => {
    if (!str) return "";
    const parenMatch = str.match(/\((.*?)\)/);
    if (parenMatch && parenMatch[1]) return parenMatch[1].trim();
    return str.trim();
};

const sentTips = new Set<string>();

// Função de Scraping para Drafted.gg
async function scrapeNextGames() {
    const url = 'https://drafted.gg'; // URL alvo inferida
    try {
        console.log('[SCRAPER] Buscando dados de:', url);
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        console.log(`[SCRAPER] Dados recebidos. Tamanho: ${data.length} bytes`);
        const $ = cheerio.load(data);
        const games: any[] = [];
        
        // Seletores baseados no snippet HTML fornecido
        // Desktop cards
        const desktopCards = $('.hidden.lg\\:flex.cursor-pointer');
        console.log(`[SCRAPER] Encontrados ${desktopCards.length} cards desktop`);

        desktopCards.each((i, el) => {
            const home = $(el).find('.w-\\[128px\\].rounded-tl-lg').next().find('.uppercase.text-3\\.5xl').text().trim();
            const homeTeam = $(el).find('.w-\\[128px\\].rounded-tl-lg').next().find('.font-nunito').first().text().trim();
            const homeImg = $(el).find('img').first().attr('src') || $(el).find('img').first().attr('srcset')?.split(' ')[0];
            
            const away = $(el).find('.w-\\[128px\\].rounded-tr-lg').prev().find('.uppercase.text-3\\.5xl').text().trim();
            const awayTeam = $(el).find('.w-\\[128px\\].rounded-tr-lg').prev().find('.font-nunito').first().text().trim();
            const awayImg = $(el).find('img').last().attr('src') || $(el).find('img').last().attr('srcset')?.split(' ')[0];
            
            const middleSection = $(el).find('.flex.flex-col.items-center.font-nunito');
            const matchIdText = middleSection.find('.text-xs.lg\\:text-sm').text().trim(); // "Match 2352161"
            const matchId = matchIdText.replace('Match', '').trim();
            const dateTimeNode = middleSection.contents().filter((_, node) => node.type === 'text' && node.data.includes(':')).text().trim();
            
            // Tentar extrair data/hora se o seletor acima falhar
            let time = dateTimeNode;
            if (!time) {
                 // Fallback: pegar todo texto e tentar regex
                 const fullText = middleSection.text();
                 const timeMatch = fullText.match(/\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}/);
                 if (timeMatch) time = timeMatch[0];
            }
            
            if (home && away) {
                games.push({
                    id: matchId,
                    home: { name: home, team: homeTeam, image: homeImg },
                    away: { name: away, team: awayTeam, image: awayImg },
                    time: time,
                    league: { name: 'E-Soccer' } // Default ou extrair se possível
                });
            }
        });
        
        // Se não achou desktop, tentar mobile (ou combinar)
        if (games.length === 0) {
             console.log('[SCRAPER] Tentando seletores mobile...');
             const mobileCards = $('.lg\\:hidden.cursor-pointer');
             console.log(`[SCRAPER] Encontrados ${mobileCards.length} cards mobile`);

             mobileCards.each((i, el) => {
                // Implementar seletores mobile se necessário, mas o desktop deve cobrir se o HTML for responsivo padrão
                // O HTML fornecido tem blocos duplicados para mobile/desktop
                const home = $(el).find('.uppercase.text-2xl').first().text().trim();
                const away = $(el).find('.uppercase.text-2xl').last().text().trim();
                const timeStr = $(el).text().match(/\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}/)?.[0] || '';
                
                 if (home && away) {
                    games.push({
                        id: `mobile-${i}`,
                        home: { name: home, team: 'N/A', image: '' },
                        away: { name: away, team: 'N/A', image: '' },
                        time: timeStr,
                        league: { name: 'E-Soccer' }
                    });
                }
             });
        }
        
        console.log(`[SCRAPER] Total de jogos extraídos: ${games.length}`);
        return games;
    } catch (e) {
        console.error('[BOT] Erro no scraper:', e);
        return [];
    }
}

async function fetchHistory() {
    const url = `${API_BASE}/api/app3/history`;
    try {
        console.log(`[BOT] Coletando histórico de: ${url}`);
        const res = await fetch(url, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({
                query: { sort: "-time", limit: 1000, offset: 0 },
                filters: { status: 3, last_7_days: true, sort: "-time" }
            })
        });

        if (!res.ok) {
            console.error(`[BOT] Erro ao buscar histórico: Status ${res.status} em ${url}`);
            return [];
        }

        const d: any = await res.json();
        const results = d?.data?.results || [];
        return results.map((m: any) => ({
            home_player: extractPlayerName(m.player_home_name || m.player_name_1 || ""),
            away_player: extractPlayerName(m.player_away_name || m.player_name_2 || ""),
            league_name: m.league_name || "Esoccer",
            score_home: Number(m.total_goals_home ?? 0),
            score_away: Number(m.total_goals_away ?? 0),
            halftime_score_home: Number(m.ht_goals_home ?? 0),
            halftime_score_away: Number(m.ht_goals_away ?? 0),
            data_realizacao: m.time
        }));
    } catch (e) {
        console.error(`[BOT] Erro fatal ao buscar histórico (${url}):`, e);
        return [];
    }
}

async function fetchLive() {
    const url = `${API_BASE}/api/app3/live-events`;
    try {
        const response = await fetch(url, { headers: HEADERS });
        if (!response.ok) {
            console.error(`[BOT] Erro ao buscar live: Status ${response.status} em ${url}`);
            return [];
        }

        const json: any = await response.json();
        const events = json.events || [];
        return events.map((m: any) => ({
            ...m,
            homePlayer: extractPlayerName(m.homePlayer || ""),
            awayPlayer: extractPlayerName(m.awayPlayer || "")
        }));
    } catch (e) {
        console.error(`[BOT] Erro fatal ao buscar live (${url}):`, e);
        return [];
    }
}

async function runBot() {
    console.log(`[BOT] Iniciando ciclo de monitoramento... ${new Date().toLocaleTimeString()}`);
    
    const history = await fetchHistory();
    const liveEvents = await fetchLive();

    if (liveEvents.length === 0) {
        console.log("[BOT] Nenhum jogo ao vivo no momento.");
        return;
    }

  for (const event of liveEvents) {
        const analysis = analyzeMatchPotential(event.homePlayer, event.awayPlayer, history);
        
        if (analysis.key !== 'none' && analysis.confidence >= 85) {
            const eventCode = (event.bet365EventId || event.id || `${event.homePlayer}-${event.awayPlayer}-${event.leagueName}`)
                .toString()
                .toLowerCase()
                .replace(/\s+/g, '');
            const tipKey = `${eventCode}-${analysis.key}`;
            
            if (!sentTips.has(tipKey)) {
                console.log(`[BOT][${INSTANCE_ID}] 🚀 SINAL DETECTADO: ${event.homePlayer} vs ${event.awayPlayer} (${analysis.key}) - Confiança: ${analysis.confidence}%`);
                
                // Calcula métricas reais para o Telegram
                const p1Stats = calculatePlayerStats(event.homePlayer, history, 5);
                const p2Stats = calculatePlayerStats(event.awayPlayer, history, 5);
                
                const metrics = { 
                  ht05: (p1Stats.htOver05Rate + p2Stats.htOver05Rate) / 2, 
                  ft25: (p1Stats.ftOver25Rate + p2Stats.ftOver25Rate) / 2, 
                  ftBtts: (p1Stats.ftBttsRate + p2Stats.ftBttsRate) / 2 
                };

                await sendTelegramAlert(event, analysis.key, metrics, analysis.confidence, 'BOT');
                
                sentTips.add(tipKey);
                // Limpa o cache de tips enviadas após 2 horas
                setTimeout(() => sentTips.delete(tipKey), 1000 * 60 * 120);
            }
        }
    }
}

const INSTANCE_ID = Math.random().toString(36).substring(2, 7).toUpperCase();

async function main() {
    console.log(`=== RW TIPS BOT RUNNER (24/7) INICIADO [INSTÂNCIA: ${INSTANCE_ID}] ===`);
    
    // Circuito infinito controlado para evitar sobreposição
    while (isRunning) {
        try {
            await runBot();
            
            // Auto-ping para evitar suspensão (Idle Timeout)
            try {
                const selfPingUrl = `http://localhost:${PORT}/`;
                await fetch(selfPingUrl).catch(() => {});
            } catch (p) {}

        } catch (e) {
            console.error("[BOT] Erro crítico no ciclo:", e);
        }
        
        // Espera o intervalo antes do próximo ciclo (ou sai se estiver parando)
        if (isRunning) {
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        }
    }
    console.log("[BOT] Loop encerrado.");
}

// Handlers para desligamento gracioso
const shutdown = () => {
    console.log("[BOT] Recebido sinal de parada. Encerrando...");
    isRunning = false;
    server.close(() => {
        console.log("[SERVER] Servidor de health check encerrado.");
        process.exit(0);
    });
    // Força a saída após 10s se não fechar
    setTimeout(() => process.exit(0), 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

main().catch(err => {
    console.error("[BOT] Falha fatal na inicialização:", err);
    process.exit(1);
});
