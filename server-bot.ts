import express from 'express';
import { analyzeMatchPotential, calculatePlayerStats } from './services/analyzer';
import { sendTelegramAlert } from './services/telegram';

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
app.get('/', (req, res) => res.send('RW TIPS BOT IS ALIVE! 🚀'));

const server = app.listen(PORT, '0.0.0.0', () => {
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
        
        if (analysis.key !== 'none' && analysis.confidence >= 70) {
            // Chave única baseada no ID do evento ou nos nomes dos jogadores + liga para maior estabilidade
            const eventCode = event.id || `${event.homePlayer}-${event.awayPlayer}`.replace(/\s+/g, '');
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

                await sendTelegramAlert(event, analysis.key, metrics, analysis.confidence);
                
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
