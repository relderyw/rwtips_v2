import express from 'express';
import { analyzeMatchPotential, calculatePlayerStats, getLeagueInfo } from './services/analyzer.js';
import { sendTelegramAlert } from './services/telegram.js';

// Configurações
const API_BASE = process.env.API_BASE || "http://localhost:3001";
const PORT = process.env.PORT || 8080;
const POLL_INTERVAL = 15000; // 15 segundos

// Servidor de Health Check (Necessário para Koyeb/Render/Heroku não derrubarem o bot)
const app = express();
app.get('/', (req, res) => res.send('RW TIPS BOT IS ALIVE! 🚀'));
app.listen(PORT, () => console.log(`[SERVER] Health check rodando na porta ${PORT}`));

const sentTips = new Set<string>();

async function fetchHistory() {
    try {
        const res = await fetch(`${API_BASE}/api/app3/history`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: { sort: "-time", limit: 300, offset: 0 },
                filters: { status: 3, last_7_days: true, sort: "-time" }
            })
        });
        const d: any = await res.json();
        const results = d?.data?.results || [];
        return results.map((m: any) => ({
            home_player: m.player_home_name || m.player_name_1 || "",
            away_player: m.player_away_name || m.player_name_2 || "",
            league_name: m.league_name || "Esoccer",
            score_home: Number(m.total_goals_home ?? 0),
            score_away: Number(m.total_goals_away ?? 0),
            halftime_score_home: Number(m.ht_goals_home ?? 0),
            halftime_score_away: Number(m.ht_goals_away ?? 0),
            data_realizacao: m.time
        }));
    } catch (e) {
        console.error("Erro ao buscar histórico:", e);
        return [];
    }
}

async function fetchLive() {
    try {
        const response = await fetch(`${API_BASE}/api/app3/live-events`);
        const json: any = await response.json();
        return json.events || [];
    } catch (e) {
        console.error("Erro ao buscar live:", e);
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
            const tipKey = `${event.id}-${analysis.key}`;
            
            if (!sentTips.has(tipKey)) {
                console.log(`[BOT] 🚀 SINAL DETECTADO: ${event.homePlayer} vs ${event.awayPlayer} (${analysis.key}) - Confiança: ${analysis.confidence}%`);
                
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

// Inicia o bot
console.log("=== RW TIPS BOT RUNNER (24/7) INICIADO ===");
setInterval(runBot, POLL_INTERVAL);
runBot();
