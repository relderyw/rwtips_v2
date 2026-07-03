export interface RouletteTable {
  id: string;
  name: string;
  type: string;
  image: string;
  provider: string;
  dealerName: string | null;
  language: string;
  minBet: number;
  maxBet: number;
  seatsTotal: number;
  seatsTaken: number;
  lastResults: string[];
  launchAlias: string;
  gameCode: string;
  superbetGameId?: number; // numeric ID used in Superbet URLs
  url?: string;
}

export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
export const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

export const getNumberColor = (numStr: string): 'red' | 'black' | 'green' => {
  const num = parseInt(numStr, 10);
  if (isNaN(num)) return 'green';
  if (num === 0) return 'green';
  if (RED_NUMBERS.includes(num)) return 'red';
  if (BLACK_NUMBERS.includes(num)) return 'black';
  return 'green';
};

// ============================================================
// SUPERBET GAME ID MAPPING
// Maps API slug/id → numeric Superbet game ID used in URLs
// Format: https://superbet.bet.br/jogo/<slug>/<numericId>?demo=false
// Add more entries as discovered from the lobby page
// ============================================================
export const SUPERBET_GAME_IDS: Record<string, { numericId: number; slug: string }> = {
  // Speed Roulette variants
  'SpeedRoulette':                  { numericId: 339599, slug: 'speed-roulette' },
  'speed-roulette':                 { numericId: 339599, slug: 'speed-roulette' },
  'SpeedRouletteA':                 { numericId: 339599, slug: 'speed-roulette' },
  // Lightning Roulette
  'LightningRoulette':              { numericId: 339557, slug: 'lightning-roulette' },
  'lightning-roulette':             { numericId: 339557, slug: 'lightning-roulette' },
  'LightningRouletteA':             { numericId: 339557, slug: 'lightning-roulette' },
  // Immersive Roulette
  'ImmersiveRoulette':              { numericId: 339554, slug: 'immersive-roulette' },
  'immersive-roulette':             { numericId: 339554, slug: 'immersive-roulette' },
  // Roulette Live (generic)
  'Roulette':                       { numericId: 339547, slug: 'roulette' },
  'roulette':                       { numericId: 339547, slug: 'roulette' },
  // European Roulette Gold
  'EuropeanRouletteGold':           { numericId: 339548, slug: 'european-roulette-gold' },
  // Auto Roulette
  'AutoRoulette':                   { numericId: 339549, slug: 'auto-roulette' },
  'auto-roulette':                  { numericId: 339549, slug: 'auto-roulette' },
  // Bucharest Auto Roulette
  'BucharestAutoRoulette':          { numericId: 339552, slug: 'bucharest-auto-roulette' },
  // VIP Roulette
  'VIPRoulette':                    { numericId: 339551, slug: 'vip-roulette' },
  // Ruleta en Español
  'SpanishRoulette':                { numericId: 339553, slug: 'spanish-roulette' },
  // Salon Privé Roulette
  'SalonPriveRoulette':             { numericId: 339556, slug: 'salon-prive-roulette' },
  // Instant Roulette
  'InstantRoulette':                { numericId: 339558, slug: 'instant-roulette' },
  // XXXtreme Lightning Roulette
  'XXXtremeLightningRoulette':      { numericId: 339560, slug: 'xxxtreme-lightning-roulette' },
  // Double Ball Roulette
  'DoubleBallRoulette':             { numericId: 339561, slug: 'double-ball-roulette' },
  // Roulette Azure
  'RouletteAzure':                  { numericId: 339562, slug: 'roulette-azure' },
  // Spread Bet Roulette
  'SpreadBetRoulette':              { numericId: 339563, slug: 'spread-bet-roulette' },
  // Quantum Roulette
  'QuantumRoulette':                { numericId: 339564, slug: 'quantum-roulette' },
  // Gold Vault Roulette
  'GoldVaultRoulette':              { numericId: 339565, slug: 'gold-vault-roulette' },
  // Mega Roulette
  'MegaRoulette':                   { numericId: 339566, slug: 'mega-roulette' },
  // Funky Time (special)
  'FunkyTime':                      { numericId: 339567, slug: 'funky-time' },
  // Power Up Roulette
  'PowerUpRoulette':                { numericId: 339568, slug: 'power-up-roulette' },
};

/**
 * Converts a camelCase or PascalCase game ID to kebab-case slug.
 * e.g. "SpeedRoulette" → "speed-roulette"
 *      "LightningRouletteA" → "lightning-roulette-a"
 */
export const toKebabCase = (str: string): string => {
  return str
    .replace(/([A-Z])/g, '-$1')
    .replace(/^-/, '')
    .toLowerCase()
    .replace(/-+/g, '-');
};

/**
 * Builds the Superbet game URL for a given roulette table.
 * Uses the static mapping when available, falls back to slug-only.
 */
