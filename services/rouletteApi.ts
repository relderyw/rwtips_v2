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

/**
 * Gera a URL da imagem de um jogo com base no padrão da Estrelabet.
 * Ex: alias 'rol_brazilianrol' → https://www.estrelabet.bet.br/uploads/games/EST/pt_ptrol_brazilianrol/pt_ptrol_brazilianrol.png
 */
export const getGameImageUrl = (alias: string): string =>
  `https://www.estrelabet.bet.br/uploads/games/EST/pt_pt${alias}/pt_pt${alias}.png`;

// IDs de roletas conhecidas que existem na Evolution mas não aparecem
// no endpoint de lobby da Estrelabet (ex: Roleta Brasileira).
// Podem ser adicionadas manualmente aqui para busca via endpoint alternativo.
const EXTRA_ROULETTE_IDS: { id: string; name: string; alias: string }[] = [
  { id: 'rol_brazilianrol', name: 'Roleta Brasileira', alias: 'rol_brazilianrol' },
];

export const fetchRoulettes = async (): Promise<RouletteTable[]> => {
  try {
    const response = await fetch(`/api/superbet-gaming/provider-socket/public/api/br/v2/state`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: any[] = await response.json();

    // Filtra apenas roletas da Superbet
    const roulettesData = data.filter((item: any) =>
      item.gameType?.toLowerCase() === 'roulette'
    );

    const roulettes: RouletteTable[] = roulettesData.map(r => {
      // Diferentes campos podem conter os resultados
      const lr = r.lastResults || r.results || r.roundHistory || r.history || r.drawResults || [];

      return {
        id: r.id,
        name: r.name,
        type: 'Roulette',
        image: getGameImageUrl(r.id), // Pode falhar se o ID não bater com o padrão da Evolution, mas mostrará o ícone fallback
        provider: r.provider || 'Evolution',
        dealerName: null,
        language: 'pt',
        minBet: r.betLimit || 0,
        maxBet: 0,
        seatsTotal: 0,
        seatsTaken: r.players || 0,
        lastResults: lr,
        launchAlias: r.id,
        gameCode: r.id,
      };
    });

    // Descobre quais IDs extras já estão presentes na resposta da API
    const presentIds = new Set(roulettes.map((r: any) => r.id));

    // Adiciona entradas conhecidas que estão ausentes na API com placeholder
    for (const extra of EXTRA_ROULETTE_IDS) {
      if (!presentIds.has(extra.id) && !presentIds.has(extra.alias)) {
        roulettes.push({
          id: extra.id,
          name: extra.name,
          type: 'Roulette',
          image: getGameImageUrl(extra.alias),
          provider: 'Evolution',
          dealerName: null,
          language: 'pt',
          minBet: 0,
          maxBet: 0,
          seatsTotal: 0,
          seatsTaken: 0,
          lastResults: [],
          launchAlias: extra.alias,
          gameCode: extra.alias,
        } as RouletteTable);
      }
    }

    return roulettes;
  } catch (error) {
    console.error('Error fetching roulettes:', error);
    return [];
  }
};
