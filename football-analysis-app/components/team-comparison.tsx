"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Check, X } from "lucide-react"
import type { DataSettings } from "@/components/match-analysis"
import type { StatisticType, TimePeriod, ComparisonType } from "@/components/statistics-filters"
import { calculateDetailedStatistics, type DetailedStatistics } from "@/lib/statistics"

interface TeamComparisonProps {
  homeTeamId: string
  awayTeamId: string
  tournamentId: string
  dataSettings: DataSettings
  statisticType: StatisticType
  timePeriod: TimePeriod
  comparisonType: ComparisonType
  comparisonValue: number
  selectedTournaments: string[]
}

interface Team {
  id: number
  name: string
  slug: string
  shortname: string
}

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
  homeTeam?: Team
  awayTeam?: Team
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

export function TeamComparison({
  homeTeamId,
  awayTeamId,
  tournamentId,
  dataSettings,
  statisticType,
  timePeriod,
  comparisonType,
  comparisonValue,
  selectedTournaments,
}: TeamComparisonProps) {
  const [homeTeam, setHomeTeam] = useState<Team | null>(null)
  const [awayTeam, setAwayTeam] = useState<Team | null>(null)
  const [homeMatches, setHomeMatches] = useState<PerformanceData[]>([])
  const [awayMatches, setAwayMatches] = useState<PerformanceData[]>([])
  const [homeStats, setHomeStats] = useState<DetailedStatistics | null>(null)
  const [awayStats, setAwayStats] = useState<DetailedStatistics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTeamData() {
      try {
        setLoading(true)

        const location =
          dataSettings.includeHome && dataSettings.includeAway ? "all" : dataSettings.includeHome ? "home" : "away"

        const eventHalfMap = {
          firstHalf: "FIRST_HALF",
          secondHalf: "SECOND_HALF",
          fullTime: "ALL",
        }
        const eventHalf = eventHalfMap[timePeriod]

        const tournamentIds = selectedTournaments.length > 0 ? selectedTournaments.join(",") : tournamentId
        const tournamentParam = dataSettings.sameCompetition ? `&tournamentId=${tournamentIds}` : ""

        const homeResponse = await fetch(
          `/api/team-matches?teamId=${homeTeamId}${tournamentParam}&limit=${dataSettings.numberOfMatches}&location=${location}&eventHalf=${eventHalf}&statisticType=${statisticType}`,
        )
        const homeData = await homeResponse.json()

        const awayResponse = await fetch(
          `/api/team-matches?teamId=${awayTeamId}${tournamentParam}&limit=${dataSettings.numberOfMatches}&location=${location}&eventHalf=${eventHalf}&statisticType=${statisticType}`,
        )
        const awayData = await awayResponse.json()

        if (homeData.data && homeData.data.length > 0) {
          const firstMatch = homeData.data[0]
          // Handle both old and new API structures
          let team
          if (firstMatch.home_team_id) {
            // New API structure
            team = firstMatch.home_team_id === Number.parseInt(homeTeamId) 
              ? { id: firstMatch.home_team_id, name: firstMatch.home_team_name, slug: firstMatch.home_team_slug, shortname: firstMatch.home_team_name }
              : { id: firstMatch.away_team_id, name: firstMatch.away_team_name, slug: firstMatch.away_team_slug, shortname: firstMatch.away_team_name }
          } else if (firstMatch.homeTeam) {
            // Old API structure
            team = firstMatch.homeTeam.id === Number.parseInt(homeTeamId) ? firstMatch.homeTeam : firstMatch.awayTeam
          }
          if (team) {
            setHomeTeam(team)
            setHomeMatches(homeData.data)
          }
        }

        if (awayData.data && awayData.data.length > 0) {
          const firstMatch = awayData.data[0]
          // Handle both old and new API structures
          let team
          if (firstMatch.home_team_id) {
            // New API structure
            team = firstMatch.home_team_id === Number.parseInt(awayTeamId)
              ? { id: firstMatch.home_team_id, name: firstMatch.home_team_name, slug: firstMatch.home_team_slug, shortname: firstMatch.home_team_name }
              : { id: firstMatch.away_team_id, name: firstMatch.away_team_name, slug: firstMatch.away_team_slug, shortname: firstMatch.away_team_name }
          } else if (firstMatch.homeTeam) {
            // Old API structure
            team = firstMatch.homeTeam.id === Number.parseInt(awayTeamId) ? firstMatch.homeTeam : firstMatch.awayTeam
          }
          if (team) {
            setAwayTeam(team)
            setAwayMatches(awayData.data)
          }
        }

        const homeTeamStats = calculateDetailedStatistics(
          homeData.data || [],
          homeTeamId,
          statisticType,
          timePeriod,
          comparisonType,
          comparisonValue,
        )
        const awayTeamStats = calculateDetailedStatistics(
          awayData.data || [],
          awayTeamId,
          statisticType,
          timePeriod,
          comparisonType,
          comparisonValue,
        )

        setHomeStats(homeTeamStats)
        setAwayStats(awayTeamStats)
      } catch (error) {
        console.error("[v0] Error fetching team data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTeamData()
  }, [
    homeTeamId,
    awayTeamId,
    tournamentId,
    dataSettings,
    statisticType,
    timePeriod,
    comparisonType,
    comparisonValue,
    selectedTournaments,
  ])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Carregando estatísticas...</div>
      </div>
    )
  }

  if (!homeTeam || !awayTeam || !homeStats || !awayStats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Não foi possível carregar os dados</div>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Home Team Card */}
      <TeamAnalysisCard
        team={homeTeam}
        stats={homeStats}
        matches={homeMatches}
        teamId={homeTeamId}
        label="Total · Todas as Partidas"
      />

      {/* Away Team Card */}
      <TeamAnalysisCard
        team={awayTeam}
        stats={awayStats}
        matches={awayMatches}
        teamId={awayTeamId}
        label="Total · Todas as Partidas"
      />
    </div>
  )
}

