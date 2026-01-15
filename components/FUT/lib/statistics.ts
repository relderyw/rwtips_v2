
interface PerformanceData {
  // Old API structure (performance endpoint)
  event?: {
    id: number
    slug: string
    timeStartTimestamp: string
    score: {
      home: number
      away: number
    }
    result?: string
  }
  homeTeam?: {
    id: number
    name: string
    slug: string
    shortname: string
  }
  awayTeam?: {
    id: number
    name: string
    slug: string
    shortname: string
  }
  league?: {
    name: string
    id: number
    slug: string
  }
  statistics?: any
  opponentStatistics?: any
  
  // New API structure (event-statistics endpoint)
  event_id?: number
  home_team_id?: number
  away_team_id?: number
  home_score?: number
  away_score?: number
  home_value?: string | number
  away_value?: string | number
  home_team_name?: string
  away_team_name?: string
  home_team_slug?: string
  away_team_slug?: string
  league_id?: number
  league_name?: string
  league_slug?: string
  time_start_timestamp?: string
}

export interface TeamStatistics {
  matchesPlayed: number
  wins: number
  draws: number
  losses: number
  winRate: number
  goalsScored: number
  goalsConceded: number
  cleanSheets: number
  bothTeamsScore: number
  over25: number
  form: string[]
}

export function calculateTeamStatistics(matches: PerformanceData[], teamId: string): TeamStatistics {
  const teamIdNum = Number.parseInt(teamId)

  let wins = 0
  let draws = 0
  let losses = 0
  let totalGoalsScored = 0
  let totalGoalsConceded = 0
  let cleanSheets = 0
  let bothTeamsScore = 0
  let over25 = 0
  const form: string[] = []

  for (const match of matches) {
    // Check if using new API structure (event-statistics)
    const isHome = match.home_team_id ? match.home_team_id === teamIdNum : match.homeTeam?.id === teamIdNum
    
    // Handle both API structures
    let teamScore = 0
    let opponentScore = 0
    if (match.home_score !== undefined) {
      // New API structure
      teamScore = isHome ? (match.home_score || 0) : (match.away_score || 0)
      opponentScore = isHome ? (match.away_score || 0) : (match.home_score || 0)
    } else if (match.event?.score) {
      // Old API structure
      teamScore = isHome ? match.event.score.home : match.event.score.away
      opponentScore = isHome ? match.event.score.away : match.event.score.home
    }

    // Goals
    totalGoalsScored += teamScore
    totalGoalsConceded += opponentScore

    // Result - using the result field from API
    if (match.event?.result === "win") {
      wins++
      form.push("W")
    } else if (match.event?.result === "draw") {
      draws++
      form.push("D")
    } else if (match.event?.result === "loss") {
      losses++
      form.push("L")
    }

    // Clean sheets
    if (opponentScore === 0) {
      cleanSheets++
    }

    // Both teams score
    if (teamScore > 0 && opponentScore > 0) {
      bothTeamsScore++
    }

    // Over 2.5 goals
    if (teamScore + opponentScore > 2.5) {
      over25++
    }
  }

  const matchesPlayed = matches.length

  return {
    matchesPlayed,
    wins,
    draws,
    losses,
    winRate: matchesPlayed > 0 ? (wins / matchesPlayed) * 100 : 0,
    goalsScored: matchesPlayed > 0 ? totalGoalsScored / matchesPlayed : 0,
    goalsConceded: matchesPlayed > 0 ? totalGoalsConceded / matchesPlayed : 0,
    cleanSheets: matchesPlayed > 0 ? (cleanSheets / matchesPlayed) * 100 : 0,
    bothTeamsScore: matchesPlayed > 0 ? (bothTeamsScore / matchesPlayed) * 100 : 0,
    over25: matchesPlayed > 0 ? (over25 / matchesPlayed) * 100 : 0,
    form: form.slice(0, 5),
  }
}

export interface DetailedStatistics {
  totalMatches: number
  successCount: number
  successRate: number
  matchResults: boolean[]
  matchValues: number[] // Added to store the actual statistic value for each match
  // Goals statistics
  goalsOver05: number
  goalsOver15: number
  goalsOver25: number
  goalsOver35: number
  goalsUnder05: number
  goalsUnder15: number
  goalsUnder25: number
  goalsUnder35: number
  // Corners statistics
  cornersOver45: number
  cornersOver65: number
  cornersOver85: number
  cornersOver105: number
  cornersUnder45: number
  cornersUnder65: number
  cornersUnder85: number
  cornersUnder105: number
  // Cards statistics
  cardsOver15: number
  cardsOver25: number
  cardsOver35: number
  cardsOver45: number
  cardsUnder15: number
  cardsUnder25: number
  cardsUnder35: number
  cardsUnder45: number
}

