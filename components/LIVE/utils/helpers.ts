// Função para obter cor do status
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'NS': return 'bg-slate-600 text-slate-300';
    case '1st': return 'bg-emerald-500 text-white animate-pulse';
    case 'HT': return 'bg-yellow-500 text-black';
    case '2nd': return 'bg-emerald-500 text-white animate-pulse';
    case 'FT': return 'bg-slate-700 text-slate-300';
    default: return 'bg-slate-600 text-slate-300';
  }
};

// Função para obter texto do status
export const getStatusText = (status: string): string => {
  switch (status) {
    case 'NS': return 'Aguardando';
    case '1st': return '1º Tempo';
    case 'HT': return 'Intervalo';
    case '2nd': return '2º Tempo';
    case 'FT': return 'Finalizado';
    default: return status;
  }
};

interface PressureItem {
  min: string | number;
  home: number;
  away: number;
}

// Processar dados de pressão
export const processPressureData = (matchData: any): PressureItem[] => {
  if (!matchData) return [];
  
  const pressureData: PressureItem[] = [];
  
  const processPressureBar = (homeData: string, awayData: string) => {
    try {
      const home = JSON.parse(homeData);
      const away = JSON.parse(awayData);
      
      home.forEach((item: any, index: number) => {
        if (away[index]) {
          pressureData.push({
            min: item.minuto,
            home: item.valor,
            away: away[index].valor
          });
        }
      });
    } catch (e) {
      console.error('Erro ao processar pressão:', e);
    }
  };
  
  if (matchData.barra015_home && matchData.barra015_away) {
    processPressureBar(matchData.barra015_home, matchData.barra015_away);
  }
  if (matchData.barra1530_home && matchData.barra1530_away) {
    processPressureBar(matchData.barra1530_home, matchData.barra1530_away);
  }
  if (matchData.barra3045_home && matchData.barra3045_away) {
    processPressureBar(matchData.barra3045_home, matchData.barra3045_away);
  }
  
  return pressureData;
};

// Processar probabilidades
export const processProbabilities = (matchData: any) => {
  if (!matchData?.prognosticos) return null;
  
  try {
    const prog = JSON.parse(matchData.prognosticos);
    return {
      firstHalf: {
        home: prog.mercado_1x2_1t?.casa_vencer?.probabilidade || 0,
        draw: prog.mercado_1x2_1t?.empate?.probabilidade || 0,
        away: prog.mercado_1x2_1t?.fora_vencer?.probabilidade || 0
      },
      fullMatch: {
        home: prog.mercado_1x2?.casa_vencer?.probabilidade || 0,
        draw: prog.mercado_1x2?.empate?.probabilidade || 0,
        away: prog.mercado_1x2?.fora_vencer?.probabilidade || 0
      },
      doubleChance: {
        home: prog.mercado_1x2?.casa_ou_empate?.probabilidade || 0,
        draw: prog.mercado_1x2?.casa_ou_fora?.probabilidade || 0,
        away: prog.mercado_1x2?.fora_ou_empate?.probabilidade || 0
      }
    };
  } catch (e) {
    console.error('Erro ao processar probabilidades:', e);
    return null;
  }
};

interface RecentMatch {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  score: string;
  isWin: boolean;
  isDraw: boolean;
}

// Processar últimos jogos
export const processRecentMatches = (matchData: any, side: 'home' | 'away', subjectTeamName: string): RecentMatch[] => {
  if (!matchData) return [];
  
  try {
    const h2hArray = side === 'home' 
      ? JSON.parse(matchData.h2h_home_full_time || '[]')
      : JSON.parse(matchData.h2h_away_full_time || '[]');
    
    return h2hArray.slice(0, 5).map((m: any) => {
      // Tentar identificar se o time em questão era o mandante
      // Normalizando strings para comparação (remove espaços extras, lowercase)
      const normalize = (str: string) => str?.toLowerCase().trim();
      const subject = normalize(subjectTeamName);
      const home = normalize(m.homeTeam);
      
      // Se o nome do mandante contém o nome do time sujeito (ou vice-versa), assumimos que ele era o mandante
      // Isso ajuda com variações como "Corinthians SP" vs "Corinthians"
      const isSubjectHome = home.includes(subject) || subject.includes(home);
      
      const homeScore = parseInt(m.FullTime?.goal_home || '0');
      const awayScore = parseInt(m.FullTime?.goal_away || '0');
      
      let isWin = false;
      let isDraw = homeScore === awayScore;
      
      if (isSubjectHome) {
        isWin = homeScore > awayScore;
      } else {
        isWin = awayScore > homeScore;
      }

      return {
        date: m.starting_at?.split('/').slice(0, 2).join('/') || '',
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: homeScore,
        awayScore: awayScore,
        score: `${homeScore}-${awayScore}`,
        isWin,
        isDraw
      };
    });
  } catch (e) {
    console.error('Erro ao processar últimos jogos:', e);
    return [];
  }
};
