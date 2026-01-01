import express from 'express';
// Force Render Update - V2
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
app.get('/', (req, res) => res.send('RW TIPS BOT IS ALIVE! 🚀 [V2 - WITH NEXT GAMES]'));

// Função para buscar próximos jogos via BetsAPI (RapidAPI)
// Adaptação do código Python fornecido pelo usuário
async function fetchBetsApiUpcomingEvents() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const url = 'https://betsapi2.p.rapidapi.com/v1/bet365/upcoming';

    try {
        console.log(`[API] Buscando eventos para o dia: ${today}`);
        const response = await axios.get(url, {
            timeout: 8000, // Timeout de 8s
            params: {
                sport_id: '1',       // 1 = Futebol
                day: today
            },
            headers: {
                'X-RapidAPI-Key': '05731d6e8emsh4479ae2409717dep1c7713jsn1ca3de816712',
                'X-RapidAPI-Host': 'betsapi2.p.rapidapi.com'
            }
        });

        const data = response.data;
        if (data && data.success === 1 && data.results) {
            console.log(`[API] Encontrados ${data.results.length} eventos.`);
            
            // Mapeia para o formato que o frontend espera
            return data.results.map((event: any) => ({
                id: event.id || 'N/A',
                home: { 
                    name: event.home.name, 
                    team: event.home.name, // BetsAPI geralmente dá o nome completo, usamos como placeholder
                    image: event.home.image_id ? `https://assets.b365api.com/images/team/m/${event.home.image_id}.png` : '' 
                },
                away: { 
                    name: event.away.name, 
                    team: event.away.name, 
                    image: event.away.image_id ? `https://assets.b365api.com/images/team/m/${event.away.image_id}.png` : ''
                },
                time: new Date(Number(event.time) * 1000).toLocaleString('pt-BR'), // Converte timestamp UNIX
                league: { name: event.league.name }
            }));
        } else {
            console.log('[API] Nenhum evento encontrado ou resposta inesperada:', data);
            return [];
        }
    } catch (error) {
        console.error('[API] Erro ao buscar eventos na BetsAPI:', error);
        return [];
    }
}

// Função para fazer scraping de dados do Drafted.gg (para Esoccer)
async function scrapeDraftedGames() {
    try {
        console.log('[SCRAPER] Buscando jogos no Drafted.gg...');
        const response = await axios.get('https://drafted.gg', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const games: any[] = [];

        // Seleciona os containers de jogos (Desktop view)
        // O seletor baseia-se na estrutura fornecida: div com bg-foreground e hidden lg:flex
        const matchCards = $('.w-full.bg-foreground.rounded-lg.hidden.lg\\:flex');

        matchCards.each((_, element) => {
            const card = $(element);
            
            // Home Team
            // Procura o primeiro nome e time
            const homeName = card.find('.uppercase.text-3\\.5xl').first().text().trim();
            const homeTeam = card.find('.font-nunito').first().text().trim();
            // Imagem pode estar no container da esquerda ou no logo
            // Tenta pegar o logo primeiro (img dentro de border)
            let homeImage = card.find('img[src*="teams/icons"]').first().attr('src');
            // Se não achar logo, tenta a imagem do jogador
            if (!homeImage) homeImage = card.find('img').first().attr('src');
            // Ajusta URL relativa se necessário (embora pareçam absolutas no snippet)
            if (homeImage && homeImage.startsWith('/')) homeImage = `https://drafted.gg${homeImage}`;

            // Away Team
            // Procura o segundo nome e time
            const awayName = card.find('.uppercase.text-3\\.5xl').last().text().trim();
            const awayTeam = card.find('.font-nunito').last().text().trim();
            let awayImage = card.find('img[src*="teams/icons"]').last().attr('src');
            if (!awayImage) awayImage = card.find('img').last().attr('src');
            if (awayImage && awayImage.startsWith('/')) awayImage = `https://drafted.gg${awayImage}`;

            // Time / League
            // O tempo geralmente está no meio. O snippet mostrava grid-cols-3.
            // A coluna do meio deve ter o tempo.
            const middleCol = card.find('.grid.grid-cols-3 > div').eq(1); // Segunda coluna (índice 1)
            let time = middleCol.text().trim();
            // Limpa o texto para tentar achar hora (ex: "VS 09:20")
            const timeMatch = time.match(/\d{2}:\d{2}/);
            time = timeMatch ? `Hoje ${timeMatch[0]}` : "Aguardando";

            // ID único
            const id = `dg-${homeName}-${awayName}-${Date.now()}`.replace(/\s+/g, '-').toLowerCase();

            if (homeName && awayName) {
                games.push({
                    id: id,
                    home: { name: homeName, team: homeTeam, image: homeImage || '' },
                    away: { name: awayName, team: awayTeam, image: awayImage || '' },
                    time: time,
                    league: { name: 'Esoccer (Drafted)' } // Hardcoded já que é do drafted.gg
                });
            }
        });

        console.log(`[SCRAPER] Encontrados ${games.length} jogos no Drafted.gg`);
        return games;
    } catch (error) {
        console.error('[SCRAPER] Erro ao fazer scraping:', error);
        return [];
    }
}

// Endpoint para Próximos Jogos (BetsAPI + Scraping)
app.get('/api/next-games', async (req, res) => {
    try {
        console.log('[API] Recebida solicitação para /api/next-games');
        
        // Executa em paralelo para ser mais rápido
        const [apiGames, scrapedGames] = await Promise.all([
            fetchBetsApiUpcomingEvents().catch(err => {
                console.error("Erro na API Bets:", err);
                return [];
            }),
            scrapeDraftedGames().catch(err => {
                console.error("Erro no Scraper:", err);
                return [];
            })
        ]);

        const allGames = [...scrapedGames, ...apiGames]; // Prioriza Scraped (aparecem primeiro) ou misturado
        
        console.log(`[API] Retornando total de ${allGames.length} jogos (${scrapedGames.length} via Scraper, ${apiGames.length} via API)`);
        res.json({ success: true, results: allGames });
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
