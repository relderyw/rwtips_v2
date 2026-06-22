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

export const fetchRoulettes = async (): Promise<RouletteTable[]> => {
  try {
    const timestamp = new Date().getTime();
    const response = await fetch(`/api/estrelabet/dynamic-lobby/current-state.json?t=${timestamp}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.filter((item: any) =>
      item.type?.toLowerCase() === 'roulette' &&
      item.lastResults &&
      item.lastResults.length > 0
    );
  } catch (error) {
    console.error('Error fetching roulettes:', error);
    return [];
  }
};