export function calculateDetailedStatistics(
  matches: PerformanceData[],
  teamId: string,
  statisticType: string,
  timePeriod: string,
  comparisonType: string,
  comparisonValue: number,
): DetailedStatistics {
  console.log("[v0] Calculating statistics for:", {
    statisticType,
    timePeriod,
    comparisonType,
    comparisonValue,
    matchesCount: matches.length,
  })

  const teamIdNum = Number.parseInt(teamId)
  const matchResults: boolean[] = []
  const matchValues: number[] = []

  let goalsOver05 = 0
  let goalsOver15 = 0
  let goalsOver25 = 0
  let goalsOver35 = 0

  let cornersOver45 = 0
  let cornersOver65 = 0
  let cornersOver85 = 0
  let cornersOver105 = 0

  let cardsOver15 = 0
  let cardsOver25 = 0
  let cardsOver35 = 0
  let cardsOver45 = 0

  for (const match of matches) {
    // Check if using new API structure (event-statistics)
    const isHome = match.home_team_id ? match.home_team_id === teamIdNum : match.homeTeam?.id === teamIdNum

    let statValue = 0

    if (statisticType === "goals") {
      // Check if we're using the new API structure (event-statistics)
      // New structure has home_score and away_score directly in the match object
      let homeScore = 0
      let awayScore = 0

      if ('home_score' in match && 'away_score' in match) {
        // New API structure from /event-statistics endpoint
        homeScore = match.home_score || 0
        awayScore = match.away_score || 0
        
        // Total goals in the match (already filtered by time period from API)
        statValue = homeScore + awayScore
        
        console.log("[v0] New API structure - Match goals:", { 
          matchId: match.event_id || match.event?.id, 
          homeScore, 
          awayScore, 
          total: statValue 
        })
      } else {
        // Old structure from /performance endpoint
        const teamStats = match.statistics || {}
        const opponentStats = match.opponentStatistics || {}
        const teamGoals = teamStats.goals ?? 0
        const opponentGoals = opponentStats.goals ?? 0
        statValue = teamGoals + opponentGoals
        
        console.log("[v0] Old API structure - Match goals:", { 
          matchId: match.event?.id, 
          teamGoals, 
          opponentGoals, 
          total: statValue 
        })
      }
    } else if (statisticType === "corners") {
      // Check if using new API structure (event-statistics)
      if ('home_value' in match && 'away_value' in match) {
        // New API structure - values come as strings
        const homeValue = parseFloat(match.home_value as string) || 0
        const awayValue = parseFloat(match.away_value as string) || 0
        statValue = homeValue + awayValue
        
        console.log("[v0] New API structure - Match corners:", { 
          matchId: match.event_id, 
          homeValue, 
          awayValue, 
          total: statValue 
        })
      } else {
        // Old structure from /performance endpoint
        const teamStats = match.statistics || {}
        const opponentStats = match.opponentStatistics || {}
        const teamCorners = teamStats.cornerKicks ?? teamStats.corners ?? 0
        const opponentCorners = opponentStats.cornerKicks ?? opponentStats.corners ?? 0
        statValue = teamCorners + opponentCorners
        
        console.log("[v0] Old API structure - Match corners:", { 
          matchId: match.event?.id, 
          teamCorners, 
          opponentCorners, 
          total: statValue 
        })
      }
    } else if (statisticType === "cards") {
      // Check if using new API structure (event-statistics)
      if ('home_value' in match && 'away_value' in match) {
        // New API structure - values come as strings
        const homeValue = parseFloat(match.home_value as string) || 0
        const awayValue = parseFloat(match.away_value as string) || 0
        statValue = homeValue + awayValue
        
        console.log("[v0] New API structure - Match cards:", { 
          matchId: match.event_id,
          homeValue,
          awayValue,
          total: statValue
        })
      } else {
        // Old structure from /performance endpoint
        const teamStats = match.statistics || {}
        const opponentStats = match.opponentStatistics || {}
        const teamYellow = teamStats.yellowCards ?? 0
        const teamRed = teamStats.redCards ?? 0
        const opponentYellow = opponentStats.yellowCards ?? 0
        const opponentRed = opponentStats.redCards ?? 0
        statValue = teamYellow + teamRed + opponentYellow + opponentRed
        
        console.log("[v0] Old API structure - Match cards:", {
          matchId: match.event?.id,
          teamYellow,
          teamRed,
          opponentYellow,
          opponentRed,
          total: statValue,
        })
      }
    }

    matchValues.push(statValue)

    // Apply comparison type
    let isSuccess = false
    if (comparisonType === "over") {
      isSuccess = statValue > comparisonValue
    } else {
      isSuccess = statValue < comparisonValue
    }

    matchResults.push(isSuccess)
    console.log("[v0] Match result:", { matchId: match.event_id || match.event?.id, statValue, comparisonValue, isSuccess })

    // Update counters for different thresholds
    if (statisticType === "goals") {
      if (statValue > 0.5) goalsOver05++
      if (statValue > 1.5) goalsOver15++
      if (statValue > 2.5) goalsOver25++
      if (statValue > 3.5) goalsOver35++
    } else if (statisticType === "corners") {
      if (statValue > 4.5) cornersOver45++
      if (statValue > 6.5) cornersOver65++
      if (statValue > 8.5) cornersOver85++
      if (statValue > 10.5) cornersOver105++
    } else if (statisticType === "cards") {
      if (statValue > 1.5) cardsOver15++
      if (statValue > 2.5) cardsOver25++
      if (statValue > 3.5) cardsOver35++
      if (statValue > 4.5) cardsOver45++
    }
  }

  const totalMatches = matches.length
  const successCount = matchResults.filter((r) => r).length
  const successRate = totalMatches > 0 ? (successCount / totalMatches) * 100 : 0

  console.log("[v0] Final statistics:", { totalMatches, successCount, successRate })

  return {
    totalMatches,
    successCount,
    successRate,
    matchResults,
    matchValues,
    goalsOver05: totalMatches > 0 ? (goalsOver05 / totalMatches) * 100 : 0,
    goalsOver15: totalMatches > 0 ? (goalsOver15 / totalMatches) * 100 : 0,
    goalsOver25: totalMatches > 0 ? (goalsOver25 / totalMatches) * 100 : 0,
    goalsOver35: totalMatches > 0 ? (goalsOver35 / totalMatches) * 100 : 0,
    goalsUnder05: totalMatches > 0 ? ((totalMatches - goalsOver05) / totalMatches) * 100 : 0,
    goalsUnder15: totalMatches > 0 ? ((totalMatches - goalsOver15) / totalMatches) * 100 : 0,
    goalsUnder25: totalMatches > 0 ? ((totalMatches - goalsOver25) / totalMatches) * 100 : 0,
    goalsUnder35: totalMatches > 0 ? ((totalMatches - goalsOver35) / totalMatches) * 100 : 0,
    cornersOver45: totalMatches > 0 ? (cornersOver45 / totalMatches) * 100 : 0,
    cornersOver65: totalMatches > 0 ? (cornersOver65 / totalMatches) * 100 : 0,
    cornersOver85: totalMatches > 0 ? (cornersOver85 / totalMatches) * 100 : 0,
    cornersOver105: totalMatches > 0 ? (cornersOver105 / totalMatches) * 100 : 0,
    cornersUnder45: totalMatches > 0 ? ((totalMatches - cornersOver45) / totalMatches) * 100 : 0,
    cornersUnder65: totalMatches > 0 ? ((totalMatches - cornersOver65) / totalMatches) * 100 : 0,
    cornersUnder85: totalMatches > 0 ? ((totalMatches - cornersOver85) / totalMatches) * 100 : 0,
    cornersUnder105: totalMatches > 0 ? ((totalMatches - cornersOver105) / totalMatches) * 100 : 0,
    cardsOver15: totalMatches > 0 ? (cardsOver15 / totalMatches) * 100 : 0,
    cardsOver25: totalMatches > 0 ? (cardsOver25 / totalMatches) * 100 : 0,
    cardsOver35: totalMatches > 0 ? (cardsOver35 / totalMatches) * 100 : 0,
    cardsOver45: totalMatches > 0 ? (cardsOver45 / totalMatches) * 100 : 0,
    cardsUnder15: totalMatches > 0 ? ((totalMatches - cardsOver15) / totalMatches) * 100 : 0,
    cardsUnder25: totalMatches > 0 ? ((totalMatches - cardsOver25) / totalMatches) * 100 : 0,
    cardsUnder35: totalMatches > 0 ? ((totalMatches - cardsOver35) / totalMatches) * 100 : 0,
    cardsUnder45: totalMatches > 0 ? ((totalMatches - cardsOver45) / totalMatches) * 100 : 0,
  }
}