export const buildSuperbetUrl = (table: RouletteTable): string => {
  if (table.url) return table.url;
  const BASE = 'https://superbet.bet.br/jogo';

  // Check table's own numeric ID first
  if (table.superbetGameId) {
    const slug = toKebabCase(table.gameCode || table.id);
    return `${BASE}/${slug}/${table.superbetGameId}?demo=false`;
  }

  // Try static mapping by id then gameCode
  const entry = SUPERBET_GAME_IDS[table.id] || SUPERBET_GAME_IDS[table.gameCode];
  if (entry) {
    return `${BASE}/${entry.slug}/${entry.numericId}?demo=false`;
  }

  // Fallback: slug only (no numeric ID)
  const slug = toKebabCase(table.gameCode || table.id);
  return `${BASE}/${slug}?demo=false`;
};

/**
 * Converte uma URL absoluta da CDN de gaming para uma URL relativa via proxy,
 * evitando CORS. Suporta tanto prod-cdn-gaming quanto outros domínios.
 */
const toCdnProxyUrl = (url: string): string => {
  if (!url) return '';
  // Já é relativa (proxy já aplicado)
  if (url.startsWith('/')) return url;
  try {
    const parsed = new URL(url);
    // CDN principal da Superbet Gaming
    if (parsed.hostname.includes('prod-cdn-gaming') || parsed.hostname.includes('fastly.net')) {
      return `/api/gaming-cdn${parsed.pathname}${parsed.search}`;
    }
    // Estrelabet assets
    if (parsed.hostname.includes('estrelabet') || parsed.hostname.includes('assets.')) {
      return `/api/estrelabet${parsed.pathname}${parsed.search}`;
    }
  } catch (_) { /* ignore */ }
  return url;
};

/**
 * Extrai a URL de imagem de um objeto de jogo da API.
 * Tenta múltiplos campos comuns antes de usar fallback.
 */
export const extractImageUrl = (r: any): string => {
  // Tenta campos diretos de imagem na resposta da API
  const raw =
    r.thumbnails?.thumbnail ||
    r.thumbnails?.['150x188'] ||
    r.thumbnails?.medium ||
    r.thumbnails?.small ||
    r.thumbnail ||
    r.images?.thumbnail ||
    r.images?.medium ||
    r.imageUrl ||
    r.image ||
    r.gameThumbnail ||
    r.logo ||
    '';

  if (raw) return toCdnProxyUrl(raw);

  // Fallback: URL conhecida do estilo Estrelabet
  return `/api/estrelabet/uploads/games/EST/pt_pt${r.id}/pt_pt${r.id}.png`;
};

export interface MonitoredRoulette {
  id: string;
  url: string;
  overrideName?: string;
  overrideImage?: string;
  minBet?: number;
  maxBet?: number;
}

export const MONITORED_ROULETTES: MonitoredRoulette[] = [
  {
    id: "LightningTable01",
    url: "https://superbet.bet.br/jogo/lightning-roulette/818267?demo=false",
    overrideName: "Lightning Roulette",
    overrideImage:
      "https://static.egcdn.com/frontend/evo/branding/relampago_lro_immersive-logo.c1c7e3c.svg",
  },
  {
    id: "PorROULigh000001",
    url: "https://superbet.bet.br/jogo/lightning-roleta-relampago/113562?demo=false",
    overrideName: "Roleta Relâmpago",
  },
  {
    id: "287",
    url: "https://superbet.bet.br/jogo/mega-roleta-brasileira/632016?demo=false",
    overrideName: "Brazilian Mega Roulette",
  },
  {
    id: "2901",
    url: "https://superbet.bet.br/jogo/mega-roulette-3000/452209?demo=false",
    overrideName: "Mega Roulette 3000",
  },
];

const MONITORED_IDS = new Set(MONITORED_ROULETTES.map((r) => r.id));

export const fetchRoulettes = async (): Promise<RouletteTable[]> => {
  try {
    const response = await fetch(`/api/superbet-state?_t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const allGames: any[] = Array.isArray(data) ? data : Object.values(data);

    const overrideById = new Map(MONITORED_ROULETTES.map((r) => [r.id, r]));
    const filtered = allGames.filter((g) => MONITORED_IDS.has(g.id));

    const roulettes: RouletteTable[] = filtered.map((g) => {
      const override = overrideById.get(g.id)!;
      const results = g.results || [];
      return {
        id: g.id,
        name: override.overrideName ?? g.name,
        type: "Roulette",
        image: override.overrideImage ?? extractImageUrl(g),
        provider: g.provider || "Evolution",
        dealerName: g.dealerName || "Live",
        language: "pt",
        minBet: override.minBet ?? g.betLimit ?? 1,
        maxBet: override.maxBet ?? 25000,
        seatsTotal: 0,
        seatsTaken: g.players ?? 0,
        lastResults: results,
        launchAlias: g.id,
        gameCode: g.id,
        url: override.url,
      };
    });

    return roulettes;
  } catch (error) {
    console.error('Error fetching roulettes:', error);
    return [];
  }
};
