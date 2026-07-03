import { RouletteTable, getNumberColor } from '../../../services/rouletteApi';

// ============================================
// TYPES & INTERFACES
// ============================================

export type StrategyType = 'color' | 'terminal' | 'column' | 'dozen' | 'repetition';

export interface StrategyOpportunity {
  type: StrategyType;
  name: string;
  description: string;
  confidence: number; // 0-100 (assertiveness from backtest)
  target: string; // What to bet on
  streak: number; // Streak length or frequency count
  history: string[]; // The numbers forming the pattern
  entryTip: string; // Suggestion detail
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
// CORE HELPERS (Compatibility layer for strings)
// ============================================

/** Get terminal (last digit) of a number as string */
export const getTerminal = (numStr: string): string => {
  const num = parseInt(numStr, 10);
  if (isNaN(num) || num === 0) return '0';
  return (num % 10).toString();
};

/** Get column (1, 2, or 3) of a number as string */
export const getColumn = (numStr: string): "1" | "2" | "3" => {
  const num = parseInt(numStr, 10);
  if (isNaN(num) || num === 0) return "1";
  const mod = num % 3;
  return (mod === 0 ? 3 : mod).toString() as "1" | "2" | "3";
};

/** Get dozen (1: 1-12, 2: 13-24, 3:25-36) as string */
export const getDozen = (numStr: string): "1" | "2" | "3" => {
  const num = parseInt(numStr, 10);
  if (isNaN(num) || num === 0) return "1";
  if (num <= 12) return "1";
  if (num <= 24) return "2";
  return "3";
};

// ============================================
// INT HELPERS FOR BACKTEST ENGINE
// ============================================

const getTerminalInt = (n: number): number => {
  return n % 10;
};

const getColumnInt = (n: number): 1 | 2 | 3 | null => {
  if (n === 0) return null;
  const mod = n % 3;
  if (mod === 0) return 3;
  if (mod === 1) return 1;
  return 2;
};

const getDozenInt = (n: number): 1 | 2 | 3 | null => {
  if (n === 0) return null;
  if (n <= 12) return 1;
  if (n <= 24) return 2;
  return 3;
};

// ============================================
// BACKTESTING ENGINE
// ============================================

function backtest(
  numbers: number[],
  windowSize: number,
  predictor: (window: number[]) => (n: number) => boolean,
  baseRate: number = 33
): number {
  if (numbers.length < windowSize + 1) return baseRate;

  let hits = 0;
  let trials = 0;
  for (let i = 0; i < numbers.length - windowSize; i++) {
    const window = numbers.slice(i + 1, i + 1 + windowSize);
    const checkFn = predictor(window);
    const next = numbers[i];
    if (checkFn(next)) hits++;
    trials++;
  }

  if (trials === 0) return baseRate;

  const realRate = (hits / trials) * 100;
  if (trials < 10) {
    const weight = trials / 10;
    return Math.round(realRate * weight + baseRate * (1 - weight));
  }

  return Math.round(realRate);
}

// ============================================
// MAIN ANALYZER
// ============================================

export const analyzeRouletteTable = (table: RouletteTable): RouletteAnalysis => {
  const lastResults = table.lastResults;

  // Calculate basic stats
  let red = 0, black = 0, green = 0;
  const terminals: Record<string, number> = {};
  let col1 = 0, col2 = 0, col3 = 0;
  let doz1 = 0, doz2 = 0, doz3 = 0;

  lastResults.forEach(num => {
    const color = getNumberColor(num);
    if (color === 'red') red++;
    else if (color === 'black') black++;
    else green++;

    const term = getTerminal(num);
    terminals[term] = (terminals[term] || 0) + 1;

    const col = getColumn(num);
    if (col === "1") col1++;
    else if (col === "2") col2++;
    else if (col === "3") col3++;

    const doz = getDozen(num);
    if (doz === "1") doz1++;
    else if (doz === "2") doz2++;
    else if (doz === "3") doz3++;
  });

  const numbers = lastResults
    .map((r) => parseInt(r.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));

  const opportunities: StrategyOpportunity[] = [];

  if (numbers.length >= 5) {
    // ── Colunas ──
    const colCounts = { 1: 0, 2: 0, 3: 0 };
    const valid = numbers.filter((n) => n !== 0);
    for (const n of valid) {
      const c = getColumnInt(n);
      if (c) colCounts[c]++;
    }
    const colTotal = colCounts[1] + colCounts[2] + colCounts[3];

    let streakCol: number | null = null;
    let streakColLen = 0;
    for (const n of numbers) {
      const c = getColumnInt(n);
      if (!c) continue;
      if (streakCol === null) {
        streakCol = c;
        streakColLen = 1;
      } else if (c === streakCol) {
        streakColLen++;
      } else {
        break;
      }
    }

    const colDominant = ([1, 2, 3] as const).reduce((a, b) => colCounts[a] > colCounts[b] ? a : b);
    const colHasStreak = streakColLen >= 3 && streakCol !== null;
    const suggestedCol = colHasStreak
      ? (streakCol === 1 ? 2 : streakCol === 2 ? 3 : 1)
      : colDominant;

    const colName = (c: number) => `${c}ª Coluna`;
    const colNumbers = (c: number) =>
      c === 1 ? "(1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34)"
      : c === 2 ? "(2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35)"
      : "(3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36)";

    const colAssert = backtest(numbers, 6, (window) => {
      const wCounts = { 1: 0, 2: 0, 3: 0 };
      for (const n of window) {
        const c = getColumnInt(n);
        if (c) wCounts[c]++;
      }
      const wDominant = ([1, 2, 3] as const).reduce((a, b) => wCounts[a] > wCounts[b] ? a : b);

      let wStreak: number | null = null;
      let wLen = 0;
      for (const n of window) {
        const c = getColumnInt(n);
        if (!c) continue;
        if (!wStreak) {
          wStreak = c;
          wLen = 1;
        } else if (c === wStreak) {
          wLen++;
        } else {
          break;
        }
      }
      const wHasStreak = wLen >= 3 && wStreak !== null;
      const suggest = wHasStreak ? (wStreak === 1 ? 2 : wStreak === 2 ? 3 : 1) : wDominant;
      return (n: number) => getColumnInt(n) === suggest;
    });

    const isColAlert = streakColLen >= 2 && streakCol !== null;

    if (isColAlert) {
      opportunities.push({
        type: 'column',
        name: `Colunas`,
        description: colHasStreak
          ? `Coluna ${streakCol} saiu ${streakColLen}× seguidas`
          : `${Math.round((colCounts[colDominant] / (colTotal || 1)) * 100)}% dos resultados recentes nessa coluna`,
        confidence: colAssert,
        target: `coluna ${suggestedCol}`,
        streak: streakColLen,
        history: lastResults.slice(0, streakColLen),
        entryTip: `Apostar na ${colName(suggestedCol)} ${colNumbers(suggestedCol)}`,
      });
    }

    // ── Dúzias ──
    const dozCounts = { 1: 0, 2: 0, 3: 0 };
    for (const n of numbers) {
      const d = getDozenInt(n);
      if (d) dozCounts[d]++;
    }
    const dozTotal = dozCounts[1] + dozCounts[2] + dozCounts[3];

    let streakDoz: number | null = null;
    let streakDozLen = 0;
    for (const n of numbers) {
      const d = getDozenInt(n);
      if (!d) continue;
      if (streakDoz === null) {
        streakDoz = d;
        streakDozLen = 1;
      } else if (d === streakDoz) {
        streakDozLen++;
      } else {
        break;
      }
    }

    const dozDominant = ([1, 2, 3] as const).reduce((a, b) => dozCounts[a] > dozCounts[b] ? a : b);
    const dozPctDom = dozTotal > 0 ? Math.round((dozCounts[dozDominant] / dozTotal) * 100) : 33;
    const dozHasStreak = streakDozLen >= 3 && streakDoz !== null;
    const dozName = (d: number) => d === 1 ? "1ª Dúzia (1–12)" : d === 2 ? "2ª Dúzia (13–24)" : "3ª Dúzia (25–36)";
    const suggestedDoz = dozHasStreak
      ? (streakDoz === 1 ? 2 : streakDoz === 2 ? 3 : 1)
      : dozDominant;

    const dozAssert = backtest(numbers, 6, (window) => {
      const wCounts = { 1: 0, 2: 0, 3: 0 };
      for (const n of window) {
        const d = getDozenInt(n);
        if (d) wCounts[d]++;
      }
      const wDominant = ([1, 2, 3] as const).reduce((a, b) => wCounts[a] > wCounts[b] ? a : b);
      let wStreak: number | null = null;
      let wLen = 0;
      for (const n of window) {
        const d = getDozenInt(n);
        if (!d) continue;
        if (!wStreak) {
          wStreak = d;
          wLen = 1;
        } else if (d === wStreak) {
          wLen++;
        } else {
          break;
        }
      }
      const wHasStreak = wLen >= 3 && wStreak !== null;
      const suggest = wHasStreak ? (wStreak === 1 ? 2 : wStreak === 2 ? 3 : 1) : wDominant;
      return (n: number) => getDozenInt(n) === suggest;
    });

    const isDozAlert = streakDozLen >= 2 && streakDoz !== null;

    if (isDozAlert) {
      opportunities.push({
        type: 'dozen',
        name: `Dúzias`,
        description: dozHasStreak
          ? `${dozName(streakDoz!)} saiu ${streakDozLen}× seguidas`
          : `${dozPctDom}% dos resultados recentes nessa dúzia`,
        confidence: dozAssert,
        target: `dúzia ${suggestedDoz}`,
        streak: streakDozLen,
        history: lastResults.slice(0, streakDozLen),
        entryTip: `Apostar na ${dozName(suggestedDoz)}`,
      });
    }

    // ── Terminais ──
    const termCount: Record<number, number> = {};
    for (let t = 0; t <= 9; t++) termCount[t] = 0;

    const recentNumbers = numbers.slice(0, 10);
    for (const n of recentNumbers) {
      const t = getTerminalInt(n);
      termCount[t]++;
    }

    const sortedTerm = Object.entries(termCount).sort((a, b) => b[1] - a[1]);
    const hotTerminal = parseInt(sortedTerm[0][0]);
    const hotTermCount = sortedTerm[0][1];

    const termAssert = backtest(numbers, 5, (window) => {
      const wCount: Record<number, number> = {};
      for (let t = 0; t <= 9; t++) wCount[t] = 0;
      for (const n of window) wCount[getTerminalInt(n)]++;
      const hot = Object.entries(wCount).sort((a, b) => b[1] - a[1])[0];
      const suggestTerminal = parseInt(hot[0]);
      return (n: number) => getTerminalInt(n) === suggestTerminal;
    }, 10);

    const isTermAlert = hotTermCount >= 4;

    if (isTermAlert) {
      const termNumsList = lastResults.slice(0, 10).filter(n => getTerminal(n) === hotTerminal.toString());
      opportunities.push({
        type: 'terminal',
        name: `Terminais`,
        description: `Terminal *${hotTerminal} apareceu ${hotTermCount}× nas últimas 10 rodadas`,
        confidence: termAssert,
        target: `terminal ${hotTerminal}`,
        streak: hotTermCount,
        history: termNumsList,
        entryTip: `Apostar em números com final ${hotTerminal}`,
      });
    }

    // ── Repetição ──
    const freqMap = new Map<number, number>();
    for (const n of recentNumbers) {
      freqMap.set(n, (freqMap.get(n) ?? 0) + 1);
    }

    const repeaters = Array.from(freqMap.entries())
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1]);

    const hotNumber = repeaters[0]?.[0] ?? null;
    const repCount = repeaters[0]?.[1] ?? 0;

    const repAssert = backtest(numbers, 8, (window) => {
      const wMap = new Map<number, number>();
      for (const n of window) wMap.set(n, (wMap.get(n) ?? 0) + 1);
      const topNum = Array.from(wMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
      return (n: number) => n === topNum;
    }, 3);

    const isRepAlert = repCount >= 3 && hotNumber !== null;

    if (isRepAlert) {
      opportunities.push({
        type: 'repetition',
        name: `Repetição`,
        description: `Número ${hotNumber} saiu ${repCount}× nas últimas 10 rodadas`,
        confidence: repAssert,
        target: `número ${hotNumber}`,
        streak: repCount,
        history: lastResults.slice(0, 10).filter(n => parseInt(n, 10) === hotNumber),
        entryTip: `Número ${hotNumber} está repetindo bastante`,
      });
    }
  }

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