export interface ComparisonMetrics {
  home: MetricValues
  away: MetricValues
  average: MetricValues
}

export interface MetricValues {
  goals: number
  corners: number
  cards: number
  crosses: number
  bigChancesCreated: number
  bigChancesMissed: number
  bigChancesScored: number
  shotsOnTarget: number
  shotsInTheBox: number
  shotsOutsideTheBox: number
  totalShots: number
  shotsOffTarget: number
  cleanSheets: number
  dispossessed: number
  errorsLeadToGoal: number
  errorsLeadToShot: number
  fouls: number
  interceptionWon: number
  tackles: number
  freeKicks: number
  goalKicks: number
  throwIns: number
  possession: number
  offsides: number
  penalties: number
  yellowCards: number
  redCards: number
}

export function calculateComparisonMetrics(
  homeMatches: PerformanceData[],
  awayMatches: PerformanceData[],
  homeTeamId: string,
  awayTeamId: string,
  statisticType: string,
  timePeriod: string,
): ComparisonMetrics {
  const homeMetrics = calculateAverageMetrics(homeMatches, homeTeamId)
  const awayMetrics = calculateAverageMetrics(awayMatches, awayTeamId)

  // Calculate total - AVG é a SOMA (o que time casa faz + o que time visitante faz)
  // Não é média, é total por jogo
  const average: MetricValues = {
    goals: homeMetrics.goals + awayMetrics.goals,  // Total de gols por jogo
    corners: homeMetrics.corners + awayMetrics.corners,  // Total de escanteios por jogo
    cards: homeMetrics.cards + awayMetrics.cards,  // Total de cartões por jogo
    crosses: homeMetrics.crosses + awayMetrics.crosses,
    bigChancesCreated: homeMetrics.bigChancesCreated + awayMetrics.bigChancesCreated,
    bigChancesMissed: homeMetrics.bigChancesMissed + awayMetrics.bigChancesMissed,
    bigChancesScored: homeMetrics.bigChancesScored + awayMetrics.bigChancesScored,
    shotsOnTarget: homeMetrics.shotsOnTarget + awayMetrics.shotsOnTarget,
    shotsInTheBox: homeMetrics.shotsInTheBox + awayMetrics.shotsInTheBox,
    shotsOutsideTheBox: homeMetrics.shotsOutsideTheBox + awayMetrics.shotsOutsideTheBox,
    totalShots: homeMetrics.totalShots + awayMetrics.totalShots,
    shotsOffTarget: homeMetrics.shotsOffTarget + awayMetrics.shotsOffTarget,
    cleanSheets: (homeMetrics.cleanSheets + awayMetrics.cleanSheets) / 2,
    dispossessed: homeMetrics.dispossessed + awayMetrics.dispossessed,
    errorsLeadToGoal: (homeMetrics.errorsLeadToGoal + awayMetrics.errorsLeadToGoal) / 2,
    errorsLeadToShot: (homeMetrics.errorsLeadToShot + awayMetrics.errorsLeadToShot) / 2,
    fouls: homeMetrics.fouls + awayMetrics.fouls,
    interceptionWon: homeMetrics.interceptionWon + awayMetrics.interceptionWon,
    tackles: homeMetrics.tackles + awayMetrics.tackles,
    freeKicks: homeMetrics.freeKicks + awayMetrics.freeKicks,
    goalKicks: homeMetrics.goalKicks + awayMetrics.goalKicks,
    throwIns: homeMetrics.throwIns + awayMetrics.throwIns,
    possession: (homeMetrics.possession + awayMetrics.possession) / 2,
    offsides: homeMetrics.offsides + awayMetrics.offsides,
    penalties: homeMetrics.penalties + awayMetrics.penalties,
    yellowCards: homeMetrics.yellowCards + awayMetrics.yellowCards,
    redCards: homeMetrics.redCards + awayMetrics.redCards,
  }

  return {
    home: homeMetrics,
    away: awayMetrics,
    average,
  }
}

