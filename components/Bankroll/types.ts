import { Timestamp } from 'firebase/firestore';

export type BetResult = 'green' | 'red' | 'meio-green' | 'meio-red' | 'reembolso' | 'aguardando';

export type BetType = 'simples' | 'multipla';

export interface BetSelection {
  liga: string;
  jogador1: string;
  jogador2: string;
  mercado: string;
  odds: number;
}

export interface Bet {
  id?: string;
  type?: BetType; // Defaults to 'simples' if undefined
  selections?: BetSelection[]; // Only for type='multipla'
  liga: string; // For multiples, can be "Múltipla" or empty
  jogador1: string; // For multiples, can be summary info
  jogador2: string;
  mercado: string; // For multiples, e.g., "Triplas"
  stake: number;
  odds: number; // For multiples, this is the total combined odds
  resultado: BetResult;
  userEmail: string;
  timestamp: Timestamp | Date | any; // Handling Firebase timestamp nuances
  bankrollId?: string; // ID do gerenciamento
}

export interface Bankroll {
  id?: string;
  name: string;
  initialCapital: number;
  unitValue: number;
  userEmail: string;
  isDefault?: boolean;
}

export interface Market {
  id?: string;
  nome: string;
  categoria: string; // Nova propriedade
  userEmail: string;
  timestamp?: any;
  hidden?: boolean;
}

export interface ChartDataPoint {
  date: string;
  balance: number;
}
