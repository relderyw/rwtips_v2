import { LiveEvent } from '../types';
import { getLeagueInfo, STRATEGY_THEMES } from './analyzer';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

const PROXIES = [
    (url: string) => url,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

const getDetailedSuggestion = (strategyKey: string, match: LiveEvent): string => {
  switch (strategyKey) {
    case 'ht_pro': return " <b>OVER 0.5 GOLS HT</b> (1º Tempo)";
    case 'ft_pro': return " <b>OVER 2.5 GOLS FT</b> (Partida)";
    case 'btts_pro_ht': return " <b>AMBAS MARCAM HT</b> (1º Tempo)";
    case 'casa_pro': return ` <b>VITÓRIA: ${match.homePlayer}</b>`;
    case 'fora_pro': return ` <b>VITÓRIA: ${match.awayPlayer}</b>`;
    case 'casa_engine_pro': return ` <b>OVER 1.5 GOLS: ${match.homePlayer}</b>`;
    case 'fora_engine_pro': return ` <b>OVER 1.5 GOLS: ${match.awayPlayer}</b>`;
    case 'top_clash': return " <b>AMBAS MARCAM / OVER 2.5 FT</b>";
    default: return " <b>ANALISAR MERCADO DISPONÍVEL</b>";
  }
};

export const sendTelegramAlert = async (match: LiveEvent, strategyKey: string, metrics: any, confidence: number = 70, source: 'BOT' | 'PLATFORM' = 'BOT', reasons: string[] = []) => {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('[RW TELEGRAM] Bot token ou chat id não configurados');
    return;
  }
  const league = getLeagueInfo(match.leagueName);
  const theme = STRATEGY_THEMES[strategyKey] || { label: strategyKey.toUpperCase(), icon: 'fa-star' };
  
  const strategyLabel = theme.label;
  const suggestion = getDetailedSuggestion(strategyKey, match);
  
  const mHT = metrics.ht05?.toFixed(0) || '0';
  const mFT = metrics.ft25?.toFixed(0) || '0';
  const mBTTS = metrics.ftBtts?.toFixed(0) || '0';

  const getConfidenceIcon = (c: number) => {
    if (c >= 90) return '';
    if (c >= 85) return '';
    if (c >= 80) return '';
    if (c >= 75) return '';
    return '';
  };

  const statusIcon = getConfidenceIcon(confidence);

  const header = source === 'PLATFORM' ? ' <b>VIA WEB</b> ' : ' <b>ROBÔ AUTO</b> ';
  const motivosStr = reasons.length > 0 ? `\n <b>NOTAS:</b> <i>${reasons.join(', ')}</i>` : '';

  const estrelaLink = `https://www.estrelabet.bet.br/apostas-ao-vivo?page=liveEvent&eventId=${match.bet365EventId || ''}&sportId=66`;
  const message = `
 <b>RW TIPS - FIFA ANALYTICS</b> 
${header}

 <b>ENTRADA CONFIRMADA</b> 

 <b>LIGA:</b> <code>${league.name}</code>
 <b>CONFRONTO:</b> <code>${match.homePlayer} vs ${match.awayPlayer}</code>
 <b>ESTRATÉGIA:</b> <code>${strategyLabel}</code>
 <b>CONFIANÇA:</b> <code>${confidence}%</code> ${statusIcon} ${motivosStr}

 <b>TEMPO:</b> ${match.timer.formatted}
 <b>PLACAR ATUAL:</b> ${match.score.home} - ${match.score.away}

 <b>INDICADORES DE VALOR:</b>
 Prob. Over 0.5 HT: <b>${mHT}%</b>
 Prob. Over 2.5 FT: <b>${mFT}%</b>
 Prob. Ambas Marcam: <b>${mBTTS}%</b>

 <b>SUGESTÃO DE ENTRADA:</b>
${suggestion}

 <i>Lembre-se: Analise as odds antes de entrar e faça sua gestão de banca!</i>


 <a href="${estrelaLink}"><b>CONFRONTO</b></a>
  `.trim();

  const targetUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };

  for (const getProxy of PROXIES) {
    try {
      const proxiedUrl = getProxy(targetUrl);
      const response = await fetch(proxiedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) return;
    } catch (error) {
      continue;
    }
  }
};

export const sendTelegramPhoto = async (base64Data: string, caption: string) => {
  if (!BOT_TOKEN || !CHAT_ID) return;

  try {
    const base64Image = base64Data.split(';base64,').pop() || '';
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    
    if (typeof window === 'undefined') {
       const buffer = Buffer.from(base64Image, 'base64');
       const blob = new Blob([buffer], { type: 'image/png' });
       formData.append('photo', blob, 'screenshot.png');
    } else {
       const parts = base64Data.split(';base64,');
       const contentType = parts[0].split(':')[1];
       const raw = window.atob(parts[1]);
       const uInt8Array = new Uint8Array(raw.length);
       for (let i = 0; i < raw.length; ++i) uInt8Array[i] = raw.charCodeAt(i);
       const blob = new Blob([uInt8Array], { type: contentType });
       formData.append('photo', blob, 'screenshot.png');
    }

    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');

    const targetUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;

    for (const getProxy of PROXIES) {
      try {
        const proxiedUrl = getProxy(targetUrl);
        const response = await fetch(proxiedUrl, {
          method: 'POST',
          body: formData
        });
        if (response.ok) return;
      } catch (err) {
        continue;
      }
    }
  } catch (err) {
    console.error('[RW TELEGRAM] Error sending photo:', err);
  }
};