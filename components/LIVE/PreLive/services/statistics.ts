
interface PerformanceData {
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

export interface DetailedStatistics {
  totalMatches: number
  successCount: number
  successRate: number
  matchResults: boolean[]
  matchValues: number[]
  goalsOver05: number
  goalsOver15: number
  goalsOver25: number
  goalsOver35: number
  goalsUnder05: number
  goalsUnder15: number
  goalsUnder25: number
  goalsUnder35: number
  cornersOver45: number
  cornersOver65: number
  cornersOver85: number
  cornersOver105: number
  cornersUnder45: number
  cornersUnder65: number
  cornersUnder85: number
  cornersUnder105: number
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
    let statValue = 0

    if (statisticType === "goals") {
      let homeScore = 0
      let awayScore = 0

      if (match.home_score !== undefined && match.away_score !== undefined) {
        homeScore = match.home_score || 0
        awayScore = match.away_score || 0
      } else if (match.event?.score) {
        homeScore = match.event.score.home || 0
        awayScore = match.event.score.away || 0
      } else {
        const teamStats = match.statistics || {}
        const opponentStats = match.opponentStatistics || {}
        homeScore = teamStats.goals ?? 0
        awayScore = opponentStats.goals ?? 0
      }
      statValue = homeScore + awayScore
    } else if (statisticType === "corners") {
      if (match.home_value !== undefined && match.away_value !== undefined) {
        const homeValue = parseFloat(match.home_value as string) || 0
        const awayValue = parseFloat(match.away_value as string) || 0
        statValue = homeValue + awayValue
      } else {
        const teamStats = match.statistics || {}
        const opponentStats = match.opponentStatistics || {}
        const teamCorners = teamStats.cornerKicks ?? teamStats.corners ?? 0
        const opponentCorners = opponentStats.cornerKicks ?? opponentStats.corners ?? 0
        statValue = teamCorners + opponentCorners
      }
    } else if (statisticType === "cards") {
      if (match.home_value !== undefined && match.away_value !== undefined) {
        const homeValue = parseFloat(match.home_value as string) || 0
        const awayValue = parseFloat(match.away_value as string) || 0
        statValue = homeValue + awayValue
      } else {
        const teamStats = match.statistics || {}
        const opponentStats = match.opponentStatistics || {}
        const teamYellow = teamStats.yellowCards ?? 0
        const teamRed = teamStats.redCards ?? 0
        const opponentYellow = opponentStats.yellowCards ?? 0
        const opponentRed = opponentStats.redCards ?? 0
        statValue = teamYellow + teamRed + opponentYellow + opponentRed
      }
    }

    matchValues.push(statValue)

    let isSuccess = false
    if (comparisonType === "over") {
      isSuccess = statValue > comparisonValue
    } else {
      isSuccess = statValue < comparisonValue
    }

    matchResults.push(isSuccess)

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
  shotsOnTarget: number
  shotsInTheBox: number
  shotsOutsideTheBox: number
  totalShots: number
  shotsOffTarget: number
  fouls: number
  penalties: number
  yellowCards: number
  redCards: number
}

export function calculateComparisonMetrics(
  homeMatches: PerformanceData[],
  awayMatches: PerformanceData[],
  homeTeamId: string,
  awayTeamId: string,
): ComparisonMetrics {
  const homeMetrics = calculateAverageMetrics(homeMatches, homeTeamId)
  const awayMetrics = calculateAverageMetrics(awayMatches, awayTeamId)

  const average: MetricValues = {
    goals: homeMetrics.goals + awayMetrics.goals,
    corners: homeMetrics.corners + awayMetrics.corners,
    cards: homeMetrics.cards + awayMetrics.cards,
    shotsOnTarget: homeMetrics.shotsOnTarget + awayMetrics.shotsOnTarget,
    shotsInTheBox: homeMetrics.shotsInTheBox + awayMetrics.shotsInTheBox,
    shotsOutsideTheBox: homeMetrics.shotsOutsideTheBox + awayMetrics.shotsOutsideTheBox,
    totalShots: homeMetrics.totalShots + awayMetrics.totalShots,
    shotsOffTarget: homeMetrics.shotsOffTarget + awayMetrics.shotsOffTarget,
    fouls: homeMetrics.fouls + awayMetrics.fouls,
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

function calculateAverageMetrics(matches: PerformanceData[], teamId: string): MetricValues {
  if (matches.length === 0) {
    return {
      goals: 0, corners: 0, cards: 0, shotsOnTarget: 0, shotsInTheBox: 0,
      shotsOutsideTheBox: 0, totalShots: 0, shotsOffTarget: 0, fouls: 0,
      penalties: 0, yellowCards: 0, redCards: 0
    }
  }

  const teamIdNum = Number.parseInt(teamId)
  let totals = {
    goals: 0, corners: 0, cards: 0, shotsOnTarget: 0, shotsInTheBox: 0,
    shotsOutsideTheBox: 0, totalShots: 0, shotsOffTarget: 0, fouls: 0,
    penalties: 0, yellowCards: 0, redCards: 0
  }

  for (const match of matches) {
    const isHome = match.home_team_id ? match.home_team_id === teamIdNum : match.homeTeam?.id === teamIdNum
    
    // Goals
    if (match.home_score !== undefined) {
      totals.goals += isHome ? (match.home_score || 0) : (match.away_score || 0)
    } else if (match.event?.score) {
      totals.goals += isHome ? (match.event.score.home || 0) : (match.event.score.away || 0)
    }

    // StatsHub event-statistics or performance
    if (match.statistics) {
       const stats = match.statistics
       totals.corners += stats.cornerKicks || stats.corners || 0
       totals.yellowCards += stats.yellowCards || 0
       totals.redCards += stats.redCards || 0
       totals.cards += (stats.yellowCards || 0) + (stats.redCards || 0)
       totals.shotsOnTarget += stats.shotsOnGoal || 0
       totals.shotsInTheBox += stats.totalShotsInsideBox || 0
       totals.shotsOutsideTheBox += stats.totalShotsOutsideBox || 0
       totals.totalShots += stats.totalShots || stats.totalShotsOnGoal || 0
       totals.shotsOffTarget += stats.shotsOffGoal || 0
       totals.fouls += stats.fouls || 0
       totals.penalties += stats.penalties || 0
    } else if (match.home_value !== undefined) {
       // Minimal mapping for event-statistics endpoint if needed
       const val = parseFloat(match.home_value as string) || 0
       // This part is tricky because event-statistics only returns ONE statKey per call
       // But for consolidated metrics we need all of them.
       // The reference app says "always use performance API for comparison table"
    }
  }

  const count = matches.length
  return {
    goals: totals.goals / count,
    corners: totals.corners / count,
    cards: totals.cards / count,
    shotsOnTarget: totals.shotsOnTarget / count,
    shotsInTheBox: totals.shotsInTheBox / count,
    shotsOutsideTheBox: totals.shotsOutsideTheBox / count,
    totalShots: totals.totalShots / count,
    shotsOffTarget: totals.shotsOffTarget / count,
    fouls: totals.fouls / count,
    penalties: totals.penalties / count,
    yellowCards: totals.yellowCards / count,
    redCards: totals.redCards / count
  }
}