// Helper function to calculate average metrics from matches
function calculateAverageMetrics(matches: PerformanceData[], teamId: string): MetricValues {
  if (matches.length === 0) {
    return {
      goals: 0,
      corners: 0,
      cards: 0,
      crosses: 0,
      bigChancesCreated: 0,
      bigChancesMissed: 0,
      bigChancesScored: 0,
      shotsOnTarget: 0,
      shotsInTheBox: 0,
      shotsOutsideTheBox: 0,
      totalShots: 0,
      shotsOffTarget: 0,
      cleanSheets: 0,
      dispossessed: 0,
      errorsLeadToGoal: 0,
      errorsLeadToShot: 0,
      fouls: 0,
      interceptionWon: 0,
      tackles: 0,
      freeKicks: 0,
      goalKicks: 0,
      throwIns: 0,
      possession: 0,
      offsides: 0,
      penalties: 0,
      yellowCards: 0,
      redCards: 0,
    }
  }

  const teamIdNum = Number.parseInt(teamId)
  let totalGoals = 0
  let totalCorners = 0
  let totalCards = 0
  let totalShotsOnTarget = 0
  let totalShotsInTheBox = 0
  let totalShotsOutsideBox = 0
  let totalShots = 0
  let totalShotsOffTarget = 0
  let totalFouls = 0
  let totalPenalties = 0
  let totalYellowCards = 0
  let totalRedCards = 0

  for (const match of matches) {
    // Check if using new API structure (event-statistics)
    const isHome = match.home_team_id ? match.home_team_id === teamIdNum : match.homeTeam?.id === teamIdNum

    // Get goals - apenas do time analisado (FOR)
    let teamGoals = 0
    if (match.home_score !== undefined && match.away_score !== undefined) {
      // New API structure - use home_score/away_score
      teamGoals = isHome ? (match.home_score || 0) : (match.away_score || 0)
    } else if (match.event?.score) {
      // Old API structure (/performance)
      teamGoals = isHome ? match.event.score.home : match.event.score.away
    }
    totalGoals += teamGoals

    // Get corners - APENAS DO TIME (FOR), sem somar adversário
    if (match.statistics && match.opponentStatistics) {
      // Old API /performance structure
      const teamStats = match.statistics || {}
      const teamCorners = teamStats.cornerKicks || 0
      totalCorners += teamCorners  // Apenas escanteios DO time
    }

    // Get cards - APENAS DO TIME (FOR)
    if (match.statistics && match.opponentStatistics) {
      // Old API /performance structure
      const teamStats = match.statistics || {}
      const teamYellow = teamStats.yellowCards || 0
      const teamRed = teamStats.redCards || 0
      totalCards += teamYellow + teamRed  // Apenas cartões DO time
    }

    // Get other statistics from /performance API - APENAS DO TIME
    if (match.statistics && match.opponentStatistics) {
      const teamStats = match.statistics || {}
      
      // Apenas estatísticas DO time (FOR), sem somar do adversário
      totalShotsOnTarget += teamStats.shotsOnGoal || 0
      totalShotsInTheBox += teamStats.totalShotsInsideBox || 0
      totalShotsOutsideBox += teamStats.totalShotsOutsideBox || 0
      totalShots += teamStats.totalShotsOnGoal || 0
      totalShotsOffTarget += teamStats.shotsOffGoal || 0
      totalFouls += teamStats.fouls || 0
      totalPenalties += teamStats.penalties || 0
      totalYellowCards += teamStats.yellowCards || 0
      totalRedCards += teamStats.redCards || 0
    }
  }

  const count = matches.length

  return {
    goals: totalGoals / count,
    corners: totalCorners / count,
    cards: totalCards / count,
    shotsOnTarget: totalShotsOnTarget / count,
    shotsInTheBox: totalShotsInTheBox / count,
    shotsOutsideTheBox: totalShotsOutsideBox / count,
    totalShots: totalShots / count,
    shotsOffTarget: totalShotsOffTarget / count,
    fouls: totalFouls / count,
    penalties: totalPenalties / count,
    yellowCards: totalYellowCards / count,
    redCards: totalRedCards / count,
    crosses: 8.0 + Math.random() * 4, // Mock data
    bigChancesCreated: 5.2 + Math.random() * 2,
    bigChancesMissed: 3.4 + Math.random() * 2,
    bigChancesScored: 1.8 + Math.random(),
    cleanSheets: 30.0 + Math.random() * 20,
    dispossessed: 11.0 + Math.random() * 5,
    errorsLeadToGoal: 0.5 + Math.random() * 0.5,
    errorsLeadToShot: 0.8 + Math.random() * 0.7,
    interceptionWon: 13.0 + Math.random() * 7,
    tackles: 23.0 + Math.random() * 10,
    freeKicks: 15.0 + Math.random() * 10,
    goalKicks: 16.0 + Math.random() * 8,
    throwIns: 20.0 + Math.random() * 10,
    possession: 45.0 + Math.random() * 10,
    offsides: 1.5 + Math.random() * 2,
  }
}
