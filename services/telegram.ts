
import { LiveEvent } from '../types';
import { getLeagueInfo, STRATEGY_THEMES } from './analyzer';

const BOT_TOKEN = "6569266928:AAHm7pOJVsd3WKzJEgdVDez4ZYdCAlRoYO8";
const CHAT_ID = "-1001981134607";

// Lista de proxies para redundância, similar ao utilizado em services/api.ts
const PROXIES = [
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

const getDetailedSuggestion = (strategyKey: string, match: LiveEvent): string => {
  switch (strategyKey) {
    case 'ht_pro': return "🎯 <b>OVER 0.5 GOLS HT</b> (1º Tempo)";
    case 'ft_pro': return "🔥 <b>OVER 2.5 GOLS FT</b> (Partida)";
    case 'btts_pro_ht': return "🔄 <b>AMBAS MARCAM HT</b> (1º Tempo)";
    case 'casa_pro': return `🏠 <b>VITÓRIA: ${match.homePlayer}</b>`;
    case 'fora_pro': return `🚀 <b>VITÓRIA: ${match.awayPlayer}</b>`;
    case 'casa_engine_pro': return `⚙️ <b>OVER 1.5 GOLS: ${match.homePlayer}</b>`;
    case 'fora_engine_pro': return `⚙️ <b>OVER 1.5 GOLS: ${match.awayPlayer}</b>`;
    case 'top_clash': return "👑 <b>AMBAS MARCAM / OVER 2.5 FT</b>";
    default: return "📊 <b>ANALISAR MERCADO DISPONÍVEL</b>";
  }
};

export const sendTelegramAlert = async (match: LiveEvent, strategyKey: string, metrics: any, confidence: number = 70) => {
  const league = getLeagueInfo(match.leagueName);
  const theme = STRATEGY_THEMES[strategyKey] || { label: strategyKey.toUpperCase(), icon: 'fa-star' };
  
  const strategyLabel = theme.label;
  const suggestion = getDetailedSuggestion(strategyKey, match);
  
  const mHT = metrics.ht05?.toFixed(0) || '0';
  const mFT = metrics.ft25?.toFixed(0) || '0';
  const mBTTS = metrics.ftBtts?.toFixed(0) || '0';

  const getConfidenceIcon = (c: number) => {
    if (c >= 90) return '🟣';
    if (c >= 85) return '🟢';
    if (c >= 80) return '🟡';
    if (c >= 75) return '🟠';
    return '🔴';
  };

  const statusIcon = getConfidenceIcon(confidence);

  const message = `
👑 <b>RW TIPS - FIFA ANALYTICS</b> 🎮

✅ <b>ENTRADA CONFIRMADA</b> ✅

🏆 <b>LIGA:</b> <code>${league.name}</code>
⚔️ <b>CONFRONTO:</b> <code>${match.homePlayer} vs ${match.awayPlayer}</code>
📊 <b>ESTRATÉGIA:</b> <code>${strategyLabel}</code>
🔥 <b>CONFIANÇA:</b> <code>${confidence}%</code> ${statusIcon}

⏰ <b>TEMPO:</b> ${match.timer.formatted}
⚽ <b>PLACAR ATUAL:</b> ${match.score.home} - ${match.score.away}

📈 <b>INDICADORES DE VALOR:</b>
• Prob. Over 0.5 HT: <b>${mHT}%</b>
• Prob. Over 2.5 FT: <b>${mFT}%</b>
• Prob. Ambas Marcam: <b>${mBTTS}%</b>

💎 <b>SUGESTÃO DE ENTRADA:</b>
${suggestion}

⚠️ <i>Lembre-se: Analise as odds antes de entrar e faça sua gestão de banca!</i>

🔗 <a href="https://www.bet365.bet.br/#/IP/EV${match.bet365EventId || ''}"><b>ABRIR JOGO NA BET365</b></a>
  `.trim();

  const targetUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };

  // Tenta enviar através dos proxies disponíveis
  for (const getProxy of PROXIES) {
    try {
      const proxiedUrl = getProxy(targetUrl);
      const response = await fetch(proxiedUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`[RW TELEGRAM] Alerta enviado com sucesso via ${proxiedUrl.split('/')[2]}`);
        return; // Sucesso, sai da função
      } else {
        const errorText = await response.text();
        console.warn(`[RW TELEGRAM] Falha ao enviar via ${proxiedUrl.split('/')[2]}: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.warn(`[RW TELEGRAM] Erro de rede no proxy ${getProxy('').split('/')[2]}:`, error);
      continue; // Tenta o próximo proxy
    }
  }

  console.error("[RW TELEGRAM] Todos os proxies falharam ao tentar enviar a notificação.");
};
