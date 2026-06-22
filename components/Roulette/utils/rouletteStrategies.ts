
import { RouletteTable, getNumberColor } from '../../../services/rouletteApi';

// ============================================
// TYPES & INTERFACES
// ============================================

export type StrategyType = 'color' | 'terminal' | 'column' | 'dozen';

export interface StrategyOpportunity {
  type: StrategyType;
  name: string;
  description: string;
  confidence: number; // 0-100
  target: string; // What to bet on (e.g., "red", "terminal 5", "column 1", "dozen 2")
  streak: number; // Length of the current streak that creates the opportunity
  history: string[]; // The last N numbers that formed the pattern
}

export interface RouletteAnalysis {
  tableId: string;
  opportunities: StrategyOpportunity[];
  stats: {
    colors: { red: number; black: number; green: number; total: number };
    terminals: Record<string, number>;
    columns: { 1: number; 2: number; 3: number; total: number };
    dozens: { 1: number; 2: number; 3: number; total: number };
  };
}

// ============================================
// CORE HELPERS
// ============================================

/** Get terminal (last digit) of a number */
export const getTerminal = (numStr: string): string => {
  const num = parseInt(numStr, 10);
  if (isNaN(num) || num === 0) return '0';
  return (num % 10).toString();
};

/** Get column (1, 2, or 3) of a number */
export const getColumn = (numStr: string): "1" | "2" | "3" => {
  const num = parseInt(numStr, 10);
  if (isNaN(num) || num === 0) return "1"; // default for 0, though it's green
  const mod = num % 3;
  return (mod === 0 ? 3 : mod).toString() as "1" | "2" | "3";
};

/** Get dozen (1: 1-12, 2: 13-24, 3:25-36) */
export const getDozen = (numStr: string): "1" | "2" | "3" => {
  const num = parseInt(numStr, 10);
  if (isNaN(num) || num === 0) return "1";
  if (num <= 12) return "1";
  if (num <= 24) return "2";
  return "3";
};

/** Calculate streak of same value from array start */
const calculateStreak = <T>(arr: string[], getValue: (item: string) => T): { value: T; count: number; history: string[] } => {
  if (arr.length === 0) return { value: "" as unknown as T, count: 0, history: [] };
  
  const firstValue = getValue(arr[0]);
  let count = 1;
  const history: string[] = [arr[0]];
  
  for (let i = 1; i < arr.length; i++) {
    const currentValue = getValue(arr[i]);
    if (currentValue === firstValue) {
      count++;
      history.push(arr[i]);
    } else {
      break;
    }
  }
  
  return { value: firstValue, count, history };
};

// ============================================
// STRATEGY DETECTORS
// ============================================

/**
 * Strategy 1: Repetições em cor
 * Detects when same color repeats multiple times, signaling potential color change
 */
const detectColorStrategy = (lastResults: string[]): StrategyOpportunity | null => {
  if (lastResults.length < 3) return null;
  
  const streak = calculateStreak(lastResults, getNumberColor);
  if (streak.value === 'green') return null; // Ignore green streaks for color strategy
  
  // Confidence increases with streak length
  const confidence = Math.min(95, 50 + (streak.count * 10));
  
  if (streak.count >= 3) {
    return {
      type: 'color',
      name: `Sequência de ${streak.value === 'red' ? 'Vermelhos' : 'Pretos'}`,
      description: `${streak.count}× ${streak.value === 'red' ? 'vermelhos' : 'pretos'} consecutivos - alta chance de troca de cor`,
      confidence,
      target: streak.value === 'red' ? 'preto' : 'vermelho',
      streak: streak.count,
      history: streak.history
    };
  }
  
  return null;
};

/**
 * Strategy 2: Repetições em terminais
 * Detects when same terminal repeats
 */