interface TeamAnalysisCardProps {
  team: Team
  stats: DetailedStatistics
  matches: PerformanceData[]
  teamId: string
  label: string
}

function TeamAnalysisCard({ team, stats, matches, teamId, label }: TeamAnalysisCardProps) {
  const teamIdNum = Number.parseInt(teamId)

  return (
    <Card className="bg-card border-border overflow-hidden">
      {/* Team Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <img
              src={`https://pcvvirceciavsxxfinvv.supabase.co/storage/v1/object/public/images/team/${team.id}.png`}
              alt={team.name}
              className="w-10 h-10 object-contain"
              onError={(e) => {
                e.currentTarget.src = "/diverse-professional-team.png"
              }}
            />
            <div>
              <h2 className="text-lg font-bold text-foreground">{team.name}</h2>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <button className="px-2 py-1 rounded hover:bg-muted">Total</button>
            <button className="px-2 py-1 rounded hover:bg-muted">All</button>
          </div>
        </div>
      </div>

      {/* Percentage Result */}
      <div className="p-8 text-center border-b border-border">
        <div className="text-6xl font-bold mb-2 text-amber-500">{stats.successRate.toFixed(1)}%</div>
        <div className="text-sm text-muted-foreground mb-1">Resultado</div>
        <div className="text-xs text-muted-foreground">
          {stats.successCount} / {stats.totalMatches} acertos
        </div>
      </div>

      {/* Recent Matches */}
      <div className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Partidas Recentes</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {matches.slice(0, 10).map((match, index) => {
            // Handle both old and new API structures
            const isHome = match.home_team_id ? match.home_team_id === teamIdNum : match.homeTeam?.id === teamIdNum
            
            let teamScore = 0
            let opponentScore = 0
            let opponent = null
            
            if (match.home_score !== undefined) {
              // New API structure
              teamScore = isHome ? (match.home_score || 0) : (match.away_score || 0)
              opponentScore = isHome ? (match.away_score || 0) : (match.home_score || 0)
              opponent = isHome 
                ? { id: match.away_team_id, name: match.away_team_name, slug: match.away_team_slug, shortname: match.away_team_name }
                : { id: match.home_team_id, name: match.home_team_name, slug: match.home_team_slug, shortname: match.home_team_name }
            } else if (match.event?.score) {
              // Old API structure
              teamScore = isHome ? match.event.score.home : match.event.score.away
              opponentScore = isHome ? match.event.score.away : match.event.score.home
              opponent = isHome ? match.awayTeam : match.homeTeam
            }
            
            const isSuccess = stats.matchResults[index]
            const statValue = stats.matchValues?.[index] || 0

            if (!opponent) return null
            
            return (
              <div key={match.event_id || match.event?.id} className="flex-shrink-0 w-24">
                <div
                  className={`rounded-lg border ${
                    isSuccess ? "border-green-500/50 bg-green-500/10" : "border-red-500/50 bg-red-500/10"
                  } p-3`}
                >
                  {/* Match Score Header */}
                  <div className="flex items-center justify-center gap-1 text-xs mb-2 text-muted-foreground">
                    <img
                      src={`https://pcvvirceciavsxxfinvv.supabase.co/storage/v1/object/public/images/team/${team.id}.png`}
                      alt={team.shortname}
                      className="w-3 h-3 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = "/diverse-professional-team.png"
                      }}
                    />
                    <span className="font-semibold">{teamScore}</span>
                    <span>-</span>
                    <span className="font-semibold">{opponentScore}</span>
                    <img
                      src={`https://pcvvirceciavsxxfinvv.supabase.co/storage/v1/object/public/images/team/${opponent.id}.png`}
                      alt={opponent.shortname}
                      className="w-3 h-3 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = "/diverse-professional-team.png"
                      }}
                    />
                  </div>

                  {/* Large Statistic Value */}
                  <div className="text-3xl font-bold text-center mb-2 text-foreground">{statValue}</div>

                  {/* Success/Failure Indicator */}
                  <div className="flex items-center justify-center">
                    <div
                      className={`w-full py-1.5 rounded flex items-center justify-center ${
                        isSuccess ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      {isSuccess ? <Check className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
