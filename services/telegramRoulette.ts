import { RouletteTable } from './rouletteApi';
import { StrategyOpportunity } from '../components/Roulette/utils/rouletteStrategies';

const getEnvVar = (name: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name] || '';
  }
  // @ts-ignore - Vite env variables
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[`VITE_${name}`]) {
    // @ts-ignore
    return import.meta.env[`VITE_${name}`] || '';
  }
  return '';
};

const BOT_TOKEN = getEnvVar('TELEGRAM_BOT_TOKEN');

// Use a dedicated roulette chat ID if configured, otherwise fall back to main chat
const CHAT_ID = getEnvVar('TELEGRAM_ROULETTE_CHAT_ID') || getEnvVar('TELEGRAM_CHAT_ID');

const PROXIES = [
  (url: string) => url,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

/** Color emoji for roulette number color */
const colorEmoji = (color: 'red' | 'black' | 'green'): string => {
  if (color === 'red') return '🔴';
  if (color === 'black') return '⚫';
  return '🟢';
};

/** Strategy type icon */
const strategyIcon = (type: StrategyOpportunity['type']): string => {
  switch (type) {
    case 'color':      return '🎨';
    case 'terminal':   return '#️⃣';
    case 'column':     return '📊';
    case 'dozen':      return '🎯';
    case 'repetition': return '🔁';
    default:           return '📈';
  }
};

/** Confidence badge */
const confidenceBadge = (c: number): string => {
  if (c >= 90) return '🔥🔥🔥';
  if (c >= 80) return '🔥🔥';
  if (c >= 70) return '🔥';
  return '⚡';
};

import { getNumberColor } from './rouletteApi';

/**
 * Sends a personalized Telegram alert when a roulette trend is confirmed
 * (persisted across at least 2 consecutive update cycles).
 */
export const sendRouletteAlert = async (
  table: RouletteTable,
  opportunity: StrategyOpportunity,
  superbetUrl: string,
): Promise<void> => {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('[RW ROLETA] Bot token ou chat ID não configurados — alerta ignorado.');
    return;
  }

  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // Format last results as colored emoji sequence (most recent first)
  const historyStr = opportunity.history
    .map(n => `${colorEmoji(getNumberColor(n))}${n}`)
    .join(' › ');

  const icon = strategyIcon(opportunity.type);
  const badge = confidenceBadge(opportunity.confidence);

  const message = `
🎰 <b>RW TIPS — CASSINO AO VIVO</b>

${badge} <b>TENDÊNCIA CONFIRMADA</b> ${badge}

🎡 <b>MESA:</b> <code>${table.name}</code>
🏢 <b>PROVEDOR:</b> <code>${table.provider || 'Evolution Gaming'}</code>
👥 <b>JOGADORES:</b> <code>${table.seatsTaken}</code>

${icon} <b>ESTRATÉGIA:</b> <code>${opportunity.name}</code>
📈 <b>SEQUÊNCIA:</b> <code>${opportunity.streak}× consecutivos</code>
🎯 <b>CONFIANÇA:</b> <code>${opportunity.confidence}%</code>

🔢 <b>ÚLTIMOS NÚMEROS:</b>
${historyStr}

💡 <b>SUGESTÃO DE ENTRADA:</b>
<b>${opportunity.entryTip}</b>

🔗 <a href="${superbetUrl}"><b>🎮 JOGAR NA SUPERBET</b></a>

🕐 <i>${now}</i>
⚠️ <i>Gerencie sua banca. Resultados passados não garantem futuros.</i>
  `.trim();

  const targetUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
  };

  for (const getProxy of PROXIES) {
    try {
      const proxiedUrl = getProxy(targetUrl);
      const response = await fetch(proxiedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        console.log(`[RW ROLETA] Alerta enviado para ${table.name} — ${opportunity.name}`);
        return;
      }
    } catch (_) {
      continue;
    }
  }

  console.error(`[RW ROLETA] Falha ao enviar alerta Telegram para ${table.name}`);
};