const detectTerminalStrategy = (lastResults: string[]): StrategyOpportunity | null => {
  if (lastResults.length < 2) return null;
  
  const streak = calculateStreak(lastResults, getTerminal);
  
  const confidence = Math.min(90, 60 + (streak.count * 8));
  
  if (streak.count >= 2) {
    return {
      type: 'terminal',
      name: `Terminal ${streak.value} em alta`,
      description: `${streak.count}× terminais com final ${streak.value} - potencial para continuação ou opostos`,
      confidence,
      target: `terminal ${streak.value}`,
      streak: streak.count,
      history: streak.history
    };
  }
  
  return null;
};

/**
 * Strategy 3: Repetições em Colunas
 */
const detectColumnStrategy = (lastResults: string[]): StrategyOpportunity | null => {
  if (lastResults.length < 2) return null;
  
  const streak = calculateStreak(lastResults, getColumn);
  
  const confidence = Math.min(90, 55 + (streak.count * 12));
  
  if (streak.count >= 2) {
    return {
      type: 'column',
      name: `Coluna ${streak.value} dominando`,
      description: `${streak.count}× números na coluna ${streak.value} - tendência identificada`,
      confidence,
      target: `coluna ${streak.value}`,
      streak: streak.count,
      history: streak.history
    };
  }
  
  return null;
};

/**
 * Strategy 4: Repetições em Dúzias
 */
const detectDozenStrategy = (lastResults: string[]): StrategyOpportunity | null => {
  if (lastResults.length < 2) return null;
  
  const streak = calculateStreak(lastResults, getDozen);
  
  const confidence = Math.min(90, 55 + (streak.count * 12));
  
  if (streak.count >= 2) {
    return {
      type: 'dozen',
      name: `Dúzia ${streak.value} em sequência`,
      description: `${streak.count}× números na dúzia ${streak.value} - padrão detectado`,
      confidence,
      target: `dúzia ${streak.value}`,
      streak: streak.count,
      history: streak.history
    };
  }
  
  return null;
};

// ============================================
// MAIN ANALYZER
// ============================================

export const analyzeRouletteTable = (table: RouletteTable): RouletteAnalysis => {
  const results = table.lastResults;
  
  // Calculate basic stats
  let red = 0, black = 0, green = 0;
  const terminals: Record<string, number> = {};
  let col1 = 0, col2 = 0, col3 = 0;
  let doz1 = 0, doz2 = 0, doz3 = 0;
  
  results.forEach(num => {
    const color = getNumberColor(num);
    if (color === 'red') red++;
    else if (color === 'black') black++;
    else green++;
    
    const term = getTerminal(num);
    terminals[term] = (terminals[term] || 0) + 1;
    
    const col = getColumn(num);
    if (col === "1") col1++;
    else if (col === "2") col2++;
    else col3++;
    
    const doz = getDozen(num);
    if (doz === "1") doz1++;
    else if (doz === "2") doz2++;
    else doz3++;
  });
  
  // Detect all strategies
  const opportunities: StrategyOpportunity[] = [];
  
  const colorOpp = detectColorStrategy(results);
  if (colorOpp) opportunities.push(colorOpp);
  
  const terminalOpp = detectTerminalStrategy(results);
  if (terminalOpp) opportunities.push(terminalOpp);
  
  const columnOpp = detectColumnStrategy(results);
  if (columnOpp) opportunities.push(columnOpp);
  
  const dozenOpp = detectDozenStrategy(results);
  if (dozenOpp) opportunities.push(dozenOpp);
  
  // Sort by confidence (highest first)
  opportunities.sort((a, b) => b.confidence - a.confidence);
  
  return {
    tableId: table.id,
    opportunities,
    stats: {
      colors: { red, black, green, total: red + black + green },
      terminals,
      columns: { 1: col1, 2: col2, 3: col3, total: col1 + col2 + col3 },
      dozens: { 1: doz1, 2: doz2, 3: doz3, total: doz1 + doz2 + doz3 }
    }
  };
};

